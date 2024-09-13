import * as airdropsender from "@repo/airdrop-sender";
import * as web3 from "@solana/web3.js";
import { SQLocalDrizzle } from "sqlocal/drizzle";
import { drizzle } from "drizzle-orm/sqlite-proxy";
import { databaseFile } from "@repo/airdrop-sender";
import { getKeypairFromPrivateKey } from "./utils";

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
  await airdropsender.create({
    db,
    signer: new web3.PublicKey(signer),
    addresses: addresses.map((address) => new web3.PublicKey(address)),
    amount,
    mintAddress: new web3.PublicKey(mintAddress),
  });
}

export async function send(privateKey: string, url: string) {
  const keypair = getKeypairFromPrivateKey(privateKey);

  await airdropsender.send({
    db,
    keypair,
    url,
  });
}

export async function poll(url: string) {
  await airdropsender.poll({ db, url });
}
