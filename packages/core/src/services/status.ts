import { transaction_queue } from "../schema/transaction_queue";
import { eq, count, isNotNull, or } from "drizzle-orm";
import { CommitmentStatus } from "../config/constants";

// Using db: any instead of db: BetterSQLite3Database | SqliteRemoteDatabase because of typescript limitations
// https://github.com/drizzle-team/drizzle-orm/issues/1966#issuecomment-1981726977
interface StatusParams {
  db: any;
}

export async function status(params: StatusParams) {
  const { db } = params;

  if (!db) {
    throw new Error("Database is not loaded");
  }

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
    .where(
      or(
        eq(transaction_queue.commitment_status, CommitmentStatus.Confirmed),
        eq(transaction_queue.commitment_status, CommitmentStatus.Finalized)
      )
    );
  const finalized = totalFinalizedQueue[0].count;

  return {
    total,
    sent,
    finalized,
  };
}
