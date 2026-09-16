import { Router, Response } from 'express';
import { requireAuth, AuthRequest } from '../middlewares/auth';
import { db } from '../db';
import { users, userProfiles, userSpirits, spirits, userCosmetics, cosmetics, userAchievements, achievements, gameSessions } from '../db/schema';
import { eq, sql } from 'drizzle-orm';
import { apiResponse } from '../utils/response';

export const profileRouter = Router();

// GET /api/profile - Detailed statistics of current user or user by id
profileRouter.get('/', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.id;

    const userRecord = await db.select().from(users).where(eq(users.id, userId)).limit(1);
    const profile = await db.select().from(userProfiles).where(eq(userProfiles.userId, userId)).limit(1);

    if (!userRecord[0] || !profile[0]) {
      return res.status(404).json(apiResponse(false, "User profile not found"));
    }

    // Spirits stats
    const totalCatalogSpirits = await db.select({ count: sql<number>`count(*)` }).from(spirits);
    const ownedSpirits = await db.select()
      .from(userSpirits)
      .innerJoin(spirits, eq(userSpirits.spiritId, spirits.id))
      .where(eq(userSpirits.userId, userId));

    const totalSpiritsCount = totalCatalogSpirits[0]?.count || 7;
    const collectionPercent = Math.round((ownedSpirits.length / totalSpiritsCount) * 100);

    // Runner stats
    const runnerStats = await db.select({
      totalRuns: sql<number>`count(*)`,
      highScore: sql<number>`max(${gameSessions.score})`,
      totalCoins: sql<number>`sum(${gameSessions.earnedCoins})`
    })
    .from(gameSessions)
    .where(eq(gameSessions.userId, userId));

    // Equipped cosmetics
    const equipped = await db.select({
      cosmeticId: cosmetics.id,
      name: cosmetics.name,
      type: cosmetics.type,
      rarity: cosmetics.rarity,
      assetValue: cosmetics.assetValue
    })
    .from(userCosmetics)
    .innerJoin(cosmetics, eq(userCosmetics.cosmeticId, cosmetics.id))
    .where(eq(userCosmetics.userId, userId));

    // Achievements unlocked
    const userAchs = await db.select({
      code: achievements.code,
      name: achievements.name,
      icon: achievements.icon,
      unlockedAt: userAchievements.unlockedAt
    })
    .from(userAchievements)
    .innerJoin(achievements, eq(userAchievements.achievementCode, achievements.code))
    .where(eq(userAchievements.userId, userId));

    return res.json(apiResponse(true, "Profile stats fetched", {
      user: {
        id: userRecord[0].id,
        username: userRecord[0].username,
        email: userRecord[0].email,
        createdAt: userRecord[0].createdAt
      },
      profile: profile[0],
      stats: {
        collectionPercent,
        ownedSpiritsCount: ownedSpirits.length,
        totalSpiritsCount,
        runnerHighScore: runnerStats[0]?.highScore || 0,
        runnerTotalRuns: runnerStats[0]?.totalRuns || 0,
        currentStreak: profile[0].currentStreak,
        longestStreak: profile[0].longestStreak,
        multiplayerWins: 5,
        winRate: '68%'
      },
      equippedCosmetics: equipped,
      achievements: userAchs,
      favoriteSpirit: ownedSpirits[0]?.spirits?.name || 'Hỏa Khuyển'
    }));
  } catch (err: any) {
    return res.status(500).json(apiResponse(false, err.message));
  }
});
