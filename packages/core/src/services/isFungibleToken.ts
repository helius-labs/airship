import * as web3 from "@solana/web3.js";

interface FungibleTokenParams {
  url: string;
  tokenAddress: web3.PublicKey;
}

export async function isFungibleToken(
  params: FungibleTokenParams
): Promise<boolean> {
  const { url, tokenAddress } = params;

  const response: any = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      jsonrpc: "2.0",
      id: "helius-airdrop-core",
      method: "getAsset",
      params: {
        id: tokenAddress.toBase58(),
        options: {},
      },
    }),
  });

  const data = await response.json();

  if (data.result && data.result.interface === "FungibleToken") {
    return true;
  }

  return false;
}
