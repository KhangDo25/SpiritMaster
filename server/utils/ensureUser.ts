import { db } from '../db';
import { users, userProfiles, spirits, userSpirits } from '../db/schema';
import { eq } from 'drizzle-orm';
import { v4 as uuidv4 } from 'uuid';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';

export async function ensureUserExists(userId: string, suggestedUsername?: string) {
  if (!userId) return null;

  try {
    // 1. Direct ID lookup
    let user = await db.query.users.findFirst({
      where: eq(users.id, userId)
    });

    if (user) {
      return user;
    }

    // 2. Lookup by username if provided
    if (suggestedUsername) {
      user = await db.query.users.findFirst({
        where: eq(users.username, suggestedUsername)
      });
      if (user) {
        return user;
      }
    }

    // 3. Create missing user (dev-only guest path; never used by /api/auth/*)
    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(crypto.randomBytes(24).toString('hex'), salt);
    const cleanUsername = suggestedUsername || `player_${userId.slice(0, 8)}`;

    await db.insert(users).values({
      id: userId,
      username: cleanUsername,
      email: `${cleanUsername}@linhthuhoi.com`,
      passwordHash,
      status: 'ACTIVE',
      createdAt: new Date(),
      updatedAt: new Date()
    }).onConflictDoNothing();

    await db.insert(userProfiles).values({
      id: uuidv4(),
      userId: userId,
      displayName: suggestedUsername || 'Đạo Sĩ Linh Thú',
      coins: 1500,
      currentStreak: 1,
      longestStreak: 1,
      stats: { level: 1, totalXp: 100, matchesPlayed: 1, wins: 0 }
    }).onConflictDoNothing();

    // Assign starter spirit
    const starter = await db.query.spirits.findFirst();
    if (starter && starter.id) {
      await db.insert(userSpirits).values({
        id: uuidv4(),
        userId: userId,
        spiritId: String(starter.id),
        level: 1,
        xp: 0,
        evolutionState: 0,
        acquiredAt: new Date()
      }).onConflictDoNothing();
    }

    user = await db.query.users.findFirst({
      where: eq(users.id, userId)
    });
    return user || null;
  } catch (err) {
    console.warn("[ensureUserExists] Handled:", err);
    try {
      const user = await db.query.users.findFirst({
        where: eq(users.id, userId)
      });
      return user || null;
    } catch {
      return null;
    }
  }
}
