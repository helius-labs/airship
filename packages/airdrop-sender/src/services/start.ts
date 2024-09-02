import * as web3 from "@solana/web3.js";
import workerpool from "workerpool";
import { fileURLToPath } from "url";

// create a worker pool using an external worker script
const sendingPool = workerpool.pool(
  fileURLToPath(import.meta.resolve("./workers/sending.js")),
  { emitStdStreams: true }
);

// create a worker pool using an external worker script
const pollingPool = workerpool.pool(
  fileURLToPath(import.meta.resolve("./workers/polling.js")),
  { emitStdStreams: true }
);

interface SendParams {
  keypair: web3.Keypair;
  url: string;
}

export async function start(params: SendParams) {
  const { keypair, url } = params;

  // Start sending pool
  sendingPool
    .exec("sending", [keypair.secretKey, url], {
      // on: function (payload) {
      //   if (payload.stdout) {
      //     console.log(payload.stdout.trim()); // outputs 'captured stdout: stdout message'
      //   }
      //   if (payload.stderr) {
      //     console.log(payload.stderr.trim()); // outputs 'captured stderr: stderr message'
      //   }
      // },
    })
    .catch(function (err) {
      console.error(err);
    })
    .then(function () {
      sendingPool.terminate(); // terminate all workers when done
    });

  // Start polling pool
  pollingPool
    .exec("polling", [url], {
      // on: function (payload) {
      //   if (payload.stdout) {
      //     console.log(payload.stdout.trim()); // outputs 'captured stdout: stdout message'
      //   }
      //   if (payload.stderr) {
      //     console.log(payload.stderr.trim()); // outputs 'captured stderr: stderr message'
      //   }
      // },
    })
    .catch(function (err) {
      console.error(err);
    })
    .then(function () {
      pollingPool.terminate(); // terminate all workers when done
    });
}
