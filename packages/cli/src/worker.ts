import * as airdropsender from "@repo/airdrop-sender";
import * as web3 from "@solana/web3.js";
import bs58 from "bs58";

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
    keypair,
    url,
  });
}

export async function poll({ url }: { url: string }) {
  await airdropsender.poll({ url });
}
