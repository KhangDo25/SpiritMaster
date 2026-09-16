import Redis from 'ioredis';

// Types for in-memory fallback
interface RoomStateEntry {
  state: any;
  expiresAt: number;
}

interface UserSessionEntry {
  data: any;
  expiresAt: number;
}

interface LeaderboardEntry {
  userId: string;
  score: number;
  metadata?: any;
}

export class ValkeyService {
  private static client: Redis | null = null;
  private static isConnected = false;
  private static connectionAttempted = false;

  // In-memory fallback structures for 100% resilience
  private static memRoomStates = new Map<string, RoomStateEntry>();
  private static memUserSessions = new Map<string, UserSessionEntry>();
  private static memLeaderboards = new Map<string, Map<string, LeaderboardEntry>>();

  static init() {
    if (this.connectionAttempted) return;
    this.connectionAttempted = true;

    const host = process.env.REDIS_HOST;
    const port = Number(process.env.REDIS_PORT) || 6379;
    const password = process.env.REDIS_PASSWORD;
    const redisUrl = process.env.VALKEY_URL || process.env.REDIS_URL;
    const forceTls = String(process.env.VALKEY_TLS || '').toLowerCase() === 'true';

    try {
      if (redisUrl) {
        const useTls = forceTls || redisUrl.startsWith('rediss://');
        this.client = new Redis(redisUrl, {
          lazyConnect: true,
          connectTimeout: 2500,
          maxRetriesPerRequest: 1,
          retryStrategy: () => null, // don't hang if offline
          ...(useTls ? { tls: { rejectUnauthorized: false } } : {}),
        });
      } else if (host) {
        const useTls = forceTls || port > 10000;
        this.client = new Redis({
          host,
          port,
          password: password || undefined,
          lazyConnect: true,
          connectTimeout: 2500,
          maxRetriesPerRequest: 1,
          retryStrategy: () => null,
          tls: useTls ? { rejectUnauthorized: false } : undefined,
        });
      } else {
        console.log('[Valkey/Redis] No REDIS_HOST configured. Using in-memory store.');
        return;
      }

      this.client.on('connect', () => {
        this.isConnected = true;
        console.log(`[Valkey/Redis] Successfully connected to ${host}:${port}`);
      });

      this.client.on('ready', () => {
        this.isConnected = true;
      });

      this.client.on('error', (err) => {
        this.isConnected = false;
        // Suppress unhandled noisy errors in sandboxed containers
        // console.warn('[Valkey/Redis] Connection notice (fallback active):', err.message);
      });

      this.client.on('close', () => {
        this.isConnected = false;
      });

      // Attempt async connection without blocking server boot
      this.client.connect().catch((_err) => {
        this.isConnected = false;
        // Quiet fallback to in-memory mode
      });
    } catch (err: any) {
      this.isConnected = false;
      console.log('[Valkey/Redis] Initialization fallback active:', err.message);
    }
  }

  // Generic JSON helpers — used by auth sessions + denylist.
  // When Aiven Valkey is unreachable, entries stay in the local mirror
  // with TTL so the current instance still enforces expiry/logout.
  private static memJson = new Map<string, { raw: string; expiresAt: number }>();

  static async setJson(key: string, value: unknown, ttlSeconds: number): Promise<void> {
    const raw = JSON.stringify(value);
    try {
      if (this.isConnected && this.client) {
        await this.client.setex(key, ttlSeconds, raw);
      }
    } catch { /* keep mirror */ }
    this.memJson.set(key, { raw, expiresAt: Date.now() + ttlSeconds * 1000 });
  }

  static async getJson<T>(key: string): Promise<T | null> {
    try {
      if (this.isConnected && this.client) {
        const data = await this.client.get(key);
        if (data) return JSON.parse(data) as T;
      }
    } catch { /* fall through to mirror */ }
    const entry = this.memJson.get(key);
    if (!entry) return null;
    if (entry.expiresAt <= Date.now()) { this.memJson.delete(key); return null; }
    try { return JSON.parse(entry.raw) as T; } catch { return null; }
  }

  static async del(key: string): Promise<void> {
    try {
      if (this.isConnected && this.client) { await this.client.del(key); }
    } catch { /* keep mirror consistent */ }
    this.memJson.delete(key);
  }

  static valkeyStatus(): { configured: boolean; connected: boolean } {
    const url = process.env.VALKEY_URL || process.env.REDIS_URL;
    return { configured: Boolean(url || process.env.REDIS_HOST), connected: this.isConnected };
  }

  static isValkeyConnected(): boolean {
    return this.isConnected;
  }

