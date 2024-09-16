import * as drizzleBetterSqlite3 from "drizzle-orm/better-sqlite3";
import * as drizzleSqlLocal from "drizzle-orm/sqlite-proxy";

export type NodeDatabase = drizzleBetterSqlite3.BetterSQLite3Database;
export type BrowserDatabase = drizzleSqlLocal.SqliteRemoteDatabase;
