import { BetterSQLite3Database } from "drizzle-orm/better-sqlite3";
import { SqliteRemoteDatabase } from "drizzle-orm/sqlite-proxy";
import * as web3 from "@solana/web3.js";
import { logger } from "./logger";
import {
  AirdropError,
  AirdropErrorCode,
  AirdropErrorMessage,
} from "../utils/airdropError";
import { transaction_queue } from "../schema/transaction_queue";
import { getTableName, sql } from "drizzle-orm";
import {
  maxAddressesPerTransaction,
  SQLITE_MAX_VARIABLE_NUMBER,
} from "../config/constants";

interface CreateParams {
  db: BetterSQLite3Database | SqliteRemoteDatabase;
  signer: web3.PublicKey;
  addresses: web3.PublicKey[];
  amount: bigint;
  mintAddress: web3.PublicKey;
}

export async function create(params: CreateParams) {
  const { signer, addresses, amount, mintAddress, db } = params;

  if (!db) {
    throw new Error("Database is not loaded");
  }

  if (addresses.length === 0) {
    logger.info(AirdropErrorMessage.airdropNoAddresses);
    throw new AirdropError(
      AirdropErrorMessage.airdropNoAddresses,
      AirdropErrorCode.airdropNoAddresses
    );
  }

  // Create will overwrite any existing airdrop
  // Delete the existing airdrop queue
  // Delete the sqlite_sequence record to reset the autoincrement
  await db.delete(transaction_queue);
  await db.run(
    sql`DELETE FROM sqlite_sequence WHERE name = ${getTableName(transaction_queue)}`
  );

  const values = [];

  for (let i = 0; i < addresses.length; i += maxAddressesPerTransaction) {
    const batch = addresses
      .slice(i, i + maxAddressesPerTransaction)
      .map((a) => a.toBase58());
    values.push({
      signer: signer.toBase58(),
      mint_address: mintAddress.toBase58(),
      addresses: batch,
      amount: amount.toString(),
    });
  }

  // Insert the values in batches to avoid the SQLite max variable number limit
  for (let i = 0; i < values.length; i += SQLITE_MAX_VARIABLE_NUMBER) {
    const batch = values.slice(i, i + SQLITE_MAX_VARIABLE_NUMBER);
    await db.insert(transaction_queue).values(batch).execute();
  }

  logger.info(`Created airdrop queue for ${addresses.length} addresses`);
}
