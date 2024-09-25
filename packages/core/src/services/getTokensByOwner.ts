import { TOKEN_PROGRAM_ID } from "@solana/spl-token";
import * as web3 from "@solana/web3.js";

interface GetTokensByOwnerParams {
  ownerAddress: web3.PublicKey;
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
}

export async function getTokensByOwner(
  params: GetTokensByOwnerParams
): Promise<Token[]> {
  const { ownerAddress, url } = params;

  const response: any = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      jsonrpc: "2.0",
      id: "helius-airdrop-core",
      method: "getAssetsByOwner",
      params: {
        ownerAddress: ownerAddress.toBase58(),
        page: 1,
        limit: 1000,
        sortBy: {
          sortBy: "created",
          sortDirection: "asc",
        },
        options: {
          showFungible: true,
          showZeroBalance: false,
          showNativeBalance: false,
        },
      },
    }),
  });

  const data = await response.json();

  const tokens: Token[] = data.result.items.flatMap((item: any) => {
    // ZK Compression currently only supports SPL Tokens
    if (
      item.interface === "FungibleToken" &&
      item.token_info?.token_program === TOKEN_PROGRAM_ID.toBase58() &&
      item.token_info?.associated_token_address
    ) {
      return {
        pubkey: new web3.PublicKey(item.token_info?.associated_token_address),
        name: item.content?.metadata?.name,
        symbol: item.token_info?.symbol,
        logoURI: item.content?.links?.image,
        amount: item.token_info?.balance || 0,
        decimals: item.token_info?.decimals || 0,
        mintAddress: new web3.PublicKey(item.id),
      };
    }
    return [];
  });

  return tokens;
}
