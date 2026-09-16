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

authRouter.post('/login', validate(loginSchema), async (req, res, next) => {
  try {
    const { login, password } = normalizeLogin(req.body);
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
