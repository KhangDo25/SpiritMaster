import { Router } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { validate } from '../middlewares/validate';
import { registerSchema, loginSchema } from '../dtos/auth.dto';
import { MysqlUserStore, LocalAuthFallback, mysqlAuthActive } from '../db/repositories/MysqlUserStore';
import { UserProfileRepository } from '../db/repositories/UserProfileRepository';
import { UserRepository } from '../db/repositories/UserRepository';
import { requireAuth, AuthRequest } from '../middlewares/auth';
import { apiResponse } from '../utils/response';
import { db } from '../db';
import { users, userSpirits } from '../db/schema';
import { eq } from 'drizzle-orm';
import { BusinessException } from '../errors/BusinessException';
import { createAuthSession, destroyAuthSession, authSessionTtl } from '../services/authSession.service';

export const authRouter = Router();

function isProduction(): boolean {
  return process.env.NODE_ENV === 'production';
}

function sessionCookieOptions() {
  return {
    httpOnly: true,
    secure: isProduction(),
    sameSite: (isProduction() ? 'none' : 'lax') as 'none' | 'lax',
    maxAge: authSessionTtl() * 1000,
    path: '/',
  };
}

function jwtSecret(): string {
  const s = process.env.JWT_SECRET || '';
  if (!s && isProduction()) throw new BusinessException('Server auth is misconfigured', 500, 'AUTH_MISCONFIGURED');
  return s || 'dev-only-insecure-secret';
}

function issueJwt(userId: string, username: string): string {
  return jwt.sign({ userId, id: userId, username }, jwtSecret(), { expiresIn: '24h' });
}

function safeUser(user: { id: string; username: string; email: string }) {
  return { id: user.id, userId: user.id, username: user.username, email: user.email };
}

function normalizeLogin(body: any): { login: string; password: string } {
  const login = String(body.login || body.username || body.email || '').trim();
  return { login, password: String(body.password || '') };
}

// ==========================================================================
// HARDCODED MOCK ACCOUNTS (QA / local test accounts)
// --------------------------------------------------------------------------
// These two accounts are validated with a plain string comparison directly in
// the /login route. They never query SQLite / MySQL and never need a seed
// script, so they keep working even with an empty database.
//   User 1: username "khang"  - email "khang@linhthuhoi.com"
//   User 2: username "thư"    - email "thu@linhthuhoi.com"
//   Accepted passwords: "08082023" or "882003"
// Set MOCK_LOGIN_ENABLED=false to disable them (recommended for production).
// ==========================================================================
export interface MockAccount {
  id: string;
  userId: string;
  username: string;
  email: string;
}

/** Plaintext passwords accepted by the mock accounts (compared directly). */
export const MOCK_PASSWORDS: readonly string[] = ['08082023', '882003'];

/** Stable in-code identities: no DB row (and no random UUID) is required. */
export const MOCK_ACCOUNTS: readonly MockAccount[] = [
  { id: 'mock-user-khang', userId: 'mock-user-khang', username: 'khang', email: 'khang@linhthuhoi.com' },
  { id: 'mock-user-thu', userId: 'mock-user-thu', username: 'thư', email: 'thu@linhthuhoi.com' },
];

function mockLoginEnabled(): boolean {
  return String(process.env.MOCK_LOGIN_ENABLED ?? 'true').toLowerCase() !== 'false';
}

/** Trims and lower-cases a login string so matching ignores case and spacing. */
function normalizeIdentity(value: unknown): string {
  return String(value ?? '').trim().toLowerCase();
}

/** Case-insensitive lookup by username OR email among the hardcoded accounts. */
export function findMockAccount(login: unknown): MockAccount | undefined {
  const key = normalizeIdentity(login);
  if (!key) return undefined;
  return MOCK_ACCOUNTS.find(
    (account) => normalizeIdentity(account.username) === key || normalizeIdentity(account.email) === key
  );
}

/** Case-insensitive lookup by the hardcoded user id (used by /api/auth/me). */
export function findMockAccountById(userId: unknown): MockAccount | undefined {
  const key = normalizeIdentity(userId);
  if (!key) return undefined;
  return MOCK_ACCOUNTS.find((account) => normalizeIdentity(account.id) === key);
}

