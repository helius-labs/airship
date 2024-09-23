import * as airdropsender from "helius-airship-core";
import { SQLocalDrizzle } from "sqlocal/drizzle";
import { drizzle } from "drizzle-orm/sqlite-proxy";
import { databaseFile } from "helius-airship-core";
import { configureDatabase, getKeypairFromPrivateKey } from "../lib/utils";

const { driver, batchDriver } = new SQLocalDrizzle({
  databasePath: databaseFile,
  verbose: false,
});

const db = drizzle(driver, batchDriver);

self.onmessage = async (e: MessageEvent<any>) => {
  const { privateKey, rpcUrl } = e.data;

  const keypair = getKeypairFromPrivateKey(privateKey);

  try {
    await configureDatabase(db);

    await airdropsender.send({
      db,
      keypair,
      url: rpcUrl,
    });
  } catch (error) {
    self.postMessage({ error: error instanceof Error ? error.message : String(error) });
  }
};
