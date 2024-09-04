import * as drizzleBetterSqlite3 from "drizzle-orm/better-sqlite3";
import * as drizzleSqlJs from "drizzle-orm/sql-js";
import { DB_FILE, TABLE_NAME } from "../config/constants";
import { sql } from "drizzle-orm";
import { isNode } from "../utils/common";

async function loadServerDB(): Promise<drizzleBetterSqlite3.BetterSQLite3Database> {
  const { default: Database } = await import("better-sqlite3");

  const sqlite = new Database(DB_FILE); // You can pass the file path as an argument
  sqlite.pragma("journal_mode = WAL");
  const db = drizzleBetterSqlite3.drizzle(sqlite);
  initDB(db);
  return db;
}

async function loadBrowserDB(): Promise<drizzleSqlJs.SQLJsDatabase> {
  // Browser environment
  const { default: initSqlJs } = await import("sql.js");
  const SQL = await initSqlJs({
    // Required to load the wasm binary asynchronously. Of course, you can host it wherever you want
    // You can omit locateFile completely when running in node
    locateFile: (file) => `https://sql.js.org/dist/${file}`,
  });

  const sqlite = new SQL.Database();
  const db = drizzleSqlJs.drizzle(sqlite);
  initDB(db);
  return db;
}

export async function loadDB(): Promise<any> {
  if (typeof process !== "undefined" && isNode(process)) {
    return loadServerDB();
  } else {
    return loadBrowserDB();
  }
}

function createTransactionQueueTable(
  db: drizzleBetterSqlite3.BetterSQLite3Database | drizzleSqlJs.SQLJsDatabase
) {
  db.run(sql`CREATE TABLE IF NOT EXISTS ${sql.identifier(TABLE_NAME)} (
	\`id\` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	\`signer\` text(44) NOT NULL,
	\`mint_address\` text(44) NOT NULL,
	\`addresses\` text NOT NULL,
	\`amount\` blob NOT NULL,
	\`blockhash\` text(44),
	\`last_valid_block_height\` integer DEFAULT 0,
	\`serialised_transaction\` text,
	\`signature\` text(88),
	\`created_at\` integer DEFAULT (unixepoch()) NOT NULL,
	\`attempts\` integer DEFAULT 0 NOT NULL,
	\`last_attempted_at\` integer DEFAULT (unixepoch()) NOT NULL,
	\`commitment_status\` integer DEFAULT 0
);`);
}
// Index creation
function createIndexes(
  db: drizzleBetterSqlite3.BetterSQLite3Database | drizzleSqlJs.SQLJsDatabase
) {
  db.run(
    sql`CREATE INDEX IF NOT EXISTS \`signer\` ON ${sql.identifier(TABLE_NAME)} (\`signer\`);`
  );
  db.run(
    sql`CREATE INDEX IF NOT EXISTS \`last_attempted_at\` ON ${sql.identifier(TABLE_NAME)} (\`last_attempted_at\`);`
  );
}

// Database initialization
function initDB(
  db: drizzleBetterSqlite3.BetterSQLite3Database | drizzleSqlJs.SQLJsDatabase
) {
  createTransactionQueueTable(db);
  createIndexes(db);
}
