import * as web3 from "@solana/web3.js";
import { logger } from "./logger";
import {
  AirdropError,
  AirdropErrorCode,
  AirdropErrorMessage,
} from "../utils/airdropError";
import workerpool from "workerpool";
import { WorkerUrl } from "../utils/common";

interface CreateParams {
  signer: web3.PublicKey;
  addresses: web3.PublicKey[];
  amount: bigint;
  mintAddress: web3.PublicKey;
}

export async function create(params: CreateParams) {
  const { signer, addresses, amount, mintAddress } = params;

  if (addresses.length === 0) {
    logger.info(AirdropErrorMessage.airdropNoAddresses);
    throw new AirdropError(
      AirdropErrorMessage.airdropNoAddresses,
      AirdropErrorCode.airdropNoAddresses
    );
  }

  const createURL = await WorkerUrl(
    new URL("./workers/create.js", import.meta.url)
  );

  // create a worker pool using an external worker script
  const pool = workerpool.pool(createURL.toString(), {
    emitStdStreams: true,
    workerOpts: {
      type: "module",
    },
  });

  await pool.exec("create", [
    signer.toBase58(),
    addresses.map((a) => a.toBase58()),
    amount,
    mintAddress.toBase58(),
  ]);

  pool.terminate();

  logger.info(`Created airdrop queue for ${addresses.length} addresses`);
}