/** Direct plaintext comparison - no hashing, no database round-trip. */
export function isMockPassword(password: unknown): boolean {
  return MOCK_PASSWORDS.includes(String(password ?? ''));
}


authRouter.post('/register', validate(registerSchema), async (req, res, next) => {
  try {
    const username = String(req.body.username || '').trim();
    const email = String(req.body.email || '').trim().toLowerCase();
    const password = String(req.body.password || '');
    const displayName = String(req.body.displayName || username).trim();

    if (mysqlAuthActive()) {
      if (await MysqlUserStore.findByUsername(username)) {
        throw new BusinessException("Username already exists", 409, "USER_EXISTS");
      }
      if (await MysqlUserStore.findByEmail(email)) {
        throw new BusinessException("Email already exists", 409, "EMAIL_EXISTS");
      }
      const userId = await MysqlUserStore.create({ username, email, password });
      await MysqlUserStore.createProfile(userId, displayName || username);
      const session = await createAuthSession(userId, username);
      const token = issueJwt(userId, username);
      res.cookie('session_id', session.sid, sessionCookieOptions());
      res.status(201).json(apiResponse(true, "Registration successful", {
        user: safeUser({ id: userId, username, email }), token,
      }));
      return;
    }

    if (isProduction()) {
      throw new BusinessException("Authentication database is not configured", 503, "DB_NOT_CONFIGURED");
    }
    const userId = await UserRepository.createUser({
      id: '', username, email, passwordHash: password,
      status: 'ACTIVE', createdAt: new Date(), updatedAt: new Date()
    } as any);
    await UserProfileRepository.createProfile(userId, displayName || username);
    const session = await createAuthSession(userId, username);
    const token = issueJwt(userId, username);
    res.cookie('session_id', session.sid, sessionCookieOptions());
    res.status(201).json(apiResponse(true, "Registration successful", {
      user: safeUser({ id: userId, username, email }), token,
    }));
  } catch (err: any) {
    if (err?.code === 'ER_DUP_ENTRY') {
      const msg = String(err?.sqlMessage || '');
      next(new BusinessException(
        msg.includes('email') ? 'Email already exists' : 'Username already exists',
        409, msg.includes('email') ? 'EMAIL_EXISTS' : 'USER_EXISTS'));
      return;
    }
    next(err);
  }
});

authRouter.post('/login', async (req, res, next) => {
  try {
    const { login, password } = normalizeLogin(req.body || {});

    // ======================================================================
    // 1) HARDCODED MOCK ACCOUNTS - matched by username OR email (case
    //    insensitive) and validated with a plain string comparison.
    //    No SQLite query, no bcrypt, no seed script: works with an empty DB.
    // ======================================================================
    const mockAccount = mockLoginEnabled() ? findMockAccount(login) : undefined;
    if (mockAccount) {
      if (!isMockPassword(password)) {
        res.status(401).json(apiResponse(false, "Mật khẩu không đúng", null, "INVALID_CREDENTIALS"));
        return;
      }
      // Session + JWT are enough for /api/auth/me to identify this user.
      const session = await createAuthSession(mockAccount.id, mockAccount.username);
      const token = issueJwt(mockAccount.id, mockAccount.username);
      res.cookie('session_id', session.sid, sessionCookieOptions());
      res.json(apiResponse(true, "Login successful", {
        user: safeUser(mockAccount),
        token,
        isMock: true,
      }));
      return;
    }

    // ======================================================================
    // 2) Regular accounts: unchanged DB flow (SQLite dev store / Aiven MySQL).
    // ======================================================================
    const parsed = loginSchema.safeParse(req.body || {});
    if (!parsed.success) {
      res.status(400).json(apiResponse(false, "Validation failed", parsed.error.issues, "VALIDATION_ERROR"));
      return;
    }
    req.body = parsed.data;

    const generic = new BusinessException("Invalid username or password", 401, "INVALID_CREDENTIALS");

    if (mysqlAuthActive()) {
      const user = await MysqlUserStore.findByLogin(login);
      if (!user) throw generic;
      const ok = await bcrypt.compare(password, user.passwordHash);
      if (!ok) throw generic;
      if (user.status !== "ACTIVE") {
        throw new BusinessException("Account is disabled", 403, "ACCOUNT_DISABLED");
      }
      const session = await createAuthSession(user.id, user.username);
      const token = issueJwt(user.id, user.username);
      res.cookie('session_id', session.sid, sessionCookieOptions());
      res.json(apiResponse(true, "Login successful", { user: safeUser(user), token }));
      return;
    }

    if (isProduction()) {
      throw new BusinessException("Authentication database is not configured", 503, "DB_NOT_CONFIGURED");
    }
    const user = await LocalAuthFallback.findByLogin(login);
    if (!user) throw generic;
    const isMatch = await bcrypt.compare(password, user.passwordHash);
    if (!isMatch) throw generic;
    if (user.status !== "ACTIVE") {
      throw new BusinessException("Account is disabled", 403, "ACCOUNT_DISABLED");
    }
    const session = await createAuthSession(user.id, user.username);
    const token = issueJwt(user.id, user.username);
    res.cookie('session_id', session.sid, sessionCookieOptions());
    res.json(apiResponse(true, "Login successful", { user: safeUser(user), token }));
  } catch (err) {
    next(err);
  }
});

