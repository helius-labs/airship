import * as drizzleBetterSqlite3 from "drizzle-orm/better-sqlite3";
import * as drizzleSqlLocal from "drizzle-orm/sqlite-proxy";
import { DB_FILE } from "../config/constants";
import { isNode } from "../utils/common";

async function loadServerDB(): Promise<drizzleBetterSqlite3.BetterSQLite3Database> {
  const { default: Database } = await import("better-sqlite3");

  const sqlite = new Database(DB_FILE); // You can pass the file path as an argument
  return drizzleBetterSqlite3.drizzle(sqlite);
}

async function loadBrowserDB(): Promise<drizzleSqlLocal.SqliteRemoteDatabase> {
  // Browser environment
  const { SQLocalDrizzle } = await import("sqlocal/drizzle");
  const { driver, batchDriver } = new SQLocalDrizzle({
    databasePath: DB_FILE,
    verbose: false,
  });

  return drizzleSqlLocal.drizzle(driver, batchDriver);
}

export async function loadDB(): Promise<any> {
  if (typeof process !== "undefined" && isNode(process)) {
    return loadServerDB();
  } else {
    return loadBrowserDB();
  }
}
