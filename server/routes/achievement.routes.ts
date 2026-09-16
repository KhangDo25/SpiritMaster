import { Router, Response } from 'express';
import { requireAuth, AuthRequest } from '../middlewares/auth';
import { db } from '../db';
import { achievements, userAchievements, userProfiles } from '../db/schema';
import { eq, sql, and } from 'drizzle-orm';
import { apiResponse } from '../utils/response';

export const achievementRouter = Router();

// GET /api/achievements - List all achievements with user unlock status
achievementRouter.get('/', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.id;

    const allAchievements = await db.select().from(achievements);
    const unlocked = await db.select()
      .from(userAchievements)
      .where(eq(userAchievements.userId, userId));

    const unlockedCodes = new Set(unlocked.map(u => u.achievementCode));

    const result = allAchievements.map(ach => ({
      ...ach,
      isUnlocked: unlockedCodes.has(ach.code),
      unlockedAt: unlocked.find(u => u.achievementCode === ach.code)?.unlockedAt || null
    }));

    return res.json(apiResponse(true, "Achievements fetched", result));
  } catch (err: any) {
    return res.status(500).json(apiResponse(false, err.message));
  }
});

// POST /api/achievements/unlock - Server-authoritative unlock trigger
achievementRouter.post('/unlock', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const { code } = req.body;

    if (!code) {
      return res.status(400).json(apiResponse(false, "Achievement code required"));
    }

    const ach = await db.select().from(achievements).where(eq(achievements.code, code)).limit(1);
    if (!ach[0]) {
      return res.status(404).json(apiResponse(false, "Achievement not found"));
    }

    const existing = await db.select()
      .from(userAchievements)
      .where(and(
        eq(userAchievements.userId, userId),
        eq(userAchievements.achievementCode, code)
      ))
      .limit(1);

    if (existing[0]) {
      return res.json(apiResponse(true, "Already unlocked", { alreadyUnlocked: true }));
    }

    // Insert user achievement
    await db.insert(userAchievements).values({
      id: `${userId}-${code}`,
      userId,
      achievementCode: code
    });

    // Reward coins
    await db.update(userProfiles)
      .set({
        coins: sql`coins + ${ach[0].rewardCoins}`
      })
      .where(eq(userProfiles.userId, userId));

    return res.json(apiResponse(true, "Achievement unlocked", {
      unlocked: true,
      rewardCoins: ach[0].rewardCoins,
      rewardXp: ach[0].rewardXp
    }));
  } catch (err: any) {
    return res.status(500).json(apiResponse(false, err.message));
  }
});
