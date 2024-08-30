import * as web3 from "@solana/web3.js";
import { db } from "./db";
import { transaction_queue } from "../schema/transaction_queue";
import { ne, desc, asc, eq, and, isNotNull, count } from "drizzle-orm";
import { logger } from "./logger";
import { SendTransactionError } from "@solana/web3.js";

// https://docs.solanalabs.com/consensus/commitments
enum CommitmentStatus {
  Undefined = 0,
  Processed = 1,
  Confirmed = 2,
  Finalized = 3,
}

interface PollParams {
  url: string;
}

export async function poll(params: PollParams) {
  const { url } = params;

  // Fetch total amount of addresses to send
  const totalQueue = await db
    .select({ count: count() })
    .from(transaction_queue);
  const totalTransactionsToSend = totalQueue[0].count;

  // Fetch the airdrop queue
  const transactionQueue = await db
    .select({
      id: transaction_queue.id,
      signature: transaction_queue.signature,
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

  const connection = new web3.Connection(url);

  for (const transaction of transactionQueue) {
    try {
      const status = await connection.getSignatureStatus(
        transaction.signature!
      );

      if (!status.value) {
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

      console.log(
        `Transaction [${transaction.id}/${totalTransactionsToSend}] status: ${commitmentStatus}`
      );
      logger.info(
        `Transaction [${transaction.id}/${totalTransactionsToSend}] status: ${commitmentStatus}`
      );
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
