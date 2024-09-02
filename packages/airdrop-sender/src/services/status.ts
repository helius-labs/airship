import { db } from "../services/db";
import { transaction_queue } from "../schema/transaction_queue";
import { eq, count, isNotNull } from "drizzle-orm";
import { CommitmentStatus } from "../config/constants";

export async function status() {
  // Fetch total amount of addresses to send
  const totalQueue = await db
    .select({ count: count() })
    .from(transaction_queue);
  const totalTransactionsToSend = totalQueue[0].count;

  // Fetch total amount of addresses sent
  const totalSentQueue = await db
    .select({ count: count() })
    .from(transaction_queue)
    .where(isNotNull(transaction_queue.signature));
  const totalTransactionsSent = totalSentQueue[0].count;

  // Fetch total amount of addresses to send
  const totalFinalizedQueue = await db
    .select({ count: count() })
    .from(transaction_queue)
    .where(eq(transaction_queue.commitment_status, CommitmentStatus.Finalized));
  const totalTransactionsFinalized = totalFinalizedQueue[0].count;

  return {
    totalTransactionsToSend,
    totalTransactionsSent,
    totalTransactionsFinalized,
  };
}