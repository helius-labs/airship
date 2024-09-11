import * as airdropsender from "@repo/airdrop-sender";
import * as web3 from "@solana/web3.js";

// Load the database
const db = await airdropsender.loadNodeDB();

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
