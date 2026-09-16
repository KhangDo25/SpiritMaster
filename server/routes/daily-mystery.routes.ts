import { Router } from 'express';
import { requireAuth, AuthRequest } from '../middlewares/auth';
import { apiResponse } from '../utils/response';
import { DailyMysteryRepository } from '../db/repositories/DailyMysteryRepository';
import { db } from '../db';
import { dailyMysteryAttempts } from '../db/schema';
import { eq, and } from 'drizzle-orm';

export const dailyMysteryRouter = Router();

dailyMysteryRouter.get('/', requireAuth, async (req: AuthRequest, res, next) => {
  try {
    const userId = req.user!.userId;
    const daily = await DailyMysteryRepository.getDailyMystery();
    
    if (!daily || !daily.mysteryTarget) {
      return res.json(apiResponse(true, "No daily mystery today", { active: false }));
    }

    const attempts = await db.query.dailyMysteryAttempts.findMany({
      where: and(
        eq(dailyMysteryAttempts.dailyMysteryId, daily.id),
        eq(dailyMysteryAttempts.userId, userId)
      )
    });

    const isSolved = attempts.some(a => a.isCorrect);
    
    res.json(apiResponse(true, "Daily mystery retrieved", {
      active: true,
      category: daily.mysteryTarget.category,
      difficulty: daily.mysteryTarget.difficulty,
      hint1: daily.mysteryTarget.hint1,
      hint2: daily.mysteryTarget.hint2,
      hint3: daily.mysteryTarget.hint3,
      attemptsRemaining: Math.max(0, 3 - attempts.length),
      isSolved,
      canonicalName: isSolved ? daily.mysteryTarget.canonicalName : null
    }));
  } catch (err) {
    next(err);
  }
});

dailyMysteryRouter.post('/guess', requireAuth, async (req: AuthRequest, res, next) => {
  try {
    const userId = req.user!.userId;
    const { guessText, timeTakenMs } = req.body;
    
    if (!guessText) {
      return res.status(400).json(apiResponse(false, "Guess text required"));
    }

    const result = await DailyMysteryRepository.submitDailyGuess(userId, guessText, timeTakenMs || 0);
    
    res.json(apiResponse(true, result.isCorrect ? "Correct guess!" : "Incorrect guess", result));
  } catch (err) {
    next(err);
  }
});

dailyMysteryRouter.get('/leaderboard', requireAuth, async (req: AuthRequest, res, next) => {
  try {
    const leaderboard = await DailyMysteryRepository.getDailyLeaderboard();
    res.json(apiResponse(true, "Leaderboard retrieved", leaderboard));
  } catch (err) {
    next(err);
  }
});
