import * as web3 from "@solana/web3.js";

interface CollectionParams {
  url: string;
  collectionAddress: web3.PublicKey;
}

export async function isNFTCollection(
  params: CollectionParams
): Promise<boolean> {
  const { url, collectionAddress } = params;

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
        id: collectionAddress.toBase58(),
        options: {
          showUnverifiedCollections: true,
        },
      },
    }),
  });

  const data = await response.json();

  if (data.result) {
    return true;
  }

  return false;
}
