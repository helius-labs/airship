import { transaction_queue } from "../schema/transaction_queue";

// Using db: any instead of db: BetterSQLite3Database | SqliteRemoteDatabase because of typescript limitations
// https://github.com/drizzle-team/drizzle-orm/issues/1966#issuecomment-1981726977
interface ExistParams {
  db: any;
}

export async function exist(params: ExistParams): Promise<boolean> {
  const { db } = params;

  if (!db) {
    throw new Error("Database is not loaded");
  }

  const existingQueue = await db
    .select({ id: transaction_queue.id })
    .from(transaction_queue)
    .limit(1);

  if (existingQueue.length > 0) {
    return true;
  }

  return false;
}
