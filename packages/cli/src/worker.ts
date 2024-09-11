import * as airdropsender from "@repo/airdrop-sender";
import * as web3 from "@solana/web3.js";
import { drizzle } from "drizzle-orm/better-sqlite3";
import Database from "better-sqlite3";
// Load the database
const sqlite = new Database(airdropsender.databaseFile);
sqlite.exec("PRAGMA journal_mode = WAL;");

const db = drizzle(sqlite);

export async function create({
  signer,
  addresses,
  amount,
  mintAddress,
}: {
  signer: string;
  addresses: string[];
  amount: bigint;
  mintAddress: string;
}) {
  await airdropsender.create({
    db,
    signer: new web3.PublicKey(signer),
    addresses: addresses.map((address) => new web3.PublicKey(address)),
    amount,
    mintAddress: new web3.PublicKey(mintAddress),
  });
}

export async function send({
  secretKey,
  url,
}: {
  secretKey: Uint8Array;
  url: string;
}) {
  const keypair = web3.Keypair.fromSecretKey(secretKey);

  await airdropsender.send({
    db,
    keypair,
    url,
  });
}

export async function poll({ url }: { url: string }) {
  await airdropsender.poll({ db, url });
}
