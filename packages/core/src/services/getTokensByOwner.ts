import { TOKEN_PROGRAM_ID, TOKEN_2022_PROGRAM_ID } from "@solana/spl-token";
import * as web3 from "@solana/web3.js";
import { supportedExtensions } from "../config/constants";

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
  tokenType: "SPL" | "Token-2022";
  supported: boolean;
}

function isSupported(tokenProgramId: string, mintExtensions: any) {
  // If the token is an SPL token, it is supported
  if (tokenProgramId === TOKEN_PROGRAM_ID.toBase58()) {
    return true;
  }

  // If the token is a Token-2022 and has no extensions, it is supported
  if (tokenProgramId === TOKEN_2022_PROGRAM_ID.toBase58() && !mintExtensions) {
    return true;
  }

  // If the token is a Token-2022 and has extensions, check if all extensions are supported
  if (tokenProgramId === TOKEN_2022_PROGRAM_ID.toBase58() && mintExtensions && Object.keys(mintExtensions).length > 0) {
    return Object.keys(mintExtensions).every((key) => supportedExtensions[key as keyof typeof supportedExtensions]);
  }

  return false;
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
    if (
      item.interface === "FungibleToken" &&
      (item.token_info?.token_program === TOKEN_PROGRAM_ID.toBase58() ||
        item.token_info?.token_program === TOKEN_2022_PROGRAM_ID.toBase58()) &&
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
        tokenType: item.token_info?.token_program === TOKEN_PROGRAM_ID.toBase58() ? "SPL" : "Token-2022",
        supported: isSupported(item.token_info?.token_program, item.mint_extensions),
      };
    }
    return [];
  });

  return tokens;
}
