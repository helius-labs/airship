import * as drizzleBetterSqlite3 from "drizzle-orm/better-sqlite3";
import * as drizzleSqlLocal from "drizzle-orm/sqlite-proxy";
import { DB_FILE } from "../config/constants";
import { sql } from "drizzle-orm";

export type NodeDatabase = drizzleBetterSqlite3.BetterSQLite3Database;
export type BrowserDatabase = drizzleSqlLocal.SqliteRemoteDatabase;

export async function loadNodeDB(): Promise<NodeDatabase> {
  const { default: Database } = await import("better-sqlite3");

  const sqlite = new Database(DB_FILE);
  sqlite.exec("PRAGMA journal_mode = WAL;");

  return drizzleBetterSqlite3.drizzle(sqlite);
}

export async function loadBrowserDB(): Promise<BrowserDatabase> {
  // Browser environment
  const { SQLocalDrizzle } = await import("sqlocal/drizzle");

  const { driver, batchDriver } = new SQLocalDrizzle({
    databasePath: DB_FILE,
    verbose: false,
  });

  const db = drizzleSqlLocal.drizzle(driver, batchDriver);

  await db.run(sql`PRAGMA journal_mode = WAL;`);

  return db;
}

export async function getDatabaseFile(): Promise<File> {
  const { SQLocalDrizzle } = await import("sqlocal/drizzle");

  const { getDatabaseFile } = new SQLocalDrizzle({
    databasePath: DB_FILE,
  });

  return await getDatabaseFile();
}
