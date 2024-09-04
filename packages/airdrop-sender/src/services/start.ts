import * as web3 from "@solana/web3.js";
import workerpool from "workerpool";
import { WorkerUrl } from "../utils/common";

interface SendParams {
  keypair: web3.Keypair;
  url: string;
}

export async function start(params: SendParams) {
  const { keypair, url } = params;

  const sendingURL = await WorkerUrl(
    new URL("./workers/sending.js", import.meta.url)
  );

  const sendingPool = workerpool.pool(sendingURL, {
    emitStdStreams: true,
    workerOpts: {
      type: "module",
    },
  });

  const pollingURL = await WorkerUrl(
    new URL("./workers/polling.js", import.meta.url)
  );

  const pollingPool = workerpool.pool(pollingURL, {
    emitStdStreams: true,
    workerOpts: {
      type: "module",
    },
  });

  // Start sending pool
  sendingPool
    .exec("sending", [keypair.secretKey, url])
    .catch(function (err) {
      console.error(err);
    })
    .then(function () {
      sendingPool.terminate(); // terminate all workers when done
    });

  // Start polling pool
  pollingPool
    .exec("polling", [url])
    .catch(function (err) {
      console.error(err);
    })
    .then(function () {
      pollingPool.terminate(); // terminate all workers when done
    });
}
