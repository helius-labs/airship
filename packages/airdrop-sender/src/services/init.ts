import * as drizzleBetterSqlite3 from "drizzle-orm/better-sqlite3";
import * as drizzleSqlLocal from "drizzle-orm/sqlite-proxy";
import { TABLE_NAME } from "../config/constants";
import { sql } from "drizzle-orm";
import { loadDB } from "./db";

async function setJournalModeWAL(
  db:
    | drizzleBetterSqlite3.BetterSQLite3Database
    | drizzleSqlLocal.SqliteRemoteDatabase
) {
  await db.run(sql`PRAGMA journal_mode = WAL;`);
}

async function createTransactionQueueTable(
  db:
    | drizzleBetterSqlite3.BetterSQLite3Database
    | drizzleSqlLocal.SqliteRemoteDatabase
) {
  await db.run(
    sql`CREATE TABLE IF NOT EXISTS ${sql.identifier(TABLE_NAME)} (
      \`id\` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
      \`signer\` text(44) NOT NULL,
      \`mint_address\` text(44) NOT NULL,
      \`addresses\` text NOT NULL,
      \`amount\` text NOT NULL,
      \`blockhash\` text(44),
      \`last_valid_block_height\` integer DEFAULT 0,
      \`serialised_transaction\` text,
      \`signature\` text(88),
      \`created_at\` integer DEFAULT (unixepoch()) NOT NULL,
      \`attempts\` integer DEFAULT 0 NOT NULL,
      \`last_attempted_at\` integer DEFAULT (unixepoch()) NOT NULL,
      \`commitment_status\` integer DEFAULT 0
  );`
  );
}
// Index creation
async function createIndexes(
  db:
    | drizzleBetterSqlite3.BetterSQLite3Database
    | drizzleSqlLocal.SqliteRemoteDatabase
) {
  await db.run(
    sql`CREATE INDEX IF NOT EXISTS \`signer\` ON ${sql.identifier(TABLE_NAME)} (\`signer\`);`
  );
  await db.run(
    sql`CREATE INDEX IF NOT EXISTS \`last_attempted_at\` ON ${sql.identifier(TABLE_NAME)} (\`last_attempted_at\`);`
  );
}

// Database initialization
function initDB(
  db:
    | drizzleBetterSqlite3.BetterSQLite3Database
    | drizzleSqlLocal.SqliteRemoteDatabase
) {
  setJournalModeWAL(db);
  createTransactionQueueTable(db);
  createIndexes(db);
}

export async function init(): Promise<boolean> {
  // Check if there already is an airdrop queue
  const db = await loadDB();

  try {
    initDB(db);
  } catch (error) {
    console.error("Failed to initialize database:", error);
    return false;
  }

  return true;
}
