import { drizzle } from "drizzle-orm/better-sqlite3";
import { migrate } from "drizzle-orm/better-sqlite3/migrator";
import Database from "better-sqlite3";
import * as schema from "./schema";
import path from "path";
import fs from "fs";


export interface DatabaseStatus {
  target: 'Aiven MySQL' | 'In-Memory DB';
  host: string;
  port: number;
  database: string;
  isCloudConnected: boolean;
  status: 'CONNECTED' | 'FALLBACK_READY';
  details?: string;
}

export const dbStatus: DatabaseStatus = {
  target: process.env.MYSQL_HOST ? 'Aiven MySQL' : 'In-Memory DB',
  host: process.env.MYSQL_HOST || 'local',
  port: Number(process.env.MYSQL_PORT) || 3306,
  database: process.env.MYSQL_DATABASE || 'defaultdb',
  isCloudConnected: false,
  status: 'FALLBACK_READY',
};

// Probe Aiven MySQL connection status is owned by server/db/mysql.ts.
// This legacy probe is kept only for the /api/health `database` field
// and no longer gates authentication.
export async function probeAivenMySQL(): Promise<boolean> {
  const { checkMysqlConnection } = await import("./mysql");
  return checkMysqlConnection();
}

// Memory-backed zero-dependency database: completely removes dependency on local sqlite.db file.
// DEV_SQLITE_PATH (local dev only) can point this at a file so local progress
// survives restarts; it never participates in production authentication.
const resolveDevDatabaseUri = (): string => {
  const configured = String(process.env.DEV_SQLITE_PATH || '').trim();
  if (!configured) return ':memory:';
  const resolved = path.isAbsolute(configured) ? configured : path.join(process.cwd(), configured);
  try {
    fs.mkdirSync(path.dirname(resolved), { recursive: true });
    return resolved;
  } catch (err: any) {
    console.warn('[Database] DEV_SQLITE_PATH could not be prepared, using in-memory store:', err?.message || err);
    return ':memory:';
  }
};

const createDbConnection = () => {
  const databaseUri = resolveDevDatabaseUri();
  const memDb = new Database(databaseUri);
  const drizzleInstance = drizzle(memDb, { schema });

  try {
    const migrationsFolder = path.join(process.cwd(), "server/db/migrations");
    migrate(drizzleInstance, { migrationsFolder });
    console.log(
      `[Database] Local dev store initialized at ${databaseUri === ':memory:' ? 'in-memory (cleared on restart)' : databaseUri} and migrations applied successfully.`
    );

    // Ensure Phase 10, 12, 13 tables exist
    memDb.exec(`
      CREATE TABLE IF NOT EXISTS drawing_words (
        id text PRIMARY KEY NOT NULL,
        word text NOT NULL,
        category text NOT NULL,
        difficulty text DEFAULT 'MEDIUM' NOT NULL,
        hint text NOT NULL,
        is_active integer DEFAULT 1 NOT NULL,
        created_at integer DEFAULT (strftime('%s', 'now')) NOT NULL
      );
      CREATE TABLE IF NOT EXISTS cosmetics (
        id text PRIMARY KEY NOT NULL,
        name text NOT NULL,
        type text NOT NULL,
        rarity text NOT NULL,
        price_coins integer NOT NULL,
        asset_value text NOT NULL,
        description text NOT NULL,
        season_event_id text,
        created_at integer DEFAULT (strftime('%s', 'now')) NOT NULL
      );
      CREATE TABLE IF NOT EXISTS user_cosmetics (
        id text PRIMARY KEY NOT NULL,
        user_id text NOT NULL,
        cosmetic_id text NOT NULL,
        is_equipped integer DEFAULT 0 NOT NULL,
        acquired_at integer DEFAULT (strftime('%s', 'now')) NOT NULL
      );
      CREATE TABLE IF NOT EXISTS achievements (
        id text PRIMARY KEY NOT NULL,
        code text UNIQUE NOT NULL,
        name text NOT NULL,
        description text NOT NULL,
        category text NOT NULL,
        reward_coins integer NOT NULL,
        reward_xp integer NOT NULL,
        icon text NOT NULL
      );
      CREATE TABLE IF NOT EXISTS user_achievements (
        id text PRIMARY KEY NOT NULL,
        user_id text NOT NULL,
        achievement_code text NOT NULL,
        unlocked_at integer DEFAULT (strftime('%s', 'now')) NOT NULL
      );
      CREATE TABLE IF NOT EXISTS seasonal_events (
        id text PRIMARY KEY NOT NULL,
        code text UNIQUE NOT NULL,
        name text NOT NULL,
        theme text NOT NULL,
        description text NOT NULL,
        start_date text NOT NULL,
        end_date text NOT NULL,
        currency_name text NOT NULL,
        is_active integer DEFAULT 1 NOT NULL,
        created_at integer DEFAULT (strftime('%s', 'now')) NOT NULL
      );
      CREATE TABLE IF NOT EXISTS battle_passes (
        id text PRIMARY KEY NOT NULL,
        season_number integer UNIQUE NOT NULL,
        name text NOT NULL,
        max_tier integer DEFAULT 20 NOT NULL,
        start_date text NOT NULL,
        end_date text NOT NULL,
        price_coins integer DEFAULT 1000 NOT NULL
      );
      CREATE TABLE IF NOT EXISTS battle_pass_progress (
        id text PRIMARY KEY NOT NULL,
        user_id text NOT NULL,
        season_number integer NOT NULL,
        current_tier integer DEFAULT 1 NOT NULL,
        current_xp integer DEFAULT 0 NOT NULL,
        is_premium_purchased integer DEFAULT 0 NOT NULL,
        claimed_free_tiers text DEFAULT '[]' NOT NULL,
        claimed_premium_tiers text DEFAULT '[]' NOT NULL,
        updated_at integer DEFAULT (strftime('%s', 'now')) NOT NULL
      );
    `);
  } catch (err) {
    console.warn("[Database] Migration note:", err);
  }

  return drizzleInstance;
};

export const db = createDbConnection();

// Auto probe Aiven MySQL on import
probeAivenMySQL().catch(() => {});
