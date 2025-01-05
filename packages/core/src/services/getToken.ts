import { TOKEN_PROGRAM_ID, TOKEN_2022_PROGRAM_ID } from "@solana/spl-token";
import * as web3 from "@solana/web3.js";

interface GetTokenParams {
  mintAddress: web3.PublicKey;
  url: string;
}

export interface Token {
  pubkey: web3.PublicKey;
  name?: string;
  symbol?: string;
  logoURI?: string;
  amount: number;
  decimals: number;
  mintAddress: web3.PublicKey;
  tokenType: "SPL" | "Token-2022";
}

export async function getToken(
  params: GetTokenParams
): Promise<Token | null> {
  const { mintAddress, url } = params;

  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      jsonrpc: "2.0",
      id: "helius-airdrop-core",
      method: "getAsset",
      params: {
        id: mintAddress.toBase58(),
      },
    }),
  });

  const data = await response.json();
  
  if (!data.result) {
    return null;
  }

  const item = data.result;
  
  if (
    item.interface === "FungibleToken" &&
    (item.token_info?.token_program === TOKEN_PROGRAM_ID.toBase58() ||
      item.token_info?.token_program === TOKEN_2022_PROGRAM_ID.toBase58())
  ) {
    return {
      pubkey: new web3.PublicKey(item.token_info?.associated_token_address || item.id),
      name: item.content?.metadata?.name,
      symbol: item.token_info?.symbol,
      logoURI: item.content?.links?.image,
      amount: item.token_info?.balance || 0,
      decimals: item.token_info?.decimals || 0,
      mintAddress: new web3.PublicKey(item.id),
      tokenType: item.token_info?.token_program === TOKEN_PROGRAM_ID.toBase58() ? "SPL" : "Token-2022",
    };
  }

  return null;
}
