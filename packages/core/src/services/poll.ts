import * as web3 from "@solana/web3.js";
import { transaction_queue } from "../schema/transaction_queue";
import { asc, eq, ne, and, count, isNotNull, or } from "drizzle-orm";
import { logger } from "./logger";
import { SendTransactionError } from "@solana/web3.js";
import { CommitmentStatus } from "../config/constants";
import { sleep } from "../utils/common";

// Using db: any instead of db: BetterSQLite3Database | SqliteRemoteDatabase because of typescript limitations
// https://github.com/drizzle-team/drizzle-orm/issues/1966#issuecomment-1981726977
interface PollParams {
  db: any;
  url: string;
}

export async function poll(params: PollParams) {
  const { url, db } = params;

  if (!db) {
    throw new Error("Database is not loaded");
  }

  const connection = new web3.Connection(url, "confirmed");

  // Fetch total amount of addresses to send
  const totalQueue = await db
    .select({ count: count() })
    .from(transaction_queue);
  const totalTransactionsToSend = totalQueue[0].count;

  while (true) {
    // Fetch total amount of finalized transactions
    const totalFinalizedQueue = await db
      .select({ count: count() })
      .from(transaction_queue)
      .where(
        or(
          eq(transaction_queue.commitment_status, CommitmentStatus.Confirmed),
          eq(transaction_queue.commitment_status, CommitmentStatus.Finalized)
        )
      );
    const totalTransactionsFinalized = totalFinalizedQueue[0].count;

    if (totalTransactionsFinalized === totalTransactionsToSend) {
      break;
    }

    // Fetch a batch of 100 transactions
    const transactionBatch = await db
      .select({
        id: transaction_queue.id,
        signature: transaction_queue.signature,
        last_valid_block_height: transaction_queue.last_valid_block_height,
        last_attempted_at: transaction_queue.last_attempted_at,
      })
      .from(transaction_queue)
      .where(
        and(
          isNotNull(transaction_queue.signature),
          ne(transaction_queue.commitment_status, CommitmentStatus.Confirmed),
          ne(transaction_queue.commitment_status, CommitmentStatus.Finalized)
        )
      )
      .orderBy(
        asc(transaction_queue.last_attempted_at),
        asc(transaction_queue.commitment_status)
      )
      .limit(100);

    for (const transaction of transactionBatch) {
      try {
        const status = await connection.getSignatureStatus(
          transaction.signature!,
          {
            searchTransactionHistory: true,
          }
        );

        // If signature not found check if the transaction is expired
        if (!status.value) {
          let blockheight = await connection.getBlockHeight();

          if (blockheight > transaction.last_valid_block_height) {
            // Transaction expired reset the transaction by setting the signature to null
            await db
              .update(transaction_queue)
              .set({
                signature: null,
              })
              .where(eq(transaction_queue.id, transaction.id));
          }
          continue;
        }

        const confirmationStatus = status?.value?.confirmationStatus;

        let commitmentStatus: CommitmentStatus = CommitmentStatus.Undefined;

        switch (confirmationStatus) {
          case "finalized":
            commitmentStatus = CommitmentStatus.Finalized;
            break;
          case "confirmed":
            commitmentStatus = CommitmentStatus.Confirmed;
            break;
          case "processed":
            commitmentStatus = CommitmentStatus.Processed;
            break;
        }

        if (
          commitmentStatus === CommitmentStatus.Confirmed ||
          commitmentStatus === CommitmentStatus.Finalized
        ) {
          await db
            .update(transaction_queue)
            .set({
              commitment_status: commitmentStatus,
            })
            .where(eq(transaction_queue.id, transaction.id));

          logger.info(
            `Transaction [${transaction.id}/${totalTransactionsToSend}] confirmed: ${transaction.signature}`
          );
        }
      } catch (error) {
        if (error instanceof SendTransactionError) {
          console.error(error.message);
          logger.error(error.message);
        } else {
          console.error(error);
          logger.error(error);
        }
      }
    }

    await sleep(100);
  }
}
