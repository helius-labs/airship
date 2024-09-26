import { BetterSQLite3Database } from "drizzle-orm/better-sqlite3";
import { SqliteRemoteDatabase } from "drizzle-orm/sqlite-proxy";
import { TABLE_NAME } from "../config/constants";
import { sql } from "drizzle-orm";

async function createTransactionQueueTable(
  db: BetterSQLite3Database | SqliteRemoteDatabase
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
      \`signature\` text(88),
      \`created_at\` integer DEFAULT (unixepoch()) NOT NULL,
      \`attempts\` integer DEFAULT 0 NOT NULL,
      \`last_attempted_at\` integer DEFAULT (unixepoch()) NOT NULL,
      \`commitment_status\` integer DEFAULT 0
  );`
  );
}
// Index creation
async function createIndexes(db: BetterSQLite3Database | SqliteRemoteDatabase) {
  await db.run(
    sql`CREATE INDEX IF NOT EXISTS \`signature\` ON ${sql.identifier(TABLE_NAME)} (\`signature\`);`
  );
  await db.run(
    sql`CREATE INDEX IF NOT EXISTS \`last_attempted_at\` ON ${sql.identifier(TABLE_NAME)} (\`last_attempted_at\`);`
  );
  await db.run(
    sql`CREATE INDEX IF NOT EXISTS \`commitment_status\` ON ${sql.identifier(TABLE_NAME)} (\`commitment_status\`);`
  );
}

// Database initialization
function initDB(db: BetterSQLite3Database | SqliteRemoteDatabase) {
  createTransactionQueueTable(db);
  createIndexes(db);
}

interface InitParams {
  db: BetterSQLite3Database | SqliteRemoteDatabase;
}

export async function init(params: InitParams): Promise<boolean> {
  const { db } = params;

  if (!db) {
    throw new Error("Database is not loaded");
  }

  try {
    initDB(db);
  } catch (error) {
    console.error("Failed to initialize database:", error);
    return false;
  }

  return true;
}
