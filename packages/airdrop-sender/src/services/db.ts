import { BetterSQLite3Database, drizzle } from "drizzle-orm/better-sqlite3";
import Database from "better-sqlite3";
import { sql } from "drizzle-orm";

// Constants
const DB_FILE = "airdrop.db";
const TABLE_NAME = "transaction_queue";

// Database initialization
function createDatabase(): BetterSQLite3Database<Record<string, never>> {
  const sqlite = new Database(DB_FILE);
  sqlite.pragma("journal_mode = WAL");
  return drizzle(sqlite);
}

function createTransactionQueueTable(
  db: BetterSQLite3Database<Record<string, never>>
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
function createIndexes(db: BetterSQLite3Database<Record<string, never>>) {
  db.run(
    sql`CREATE INDEX IF NOT EXISTS \`signer\` ON ${sql.identifier(TABLE_NAME)} (\`signer\`);`
  );
  db.run(
    sql`CREATE INDEX IF NOT EXISTS \`last_attempted_at\` ON ${sql.identifier(TABLE_NAME)} (\`last_attempted_at\`);`
  );
}

// Database initialization
function initDB(db: BetterSQLite3Database<Record<string, never>>) {
  createTransactionQueueTable(db);
  createIndexes(db);
}

// Export the initialized database
export const db = createDatabase();
initDB(db);
