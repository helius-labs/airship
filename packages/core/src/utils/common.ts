import * as web3 from "@solana/web3.js";

export function isSolanaAddress(address: string): boolean {
  try {
    new web3.PublicKey(address);
    return true;
  } catch (error) {
    return false;
  }
}
export function normalizeTokenAmount(
  raw: string | number,
  decimals: number
): number {
  let rawTokens: number;
  if (typeof raw === "string") rawTokens = parseInt(raw);
  else rawTokens = raw;
  return rawTokens / Math.pow(10, decimals);
}

export async function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export const isNode = function (nodeProcess: any): boolean {
  return (
    typeof nodeProcess !== "undefined" &&
    nodeProcess.versions != null &&
    nodeProcess.versions.node != null &&
    nodeProcess + "" === "[object process]"
  );
};

export async function WorkerUrl(url: URL): Promise<string> {
  if (typeof process !== "undefined" && isNode(process)) {
    const { fileURLToPath } = await import("url");
    return fileURLToPath(url);
  } else {
    return url.toString();
  }
}
