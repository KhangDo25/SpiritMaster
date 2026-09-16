import crypto from 'crypto';
import { ValkeyService } from './valkey.service';

const SESSION_TTL_SECONDS = 24 * 60 * 60;
const PREFIX = 'auth:session:';
const DENY_PREFIX = 'auth:denylist:';

function sid(): string {
  return crypto.randomBytes(32).toString('hex');
}

export interface AuthSession {
  sid: string;
  userId: string;
  username: string;
  createdAt: string;
}

export async function createAuthSession(userId: string, username: string): Promise<AuthSession> {
  const session: AuthSession = {
    sid: sid(), userId, username, createdAt: new Date().toISOString(),
  };
  await ValkeyService.setJson(PREFIX + session.sid, session, SESSION_TTL_SECONDS);
  return session;
}

export async function getAuthSession(sessionId: string): Promise<AuthSession | null> {
  if (!sessionId) return null;
  const denied = await ValkeyService.getJson<{ revoked: boolean }>(DENY_PREFIX + sessionId);
  if (denied?.revoked) return null;
  return ValkeyService.getJson<AuthSession>(PREFIX + sessionId);
}

export async function destroyAuthSession(sessionId: string): Promise<void> {
  if (!sessionId) return;
  await ValkeyService.del(PREFIX + sessionId);
  await ValkeyService.setJson(DENY_PREFIX + sessionId, { revoked: true }, SESSION_TTL_SECONDS);
}

export function authSessionTtl(): number {
  return SESSION_TTL_SECONDS;
}
