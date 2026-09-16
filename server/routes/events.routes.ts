import { Router, Response } from 'express';
import { requireAuth, AuthRequest } from '../middlewares/auth';
import { db } from '../db';
import { seasonalEvents, userProfiles } from '../db/schema';
import { eq, sql } from 'drizzle-orm';
import { apiResponse } from '../utils/response';

export const eventsRouter = Router();

// GET /api/events/active - Active seasonal event and quests
eventsRouter.get('/active', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const active = await db.select()
      .from(seasonalEvents)
      .where(eq(seasonalEvents.isActive, true))
      .limit(1);

    const event = active[0] || null;
    if (!event) {
      return res.json(apiResponse(true, "No active event", null));
    }

    // Seasonal quests
    const eventQuests = [
      {
        id: 'eq-1',
        title: 'Thợ Vẽ Điêu Luyện',
        description: 'Vẽ trong ít nhất 3 vòng đấu Draw & Guess',
        progress: 2,
        maxProgress: 3,
        rewardCurrency: 50,
        currencyName: event.currencyName,
        isClaimed: false
      },
      {
        id: 'eq-2',
        title: 'Tốc Độ Bão Táp',
        description: 'Tham gia 2 cuộc đua Spirit Race',
        progress: 2,
        maxProgress: 2,
        rewardCurrency: 80,
        currencyName: event.currencyName,
        isClaimed: false
      },
      {
        id: 'eq-3',
        title: 'Bậc Thầy Đoán Ý',
        description: 'Đoán đúng 5 từ khóa trong chế độ Vẽ & Đoán',
        progress: 3,
        maxProgress: 5,
        rewardCurrency: 100,
        currencyName: event.currencyName,
        isClaimed: false
      }
    ];

    return res.json(apiResponse(true, "Active event fetched", {
      event,
      quests: eventQuests
    }));
  } catch (err: any) {
    return res.status(500).json(apiResponse(false, err.message));
  }
});

// POST /api/events/claim/:questId - Claim event quest reward
eventsRouter.post('/claim/:questId', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    // Reward bonus coins
    await db.update(userProfiles)
      .set({ coins: sql`coins + 100` })
      .where(eq(userProfiles.userId, userId));

    return res.json(apiResponse(true, "Quest reward claimed", {
      claimed: true,
      coinsEarned: 100
    }));
  } catch (err: any) {
    return res.status(500).json(apiResponse(false, err.message));
  }
});
