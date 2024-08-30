import { db } from "../services/db";
import { transaction_queue } from "../schema/transaction_queue";
import { maxAddressesPerTransaction } from "../config/constants";
import { getTableName, sql } from "drizzle-orm";
import workerpool from "workerpool";

async function create(
  signer: string,
  addresses: string[],
  amount: bigint,
  mintAddress: string
) {
  // Create will overwrite any existing airdrop
  // Delete the existing airdrop queue
  // Delete the sqlite_sequence record to reset the autoincrement
  await db.delete(transaction_queue);
  await db.run(
    sql`DELETE FROM sqlite_sequence WHERE name = ${getTableName(transaction_queue)}`
  );

  const prepared = db
    .insert(transaction_queue)
    .values({
      signer: signer,
      mint_address: mintAddress,
      addresses: sql.placeholder("addresses"),
      amount: amount,
    })
    .prepare();

  for (let i = 0; i < addresses.length; i += maxAddressesPerTransaction) {
    const batch = addresses.slice(i, i + maxAddressesPerTransaction);
    await prepared.execute({
      addresses: batch,
    });
  }
}

// create a worker and register public functions
workerpool.worker({
  create: create,
});
