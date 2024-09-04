import { loadDB } from "./db";
import { transaction_queue } from "../schema/transaction_queue";

export async function exist(): Promise<boolean> {
  // Check if there already is an airdrop queue
  const db = await loadDB();

  const existingQueue = await db
    .select({ id: transaction_queue.id })
    .from(transaction_queue)
    .limit(1);

  if (existingQueue.length > 0) {
    return true;
  }

  return false;
}
