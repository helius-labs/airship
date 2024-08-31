import * as web3 from "@solana/web3.js";
import { db } from "../services/db";
import { transaction_queue } from "../schema/transaction_queue";
import { desc, asc, eq, ne, and, count, isNotNull } from "drizzle-orm";
import { logger } from "../services/logger";
import { SendTransactionError } from "@solana/web3.js";
import workerpool from "workerpool";

// https://docs.solanalabs.com/consensus/commitments
enum CommitmentStatus {
  Undefined = 0,
  Processed = 1,
  Confirmed = 2,
  Finalized = 3,
}

async function polling(url: string) {
  const connection = new web3.Connection(url, "confirmed");

  // Fetch total amount of addresses to send
  const totalQueue = await db
    .select({ count: count() })
    .from(transaction_queue);
  const totalTransactionsToSend = totalQueue[0].count;

  while (true) {
    // Fetch total amount of addresses to send
    const totalFinalizedQueue = await db
      .select({ count: count() })
      .from(transaction_queue)
      .where(
        eq(transaction_queue.commitment_status, CommitmentStatus.Finalized)
      );
    const totalTransactionsFinalized = totalFinalizedQueue[0].count;

    if (totalTransactionsFinalized === totalTransactionsToSend) {
      workerpool.workerEmit({
        status: "done",
      });
      break;
    }

    // Fetch the airdrop queue
    const transactionQueue = await db
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
          ne(transaction_queue.commitment_status, CommitmentStatus.Finalized)
        )
      )
      .orderBy(
        desc(transaction_queue.last_attempted_at),
        asc(transaction_queue.commitment_status)
      );

    for (const transaction of transactionQueue) {
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

        await db
          .update(transaction_queue)
          .set({
            commitment_status: commitmentStatus,
          })
          .where(eq(transaction_queue.id, transaction.id));

        if (confirmationStatus === "finalized") {
          console.log(
            `Transaction [${transaction.id}/${totalTransactionsToSend}] finalized`
          );
          logger.info(
            `Transaction [${transaction.id}/${totalTransactionsToSend}] finalized`
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
  }
}

// create a worker and register public functions
workerpool.worker({
  polling: polling,
});
