import * as web3 from "@solana/web3.js";
import { isSolanaAddress } from "../utils/common";

interface GetCollectionHoldersParams {
  collectionAddress: web3.PublicKey;
  url: string;
}

export interface TokenAccount {
  owner: web3.PublicKey;
}

export async function getCollectionHolders(
  params: GetCollectionHoldersParams
): Promise<TokenAccount[]> {
  const { collectionAddress, url } = params;

  let tokens: TokenAccount[] = [];
  let cursor;

  while (true) {
    const response: any = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        jsonrpc: "2.0",
        id: "helius-airdrop-core",
        method: "getAssetsByGroup",
        params: {
          groupKey: "collection",
          groupValue: collectionAddress.toBase58(),
          cursor: cursor,
          limit: 1000,
        },
      }),
    });

    const data = await response.json();

    if (data.result.total === 0) {
      break;
    }

    cursor = data.result.cursor;

    data.result.items.forEach((item: any) => {
      if (isSolanaAddress(item.ownership.owner)) {
        tokens.push({
          owner: new web3.PublicKey(item.ownership.owner),
        });
      }
    });
  }

  return tokens;
}
