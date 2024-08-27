import { sql } from "drizzle-orm";
import {
  sqliteTable,
  text,
  integer,
  index,
  blob,
} from "drizzle-orm/sqlite-core";

export const transaction_queue = sqliteTable(
  "transaction_queue",
  {
    id: integer("id", { mode: "number" }).primaryKey({ autoIncrement: true }),
    signer: text("signer", { length: 44 }).notNull(),
    addresses: text("addresses", { mode: "json" })
      .notNull()
      .$type<string[]>()
      .default(sql`'[]'`),
    amount: blob("amount", { mode: "bigint" }).notNull(),
    serialised_transaction: text("serialised_transaction"),
    signature: text("signature", { length: 88 }),
    created_at: integer("created_at", { mode: "timestamp" })
      .notNull()
      .default(sql`(unixepoch())`),
    attempts: integer("attempts").notNull().default(0),
    last_attempted_at: integer("last_attempted_at", { mode: "timestamp" })
      .notNull()
      .default(sql`(unixepoch())`),
    commitment_status: integer("commitment_status").notNull().default(0),
  },
  (table) => {
    return {
      signer_index: index("signer").on(table.signer),
      last_attempted_at_index: index("last_attempted_at").on(
        table.last_attempted_at
      ),
    };
  }
);
