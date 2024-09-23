import * as airdropsender from "helius-airship-core";
import * as web3 from "@solana/web3.js";
import { SQLocalDrizzle } from "sqlocal/drizzle";
import { drizzle } from "drizzle-orm/sqlite-proxy";
import { databaseFile } from "helius-airship-core";
import { configureDatabase } from "@/lib/utils";

const { driver, batchDriver } = new SQLocalDrizzle({
  databasePath: databaseFile,
  verbose: false,
});

const db = drizzle(driver, batchDriver);

export async function create(
  signer: string,
  addresses: string[],
  amount: bigint,
  mintAddress: string
) {
  await configureDatabase(db);

  await airdropsender.create({
    db,
    signer: new web3.PublicKey(signer),
    addresses: addresses.map((address) => new web3.PublicKey(address)),
    amount,
    mintAddress: new web3.PublicKey(mintAddress),
  });
}

