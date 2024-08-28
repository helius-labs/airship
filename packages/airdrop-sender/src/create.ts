import * as web3 from "@solana/web3.js";
import { logger } from "./logger";
import { db } from "./db";
import { transaction_queue } from "./schema/transaction_queue";
import { maxAddressesPerTransaction } from "./constants";
import { AirdropError, AirdropErrorCode, AirdropErrorMessage } from "./errors";
import { sql } from "drizzle-orm";

interface CreateParams {
  signer: web3.PublicKey;
  addresses: web3.PublicKey[];
  amount: bigint;
  mintAddress: web3.PublicKey;
}

export async function create(params: CreateParams) {
  const { signer, addresses, amount, mintAddress } = params;

  if (addresses.length === 0) {
    logger.info(AirdropErrorMessage.airdropNoAddresses);
    throw new AirdropError(
      AirdropErrorMessage.airdropNoAddresses,
      AirdropErrorCode.airdropNoAddresses
    );
  }

  // Create will overwrite any existing airdrop
  await db.delete(transaction_queue);

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
    const batch = addresses.slice(i, i + maxAddressesPerTransaction);
    await prepared.execute({
      addresses: batch.map((a) => a.toBase58()),
    });
  }

  logger.info(`Created airdrop queue for ${addresses.length} addresses`);
}
