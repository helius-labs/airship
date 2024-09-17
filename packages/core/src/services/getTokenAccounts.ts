import * as web3 from "@solana/web3.js";
import { isSolanaAddress } from "../utils/common";

interface GetTokenAccountsParams {
  url: string;
  tokenMintAddress: web3.PublicKey;
}

export interface TokenAccount {
  owner: web3.PublicKey;
}

export async function getTokenAccounts(
  params: GetTokenAccountsParams
): Promise<TokenAccount[]> {
  const { url, tokenMintAddress } = params;

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
        method: "getTokenAccounts",
        params: {
          mint: tokenMintAddress,
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

    data.result.token_accounts.forEach((item: any) => {
      if (isSolanaAddress(item.owner)) {
        tokens.push({
          owner: new web3.PublicKey(item.owner),
        });
      }
    });
  }

  return tokens;
}
