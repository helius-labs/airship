import { Keypair, Connection, PublicKey } from "@solana/web3.js";
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import bs58 from "bs58";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function isValidPrivateKey(key: string): boolean {
  try {
    Keypair.fromSecretKey(bs58.decode(key));
    return true;
  } catch {
    return false;
  }
}

export function isValidAddress(address: string): boolean {
  try {
    new PublicKey(address);
    return true;
  } catch {
    return false;
  }
}

export async function isValidRpcUrl(url: string): Promise<boolean> {
  try {
    new URL(url);

    const connection = new Connection(url);
    const blockHeight = await connection.getBlockHeight();

    console.log("blockHeight", blockHeight);

    if (blockHeight === 0) {
      return false;
    }

    return true;
  } catch {
    return false;
  }
}
