import * as web3 from "@solana/web3.js";

export function isSolanaAddress(address: string): boolean {
  try {
    new web3.PublicKey(address);
    return true;
  } catch (error) {
    return false;
  }
}
