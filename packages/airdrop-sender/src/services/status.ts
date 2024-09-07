import { loadDB } from "../services/db";
import { transaction_queue } from "../schema/transaction_queue";
import { eq, count, isNotNull } from "drizzle-orm";
import { CommitmentStatus } from "../config/constants";

export async function status() {
  const db = await loadDB();

  // Fetch total amount of addresses to send
  const totalQueue = await db
    .select({ count: count() })
    .from(transaction_queue);
  const total = totalQueue[0].count;

  // Fetch total amount of addresses sent
  const totalSentQueue = await db
    .select({ count: count() })
    .from(transaction_queue)
    .where(isNotNull(transaction_queue.signature));
  const sent = totalSentQueue[0].count;

  // Fetch total amount of addresses to send
  const totalFinalizedQueue = await db
    .select({ count: count() })
    .from(transaction_queue)
    .where(eq(transaction_queue.commitment_status, CommitmentStatus.Finalized));
  const finalized = totalFinalizedQueue[0].count;

  return {
    total,
    sent,
    finalized,
  };
}
