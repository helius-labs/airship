import * as web3 from "@solana/web3.js";
import { WorkerUrl } from "../utils/common";
import { pollingService } from "./pollingService";
import { sendingService } from "./sendingService";

interface SendParams {
  keypair: web3.Keypair;
  url: string;
  worker: boolean;
}

export async function start(params: SendParams) {
  const { keypair, url, worker } = params;

  if (worker) {
    // const sendingURL = await WorkerUrl(
    //   new URL("./workers/sending.js", import.meta.url)
    // );
    // const sendingPool = workerpool.pool(sendingURL, {
    //   emitStdStreams: true,
    //   workerOpts: {
    //     type: "module",
    //   },
    // });
    // const pollingURL = await WorkerUrl(
    //   new URL("./workers/polling.js", import.meta.url)
    // );
    // const pollingPool = workerpool.pool(pollingURL, {
    //   emitStdStreams: true,
    //   workerOpts: {
    //     type: "module",
    //   },
    // });
    // // Start sending pool
    // sendingPool
    //   .exec("start", [keypair.secretKey, url])
    //   .catch(function (err) {
    //     console.error(err);
    //   })
    //   .then(function () {
    //     sendingPool.terminate(); // terminate all workers when done
    //   });
    // // Start polling pool
    // pollingPool
    //   .exec("start", [url])
    //   .catch(function (err) {
    //     console.error(err);
    //   })
    //   .then(function () {
    //     pollingPool.terminate(); // terminate all workers when done
    //   });
  } else {
    console.log("Starting sending and polling services 1 ");
    await sendingService(keypair.secretKey, url);
    console.log("Starting sending and polling services 2");
    await pollingService(url);
  }
}
