import * as airdropsender from "helius-airship-core";
import { SQLocalDrizzle } from "sqlocal/drizzle";
import { drizzle } from "drizzle-orm/sqlite-proxy";
import { databaseFile } from "helius-airship-core";
import { configureDatabase } from "@/lib/utils";

const { driver, batchDriver } = new SQLocalDrizzle({
  databasePath: databaseFile,
  verbose: false,
});

const db = drizzle(driver, batchDriver);

self.onmessage = async (e: MessageEvent<any>) => {
  const { rpcUrl } = e.data;

  try {
    await configureDatabase(db);

    await airdropsender.poll({ db, url: rpcUrl });
  } catch (error) {
    self.postMessage({ error: error instanceof Error ? error.message : String(error) });
  }
};