authRouter.post('/logout', async (req, res) => {
  const sidCookie: string | undefined = (req as any).cookies?.session_id;
  if (typeof sidCookie === 'string' && sidCookie) {
    await destroyAuthSession(sidCookie);
  }
  res.clearCookie('session_id', { path: '/' });
  res.clearCookie('token', { path: '/' });
  res.json(apiResponse(true, "Logout successful"));
});

authRouter.get('/me', requireAuth, async (req: AuthRequest, res, next) => {
  try {
    const userId = req.user!.userId;

    // ======================================================================
    // HARDCODED MOCK ACCOUNTS: identity comes from code, never from the DB.
    // Progression (profile + starter spirit) is still read best-effort from
    // the active store so in-game coins/spirits keep working, and a safe
    // default profile is returned (never a 404) when no row exists yet.
    // ======================================================================
    const mockAccount = mockLoginEnabled() ? findMockAccountById(userId) : undefined;
    if (mockAccount) {
      let mockProfile: any = null;
      let mockHasStarter = false;

      try {
        if (mysqlAuthActive()) {
          mockProfile = await MysqlUserStore.getProfile(userId);
          mockHasStarter = (await MysqlUserStore.countStarterSpirits(userId)) > 0;
        } else {
          mockProfile = await UserProfileRepository.getProfileByUserId(userId);
          const mockSpirits = await db.select().from(userSpirits).where(eq(userSpirits.userId, userId));
          mockHasStarter = mockSpirits.length > 0;
        }
      } catch (err) {
        console.warn('[Auth] Mock account progression lookup skipped (store unavailable):', err);
      }

      res.json(apiResponse(true, "User profile retrieved", {
        id: mockAccount.id,
        userId: mockAccount.id,
        username: mockAccount.username,
        email: mockAccount.email,
        profile: mockProfile ?? {
          displayName: mockAccount.username,
          avatarUrl: null,
          coins: 0,
          level: 1,
          stats: { matchesPlayed: 0, wins: 0, totalXPEarned: 0 },
          currentStreak: 0,
          longestStreak: 0
        },
        hasStarter: mockHasStarter,
        isMock: true
      }));
      return;
    }

    let user: { id: string; username: string; email: string } | null = null;
    let profile: any = null;
    let hasStarter = false;

    if (mysqlAuthActive()) {
      const row = await MysqlUserStore.findById(userId);
      if (!row) {
        throw new BusinessException("User not found", 404, "NOT_FOUND");
      }
      user = { id: row.id, username: row.username, email: row.email };
      profile = await MysqlUserStore.getProfile(userId);
      hasStarter = (await MysqlUserStore.countStarterSpirits(userId)) > 0;
    } else {
      profile = await UserProfileRepository.getProfileByUserId(userId);
      const row = await db.query.users.findFirst({ where: eq(users.id, userId) });
      if (!row) {
        throw new BusinessException("User not found", 404, "NOT_FOUND");
      }
      user = { id: row.id, username: row.username, email: row.email };
      const mySpirits = await db.select().from(userSpirits).where(eq(userSpirits.userId, userId));
      hasStarter = mySpirits.length > 0;
    }

    res.json(apiResponse(true, "User profile retrieved", {
      id: user.id,
      userId: user.id,
      username: user.username,
      email: user.email,
      profile,
      hasStarter
    }));
  } catch (err) {
    next(err);
  }
});
