import 'dotenv/config';
import mysql from 'mysql2/promise';

export interface MySqlStatus {
  configured: boolean;
  connected: boolean;
  host: string;
  port: number;
  database: string;
  tls: boolean;
  lastError?: string;
}

export const mysqlStatus: MySqlStatus = {
  configured: false,
  connected: false,
  host: 'not-configured',
  port: 3306,
  database: 'not-configured',
  tls: false,
};

function readEnv(...keys: string[]): string | undefined {
  for (const k of keys) {
    const v = process.env[k];
    if (v !== undefined && v !== null && String(v).trim() !== '') return String(v).trim();
  }
  return undefined;
}

function parseDatabaseUrl(url: string) {
  const u = new URL(url);
  const params = u.searchParams;
  const sslMode = (params.get('ssl-mode') || params.get('sslmode') || '').toUpperCase();
  return {
    host: u.hostname,
    port: Number(u.port) || 3306,
    user: decodeURIComponent(u.username),
    password: decodeURIComponent(u.password),
    database: decodeURIComponent((u.pathname.startsWith('/') ? u.pathname.slice(1) : u.pathname) || 'defaultdb'),
    wantsInsecure: sslMode === 'DISABLED' || sslMode === 'OFF' || sslMode === '0',
  };
}

function buildMysqlSsl(): any {
  const ca = readEnv('MYSQL_SSL_CA', 'DB_SSL_CA');
  if (ca) {
    let cert = ca;
    if (!cert.includes('BEGIN CERTIFICATE')) {
      try { cert = Buffer.from(cert.replace(/\s/g, ''), 'base64').toString('utf8'); } catch { /* keep */ }
    }
    return { ca: cert, minVersion: 'TLSv1.2', rejectUnauthorized: true };
  }
  return { minVersion: 'TLSv1.2', rejectUnauthorized: false };
}

export function getMysqlConfig(): mysql.PoolOptions | null {
  const databaseUrl = readEnv('DATABASE_URL');
  if (databaseUrl) {
    const parsed = parseDatabaseUrl(databaseUrl);
    if (!parsed.host || !parsed.user) return null;
    mysqlStatus.configured = true;
    mysqlStatus.host = parsed.host;
    mysqlStatus.port = parsed.port;
    mysqlStatus.database = parsed.database;
    mysqlStatus.tls = !parsed.wantsInsecure;
    const ssl: any = parsed.wantsInsecure ? undefined : buildMysqlSsl();
    return {
      host: parsed.host, port: parsed.port, user: parsed.user,
      password: parsed.password, database: parsed.database,
      waitForConnections: true, connectionLimit: 10, queueLimit: 0,
      connectTimeout: 10000, ...(ssl ? { ssl } : {}),
    };
  }
  const host = readEnv('MYSQL_HOST', 'DB_HOST');
  const user = readEnv('MYSQL_USER', 'DB_USER');
  const password = readEnv('MYSQL_PASSWORD', 'DB_PASSWORD');
  const database = readEnv('MYSQL_DATABASE', 'DB_NAME', 'MYSQL_DB') || 'defaultdb';
  const port = Number(readEnv('MYSQL_PORT', 'DB_PORT') || '3306') || 3306;
  if (!host || !user) return null;
  mysqlStatus.configured = true;
  mysqlStatus.host = host;
  mysqlStatus.port = port;
  mysqlStatus.database = database;
  mysqlStatus.tls = true;
  return {
    host, port, user, password, database,
    waitForConnections: true, connectionLimit: 10, queueLimit: 0,
    connectTimeout: 10000, ssl: buildMysqlSsl(),
  };
}

let pool: mysql.Pool | null = null;

export function getMysqlPool(): mysql.Pool | null {
  if (pool) return pool;
  const config = getMysqlConfig();
  if (!config) { mysqlStatus.configured = false; return null; }
  pool = mysql.createPool(config);
  return pool;
}

export async function checkMysqlConnection(): Promise<boolean> {
  const p = getMysqlPool();
  if (!p) {
    mysqlStatus.connected = false;
    mysqlStatus.lastError = 'MySQL env vars not configured (see .env.example)';
    return false;
  }
  try {
    const conn = await p.getConnection();
    try { await conn.ping(); } finally { conn.release(); }
    mysqlStatus.connected = true;
    mysqlStatus.lastError = undefined;
    return true;
  } catch (err: any) {
    mysqlStatus.connected = false;
    mysqlStatus.lastError = String(err?.code || err?.message || err);
    return false;
  }
}

export async function ensureMysqlAuthTables(): Promise<void> {
  const p = getMysqlPool();
  if (!p) return;
  await p.execute(
    'CREATE TABLE IF NOT EXISTS users (' +
    'id VARCHAR(36) PRIMARY KEY,' +
    'username VARCHAR(50) NOT NULL UNIQUE,' +
    'email VARCHAR(255) NOT NULL UNIQUE,' +
    'password_hash VARCHAR(255) NOT NULL,' +
    "status VARCHAR(20) NOT NULL DEFAULT 'ACTIVE'," +
    'created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,' +
    'updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP' +
    ') ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci'
  );
  await p.execute(
    'CREATE TABLE IF NOT EXISTS user_profiles (' +
    'id VARCHAR(36) PRIMARY KEY,' +
    'user_id VARCHAR(36) NOT NULL UNIQUE,' +
    'display_name VARCHAR(100) NOT NULL,' +
    'avatar_url TEXT NULL,' +
    'coins INT NOT NULL DEFAULT 0,' +
    'stats JSON NULL,' +
    'current_streak INT NOT NULL DEFAULT 0,' +
    'longest_streak INT NOT NULL DEFAULT 0,' +
    'last_activity_date VARCHAR(10) NULL,' +
    'created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,' +
    'updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,' +
    'CONSTRAINT fk_profiles_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE' +
    ') ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci'
  );
}

