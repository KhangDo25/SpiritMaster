import bcrypt from 'bcryptjs';
import { v4 as uuidv4 } from 'uuid';
import { db } from '../index';
import { users } from '../schema';
import { eq, or } from 'drizzle-orm';
import { getMysqlPool } from '../mysql';
import { BusinessException } from '../../errors/BusinessException';

export interface AuthUserRow {
  id: string;
  username: string;
  email: string;
  passwordHash: string;
  status: string;
}

function toAuthUser(row: any): AuthUserRow {
  return {
    id: String(row.id),
    username: String(row.username),
    email: String(row.email),
    passwordHash: String(row.password_hash ?? row.passwordHash),
    status: String(row.status ?? 'ACTIVE'),
  };
}

function isMysqlAuthActive(): boolean {
  return getMysqlPool() !== null;
}

export class MysqlUserStore {
  static async findByUsername(username: string): Promise<AuthUserRow | null> {
    const pool = getMysqlPool();
    if (!pool) return null;
    const [rows] = await pool.execute(
      'SELECT id, username, email, password_hash, status FROM users WHERE username = ? LIMIT 1',
      [username]
    );
    const list = rows as any[];
    return list.length ? toAuthUser(list[0]) : null;
  }

  static async findByEmail(email: string): Promise<AuthUserRow | null> {
    const pool = getMysqlPool();
    if (!pool) return null;
    const [rows] = await pool.execute(
      'SELECT id, username, email, password_hash, status FROM users WHERE email = ? LIMIT 1',
      [email]
    );
    const list = rows as any[];
    return list.length ? toAuthUser(list[0]) : null;
  }

  static async findByLogin(login: string): Promise<AuthUserRow | null> {
    const pool = getMysqlPool();
    if (!pool) return null;
    const [rows] = await pool.execute(
      'SELECT id, username, email, password_hash, status FROM users WHERE username = ? OR email = ? LIMIT 1',
      [login, login]
    );
    const list = rows as any[];
    return list.length ? toAuthUser(list[0]) : null;
  }

  static async findById(id: string): Promise<AuthUserRow | null> {
    const pool = getMysqlPool();
    if (!pool) return null;
    const [rows] = await pool.execute(
      'SELECT id, username, email, password_hash, status FROM users WHERE id = ? LIMIT 1',
      [id]
    );
    const list = rows as any[];
    return list.length ? toAuthUser(list[0]) : null;
  }

  static async create(input: { username: string; email: string; password: string }): Promise<string> {
    const pool = getMysqlPool();
    if (!pool) throw new BusinessException('Authentication database is not configured', 503, 'DB_NOT_CONFIGURED');
    const id = uuidv4();
    const passwordHash = await bcrypt.hash(input.password, 12);
    try {
      await pool.execute(
        "INSERT INTO users (id, username, email, password_hash, status) VALUES (?, ?, ?, ?, 'ACTIVE')",
        [id, input.username, input.email, passwordHash]
      );
    } catch (err: any) {
      if (err?.code === 'ER_DUP_ENTRY') {
        const msg = String(err?.sqlMessage || '');
        if (msg.includes('email')) throw new BusinessException('Email already exists', 409, 'EMAIL_EXISTS');
        throw new BusinessException('Username already exists', 409, 'USER_EXISTS');
      }
      throw err;
    }
    return id;
  }

  static async getProfile(userId: string): Promise<any | null> {
    const pool = getMysqlPool();
    if (!pool) return null;
    const [rows] = await pool.execute('SELECT * FROM user_profiles WHERE user_id = ? LIMIT 1', [userId]);
    return (rows as any[])[0] ?? null;
  }

  static async createProfile(userId: string, displayName: string): Promise<void> {
    const pool = getMysqlPool();
    if (!pool) return;
    await pool.execute(
      'INSERT INTO user_profiles (id, user_id, display_name, coins) VALUES (?, ?, ?, 0) ON DUPLICATE KEY UPDATE display_name = display_name',
      [uuidv4(), userId, displayName]
    );
  }

  static async countStarterSpirits(userId: string): Promise<number> {
    const pool = getMysqlPool();
    if (!pool) return 0;
    try {
      const [rows] = await pool.execute('SELECT COUNT(*) AS c FROM user_spirits WHERE user_id = ?', [userId]);
      return Number((rows as any[])[0]?.c || 0);
    } catch { return 0; }
  }
}

export class LocalAuthFallback {
  static async findByUsername(username: string) {
    return db.query.users.findFirst({ where: eq(users.username, username) });
  }
  static async findByEmail(email: string) {
    return db.query.users.findFirst({ where: eq(users.email, email) });
  }
  static async findByLogin(login: string) {
    return db.query.users.findFirst({
      where: or(eq(users.username, login), eq(users.email, login)),
    });
  }
  static async findById(id: string) {
    return db.query.users.findFirst({ where: eq(users.id, id) });
  }
}

export function mysqlAuthActive(): boolean {
  return isMysqlAuthActive();
}