  // ==========================================
  // 1. ROOM STATE MANAGEMENT
  // ==========================================
  static async saveRoomState(roomId: string, state: any, ttlSeconds: number = 7200): Promise<void> {
    try {
      if (this.isConnected && this.client) {
        await this.client.setex(`room:${roomId}:state`, ttlSeconds, JSON.stringify(state));
      }
    } catch (_err) {
      // Fallback
    }

    // Always mirror in memory for zero-latency local access
    this.memRoomStates.set(roomId, {
      state,
      expiresAt: Date.now() + ttlSeconds * 1000,
    });
  }

  static async getRoomState(roomId: string): Promise<any | null> {
    try {
      if (this.isConnected && this.client) {
        const data = await this.client.get(`room:${roomId}:state`);
        if (data) return JSON.parse(data);
      }
    } catch (_err) {
      // Fallback
    }

    const entry = this.memRoomStates.get(roomId);
    if (entry && entry.expiresAt > Date.now()) {
      return entry.state;
    }
    this.memRoomStates.delete(roomId);
    return null;
  }

  static async deleteRoomState(roomId: string): Promise<void> {
    try {
      if (this.isConnected && this.client) {
        await this.client.del(`room:${roomId}:state`);
      }
    } catch (_err) {
      // Fallback
    }
    this.memRoomStates.delete(roomId);
  }

  // ==========================================
  // 2. RECONNECT SESSION MANAGEMENT
  // ==========================================
  static async saveUserSession(userId: string, sessionData: any, ttlSeconds: number = 300): Promise<void> {
    try {
      if (this.isConnected && this.client) {
        await this.client.setex(`user:${userId}:session`, ttlSeconds, JSON.stringify(sessionData));
      }
    } catch (_err) {
      // Fallback
    }

    this.memUserSessions.set(userId, {
      data: sessionData,
      expiresAt: Date.now() + ttlSeconds * 1000,
    });
  }

  static async getUserSession(userId: string): Promise<any | null> {
    try {
      if (this.isConnected && this.client) {
        const data = await this.client.get(`user:${userId}:session`);
        if (data) return JSON.parse(data);
      }
    } catch (_err) {
      // Fallback
    }

    const entry = this.memUserSessions.get(userId);
    if (entry && entry.expiresAt > Date.now()) {
      return entry.data;
    }
    this.memUserSessions.delete(userId);
    return null;
  }

  static async clearUserSession(userId: string): Promise<void> {
    try {
      if (this.isConnected && this.client) {
        await this.client.del(`user:${userId}:session`);
      }
    } catch (_err) {
      // Fallback
    }
    this.memUserSessions.delete(userId);
  }

  // ==========================================
  // 3. REALTIME LEADERBOARD
  // ==========================================
  static async updateLeaderboardScore(category: string, userId: string, score: number, metadata?: any): Promise<void> {
    try {
      if (this.isConnected && this.client) {
        await this.client.zadd(`lb:${category}`, score, userId);
        if (metadata) {
          await this.client.hset(`lb:${category}:meta`, userId, JSON.stringify(metadata));
        }
      }
    } catch (_err) {
      // Fallback
    }

    if (!this.memLeaderboards.has(category)) {
      this.memLeaderboards.set(category, new Map());
    }
    const catMap = this.memLeaderboards.get(category)!;
    const existing = catMap.get(userId);
    if (!existing || score > existing.score) {
      catMap.set(userId, { userId, score, metadata });
    }
  }

  static async getTopLeaderboard(category: string, limit: number = 20): Promise<Array<{ userId: string; score: number; metadata?: any }>> {
    try {
      if (this.isConnected && this.client) {
        const results = await this.client.zrevrange(`lb:${category}`, 0, limit - 1, 'WITHSCORES');
        const list: Array<{ userId: string; score: number; metadata?: any }> = [];
        for (let i = 0; i < results.length; i += 2) {
          const uId = results[i];
          const sc = parseFloat(results[i + 1]);
          const metaRaw = await this.client.hget(`lb:${category}:meta`, uId);
          list.push({
            userId: uId,
            score: sc,
            metadata: metaRaw ? JSON.parse(metaRaw) : undefined,
          });
        }
        if (list.length > 0) return list;
      }
    } catch (_err) {
      // Fallback
    }

    const catMap = this.memLeaderboards.get(category);
    if (!catMap) return [];

    return Array.from(catMap.values())
      .sort((a, b) => b.score - a.score)
      .slice(0, limit);
  }

  static async getUserRank(category: string, userId: string): Promise<number | null> {
    try {
      if (this.isConnected && this.client) {
        const rank = await this.client.zrevrank(`lb:${category}`, userId);
        if (rank !== null && rank !== undefined) {
          return rank + 1; // 1-indexed rank
        }
      }
    } catch (_err) {
      // Fallback
    }

    const catMap = this.memLeaderboards.get(category);
    if (!catMap) return null;

    const sorted = Array.from(catMap.values()).sort((a, b) => b.score - a.score);
    const index = sorted.findIndex((e) => e.userId === userId);
    return index >= 0 ? index + 1 : null;
  }
}

// Automatically initialize on import
ValkeyService.init();
