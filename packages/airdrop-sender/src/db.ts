import { BetterSQLite3Database, drizzle } from "drizzle-orm/better-sqlite3";
import Database from "better-sqlite3";
import { sql } from "drizzle-orm";
import { transaction_queue } from "./schema/transaction_queue";

const sqlite = new Database("airdrop.db");
export const db = drizzle(sqlite);

initDB(db);

function initDB(db: BetterSQLite3Database<Record<string, never>>) {
  db.run(sql`CREATE TABLE IF NOT EXISTS \`transaction_queue\` (
	\`id\` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	\`signer\` text(44) NOT NULL,
	\`addresses\` text NOT NULL,
	\`amount\` blob NOT NULL,
	\`serialised_transaction\` text,
	\`signature\` text(88),
	\`created_at\` integer DEFAULT (unixepoch()) NOT NULL,
	\`attempts\` integer DEFAULT 0 NOT NULL,
	\`last_attempted_at\` integer DEFAULT (unixepoch()) NOT NULL,
	\`confirmation_status\` integer DEFAULT 0
);`);
  db.run(
    sql`CREATE INDEX IF NOT EXISTS \`signer\` ON \`transaction_queue\` (\`signer\`);`
  );
  db.run(
    sql`CREATE INDEX IF NOT EXISTS \`last_attempted_at\` ON \`transaction_queue\` (\`last_attempted_at\`);`
  );
}
