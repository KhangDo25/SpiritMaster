import { Router } from 'express';
import { requireAuth, AuthRequest } from '../middlewares/auth';
import { apiResponse } from '../utils/response';
import { db } from '../db';
import { dailyQuests, userProfiles } from '../db/schema';
import { eq, and, sql } from 'drizzle-orm';
import { v4 as uuidv4 } from 'uuid';

export const dailyQuestsRouter = Router();

const generateDailyQuests = async (userId: string, dateStr: string) => {
  const quests = [
    { questType: 'PLAY_RUNS', targetValue: 3, rewardCoins: 100 },
    { questType: 'COLLECT_COINS', targetValue: 50, rewardCoins: 50 },
    { questType: 'GUESS_MYSTERY', targetValue: 1, rewardCoins: 200 }
  ];

  const inserted = await db.insert(dailyQuests).values(
    quests.map(q => ({
      id: uuidv4(),
      userId,
      date: dateStr,
      questType: q.questType,
      targetValue: q.targetValue,
      rewardCoins: q.rewardCoins,
    }))
  ).returning();

  return inserted;
};

dailyQuestsRouter.get('/', requireAuth, async (req: AuthRequest, res, next) => {
  try {
    const userId = req.user!.userId;
    const today = new Date().toISOString().split('T')[0];
    
    let quests = await db.query.dailyQuests.findMany({
      where: and(eq(dailyQuests.userId, userId), eq(dailyQuests.date, today))
    });

    if (quests.length === 0) {
      quests = await generateDailyQuests(userId, today);
    }

    res.json(apiResponse(true, "Daily quests retrieved", quests));
  } catch (err) {
    next(err);
  }
});

dailyQuestsRouter.post('/:questId/claim', requireAuth, async (req: AuthRequest, res, next) => {
  try {
    const userId = req.user!.userId;
    const { questId } = req.params;

    const quest = await db.query.dailyQuests.findFirst({
      where: and(eq(dailyQuests.id, questId), eq(dailyQuests.userId, userId))
    });

    if (!quest) {
      return res.status(404).json(apiResponse(false, "Quest not found"));
    }

    if (quest.isClaimed) {
      return res.status(400).json(apiResponse(false, "Quest already claimed"));
    }

    if (quest.currentValue < quest.targetValue) {
      return res.status(400).json(apiResponse(false, "Quest not yet completed"));
    }

    await db.update(dailyQuests)
      .set({ isClaimed: true })
      .where(eq(dailyQuests.id, questId));

    await db.update(userProfiles)
      .set({ coins: sql`coins + ${quest.rewardCoins}` })
      .where(eq(userProfiles.userId, userId));

    res.json(apiResponse(true, "Reward claimed successfully", { rewardCoins: quest.rewardCoins }));
  } catch (err) {
    next(err);
  }
});
