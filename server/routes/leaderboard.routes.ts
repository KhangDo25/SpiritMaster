import { Router, Response } from 'express';
import { requireAuth, AuthRequest } from '../middlewares/auth';
import { db } from '../db';
import { users, userProfiles, gameSessions, userSpirits } from '../db/schema';
import { eq, desc, sql, inArray } from 'drizzle-orm';
import { apiResponse } from '../utils/response';
import { ValkeyService } from '../services/valkey.service';

export const leaderboardRouter = Router();

// GET /api/leaderboard?category=OVERALL|RUNNER|COLLECTION|STREAK|ARENA
leaderboardRouter.get('/', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const category = (req.query.category as string) || 'OVERALL';

    if (category === 'ARENA') {
      const topArena = await ValkeyService.getTopLeaderboard('arena_scores', 20);
      if (topArena.length > 0) {
        const userIds = topArena.map(t => t.userId);
        const usersList = await db.select({
          userId: users.id,
          username: users.username,
          avatar: userProfiles.avatarUrl,
          coins: userProfiles.coins
        })
        .from(users)
        .leftJoin(userProfiles, eq(users.id, userProfiles.userId))
        .where(inArray(users.id, userIds));

        const userMap = new Map(usersList.map(u => [u.userId, u]));
        const merged = topArena.map(t => ({
          userId: t.userId,
          username: userMap.get(t.userId)?.username || 'Võ sĩ giấu mặt',
          score: t.score,
          coins: userMap.get(t.userId)?.coins || 0,
          avatar: userMap.get(t.userId)?.avatar
        }));

        return res.json(apiResponse(true, "Arena realtime leaderboard fetched from Valkey", merged));
      }
    }

    if (category === 'RUNNER') {
      // Top runner high scores
      const topRunners = await db.select({
        userId: users.id,
        username: users.username,
        score: sql<number>`MAX(${gameSessions.score})`.as('score'),
        coins: userProfiles.coins,
        avatar: userProfiles.avatarUrl
      })
      .from(gameSessions)
      .innerJoin(users, eq(gameSessions.userId, users.id))
      .leftJoin(userProfiles, eq(users.id, userProfiles.userId))
      .where(eq(gameSessions.status, 'COMPLETED'))
      .groupBy(users.id)
      .orderBy(desc(sql`score`))
      .limit(20);

      return res.json(apiResponse(true, "Runner leaderboard fetched", topRunners));
    }

    if (category === 'COLLECTION') {
      // Top spirit collectors
      const topCollectors = await db.select({
        userId: users.id,
        username: users.username,
        score: sql<number>`COUNT(${userSpirits.id})`.as('score'),
        coins: userProfiles.coins,
        avatar: userProfiles.avatarUrl
      })
      .from(userSpirits)
      .innerJoin(users, eq(userSpirits.userId, users.id))
      .leftJoin(userProfiles, eq(users.id, userProfiles.userId))
      .groupBy(users.id)
      .orderBy(desc(sql`score`))
      .limit(20);

      return res.json(apiResponse(true, "Collection leaderboard fetched", topCollectors));
    }

    if (category === 'STREAK') {
      // Longest streaks
      const topStreaks = await db.select({
        userId: users.id,
        username: users.username,
        score: userProfiles.longestStreak,
        coins: userProfiles.coins,
        avatar: userProfiles.avatarUrl
      })
      .from(userProfiles)
      .innerJoin(users, eq(userProfiles.userId, users.id))
      .orderBy(desc(userProfiles.longestStreak))
      .limit(20);

      return res.json(apiResponse(true, "Streak leaderboard fetched", topStreaks));
    }

    // Default: OVERALL (Coins)
    const topOverall = await db.select({
      userId: users.id,
      username: users.username,
      score: userProfiles.coins,
      coins: userProfiles.coins,
      streak: userProfiles.longestStreak,
      avatar: userProfiles.avatarUrl
    })
    .from(userProfiles)
    .innerJoin(users, eq(userProfiles.userId, users.id))
    .orderBy(desc(userProfiles.coins))
    .limit(20);

    return res.json(apiResponse(true, "Overall leaderboard fetched", topOverall));
  } catch (err: any) {
    return res.status(500).json(apiResponse(false, err.message));
  }
});
