import * as web3 from "@solana/web3.js";
import { logger } from "./logger";
import {
  AirdropError,
  AirdropErrorCode,
  AirdropErrorMessage,
} from "../utils/airdropError";
import workerpool from "workerpool";
import { WorkerUrl } from "../utils/common";
import { sql, getTableName } from "drizzle-orm";
import { maxAddressesPerTransaction } from "../config/constants";
import { transaction_queue } from "../schema/transaction_queue";
import { loadDB } from "./db";

interface CreateParams {
  signer: web3.PublicKey;
  addresses: web3.PublicKey[];
  amount: bigint;
  mintAddress: web3.PublicKey;
  worker: boolean;
}

export async function create(params: CreateParams) {
  const { signer, addresses, amount, mintAddress, worker } = params;

  if (addresses.length === 0) {
    logger.info(AirdropErrorMessage.airdropNoAddresses);
    throw new AirdropError(
      AirdropErrorMessage.airdropNoAddresses,
      AirdropErrorCode.airdropNoAddresses
    );
  }

  if (worker) {
    const createURL = await WorkerUrl(
      new URL("./workers/create.js", import.meta.url)
    );

    // create a worker pool using an external worker script
    const pool = workerpool.pool(createURL.toString());

    await pool.exec("create", [
      signer.toBase58(),
      addresses.map((a) => a.toBase58()),
      amount,
      mintAddress.toBase58(),
    ]);

    pool.terminate();
  } else {
    const db = await loadDB();
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
        signer: signer.toBase58(),
        mint_address: mintAddress.toBase58(),
        addresses: sql.placeholder("addresses"),
        amount: amount,
      })
      .prepare();

    for (let i = 0; i < addresses.length; i += maxAddressesPerTransaction) {
      const batch = addresses
        .slice(i, i + maxAddressesPerTransaction)
        .map((a) => a.toBase58());
      await prepared.execute({
        addresses: batch,
      });
    }
  }

  logger.info(`Created airdrop queue for ${addresses.length} addresses`);
}
