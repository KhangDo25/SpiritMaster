import { Router, Response } from 'express';
import { requireAuth, AuthRequest } from '../middlewares/auth';
import { db } from '../db';
import { battlePasses, battlePassProgress, userProfiles } from '../db/schema';
import { eq, and, sql } from 'drizzle-orm';
import { apiResponse } from '../utils/response';
import { v4 as uuidv4 } from 'uuid';

export const battlePassRouter = Router();

// Define deterministic 20 tiers
const TIERS_CONFIG = Array.from({ length: 20 }, (_, i) => {
  const tier = i + 1;
  return {
    tier,
    xpRequired: tier * 250,
    freeReward: {
      type: tier % 5 === 0 ? 'SPHERE' : 'COINS',
      amount: tier * 40,
      name: tier % 5 === 0 ? `Linh Đan Cấp ${tier / 5}` : `${tier * 40} Xu`
    },
    premiumReward: {
      type: tier === 20 ? 'LEGENDARY_SKIN' : tier % 4 === 0 ? 'AVATAR_FRAME' : 'COINS',
      amount: tier * 100,
      name: tier === 20 ? 'Trang Phục Huyền Thoại: Thần Thú Giáng Trần' : tier % 4 === 0 ? `Khung Tinh Thể Cấp ${tier / 4}` : `${tier * 100} Xu Hoàng Kim`
    }
  };
});

// GET /api/battlepass - Current battle pass info & user progress
battlePassRouter.get('/', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.id;

    const currentPass = await db.select().from(battlePasses).where(eq(battlePasses.seasonNumber, 1)).limit(1);
    const pass = currentPass[0];

    let progress = await db.select()
      .from(battlePassProgress)
      .where(and(
        eq(battlePassProgress.userId, userId),
        eq(battlePassProgress.seasonNumber, 1)
      ))
      .limit(1);

    if (!progress[0]) {
      // Create initial progress
      const initial = {
        id: uuidv4(),
        userId,
        seasonNumber: 1,
        currentTier: 3, // Starter level 3 for demo enjoyment
        currentXp: 450,
        isPremiumPurchased: false,
        claimedFreeTiers: [1],
        claimedPremiumTiers: []
      };
      await db.insert(battlePassProgress).values(initial);
      progress = [initial as any];
    }

    return res.json(apiResponse(true, "Battle pass fetched", {
      pass,
      userProgress: progress[0],
      tiers: TIERS_CONFIG
    }));
  } catch (err: any) {
    return res.status(500).json(apiResponse(false, err.message));
  }
});

// POST /api/battlepass/claim - Claim a tier reward
battlePassRouter.post('/claim', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const { tier, isPremium = false } = req.body;

    const progress = await db.select()
      .from(battlePassProgress)
      .where(and(
        eq(battlePassProgress.userId, userId),
        eq(battlePassProgress.seasonNumber, 1)
      ))
      .limit(1);

    if (!progress[0]) {
      return res.status(404).json(apiResponse(false, "Battle pass progress not found"));
    }

    if (tier > progress[0].currentTier) {
      return res.status(400).json(apiResponse(false, "Tier not unlocked yet"));
    }

    if (isPremium && !progress[0].isPremiumPurchased) {
      return res.status(403).json(apiResponse(false, "Premium pass required"));
    }

    const claimedArray = (isPremium ? progress[0].claimedPremiumTiers : progress[0].claimedFreeTiers) as number[] || [];
    if (claimedArray.includes(tier)) {
      return res.status(400).json(apiResponse(false, "Tier reward already claimed"));
    }

    const updatedClaimed = [...claimedArray, tier];

    if (isPremium) {
      await db.update(battlePassProgress)
        .set({ claimedPremiumTiers: updatedClaimed })
        .where(eq(battlePassProgress.id, progress[0].id));
    } else {
      await db.update(battlePassProgress)
        .set({ claimedFreeTiers: updatedClaimed })
        .where(eq(battlePassProgress.id, progress[0].id));
    }

    // Award bonus coins
    const rewardCoins = tier * 50;
    await db.update(userProfiles)
      .set({ coins: sql`coins + ${rewardCoins}` })
      .where(eq(userProfiles.userId, userId));

    return res.json(apiResponse(true, "Tier reward claimed", {
      claimed: true,
      tier,
      isPremium,
      coinsEarned: rewardCoins
    }));
  } catch (err: any) {
    return res.status(500).json(apiResponse(false, err.message));
  }
});

// POST /api/battlepass/upgrade - Upgrade to Premium with coins
battlePassRouter.post('/upgrade', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const price = 800;

    const profile = await db.select().from(userProfiles).where(eq(userProfiles.userId, userId)).limit(1);
    if (!profile[0] || profile[0].coins < price) {
      return res.status(400).json(apiResponse(false, `Không đủ xu. Cần ${price} xu để mở khóa Thẻ Chiến Giới Hoàng Kim!`));
    }

    await db.update(userProfiles)
      .set({ coins: sql`coins - ${price}` })
      .where(eq(userProfiles.userId, userId));

    await db.update(battlePassProgress)
      .set({ isPremiumPurchased: true })
      .where(and(
        eq(battlePassProgress.userId, userId),
        eq(battlePassProgress.seasonNumber, 1)
      ));

    return res.json(apiResponse(true, "Upgraded to Premium Battle Pass", {
      upgraded: true,
      remainingCoins: profile[0].coins - price
    }));
  } catch (err: any) {
    return res.status(500).json(apiResponse(false, err.message));
  }
});
