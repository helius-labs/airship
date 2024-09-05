import { loadDB } from "../services/db";
import { transaction_queue } from "../schema/transaction_queue";
import { maxAddressesPerTransaction } from "../config/constants";
import { getTableName, sql } from "drizzle-orm";

addEventListener("message", async (e) => {
  const db = await loadDB();
  // Create will overwrite any existing airdrop
  // Delete the existing airdrop queue
  // Delete the sqlite_sequence record to reset the autoincrement
  await db.delete(transaction_queue);
  await db.run(
    sql`DELETE FROM sqlite_sequence WHERE name = ${getTableName(transaction_queue)}`
  );

  postMessage("done!" + maxAddressesPerTransaction);
});
