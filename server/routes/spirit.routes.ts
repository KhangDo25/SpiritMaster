import { Router } from 'express';
import { requireAuth, AuthRequest } from '../middlewares/auth';
import { apiResponse } from '../utils/response';
import { SpiritRepository } from '../db/repositories/SpiritRepository';
import { ProgressionService } from '../services/ProgressionService';
import { validate } from '../middlewares/validate';
import { selectStarterSchema } from '../dtos/spirit.dto';
import { db } from '../db';
import { userProfiles, userSpirits, spirits, gameSessions } from '../db/schema';
import { eq, and } from 'drizzle-orm';

export const spiritRouter = Router();

// Get the starting 6 spirits
spiritRouter.get('/starters', requireAuth, async (req: AuthRequest, res, next) => {
  try {
    const starters = await SpiritRepository.getStartingSpirits();
    res.json(apiResponse(true, "Starter spirits retrieved", starters));
  } catch (err) {
    next(err);
  }
});

// Select a starter spirit
spiritRouter.post('/select-starter', requireAuth, validate(selectStarterSchema), async (req: AuthRequest, res, next) => {
  try {
    const userId = req.user!.userId;
    const { spiritId } = req.body;
    
    await SpiritRepository.assignStarterSpirit(userId, spiritId);
    
    res.json(apiResponse(true, "Starter spirit successfully assigned"));
  } catch (err) {
    next(err);
  }
});

// Unlock Void Realm Spirit (Requirement: Defeat Void Boss OR Level 10 + Streak)
spiritRouter.post('/unlock-void', requireAuth, async (req: AuthRequest, res, next) => {
  try {
    const userId = req.user!.userId;
    
    const voidSpirit = await db.query.spirits.findFirst({
      where: eq(spirits.realm, "Void")
    });

    if (!voidSpirit) {
      return res.status(404).json(apiResponse(false, "Void spirit not found"));
    }

    const mySpirits = await db.select().from(userSpirits).where(eq(userSpirits.userId, userId));
    if (mySpirits.some(s => s.spiritId === voidSpirit.id)) {
      return res.json(apiResponse(true, "Linh thú Hư Không đã được mở khóa trước đó", { alreadyUnlocked: true, spirit: voidSpirit }));
    }

    // Check if user has defeated Void Boss
    const bossWin = await db.query.gameSessions.findFirst({
      where: and(
        eq(gameSessions.userId, userId),
        eq(gameSessions.sessionType, 'BOSS'),
        eq(gameSessions.status, 'COMPLETED')
      )
    });

    // Alternatively check Streak + Spirit level
    const profile = await db.query.userProfiles.findFirst({
      where: eq(userProfiles.userId, userId)
    });

    const isStreakQualified = profile && profile.currentStreak >= 3 && mySpirits.some(s => s.level >= 10);

    if (!bossWin && !isStreakQualified) {
      return res.status(400).json(apiResponse(false, "Yêu cầu: Đánh bại Boss Hư Không hoặc đạt Chuỗi 3 ngày + Linh thú Cấp 10"));
    }

    const result = await SpiritRepository.unlockSpirit(userId, voidSpirit.id);
    
    res.json(apiResponse(true, "Chúc mừng! Bạn đã mở khóa thành công Thần Thú Hư Không!", {
      userSpiritId: result.id,
      spirit: voidSpirit
    }));
  } catch (err) {
    next(err);
  }
});

// Get user's current spirits
spiritRouter.get('/mine', requireAuth, async (req: AuthRequest, res, next) => {
  try {
    const userId = req.user!.userId;
    const mySpirits = await db.select({
      id: userSpirits.id,
      level: userSpirits.level,
      xp: userSpirits.xp,
      evolutionState: userSpirits.evolutionState,
      spirit: spirits
    })
    .from(userSpirits)
    .innerJoin(spirits, eq(userSpirits.spiritId, spirits.id))
    .where(eq(userSpirits.userId, userId));
    
    res.json(apiResponse(true, "User spirits retrieved", mySpirits));
  } catch (err) {
    next(err);
  }
});

// Evolve a spirit
spiritRouter.post('/:userSpiritId/evolve', requireAuth, async (req: AuthRequest, res, next) => {
  try {
    const userId = req.user!.userId;
    const { userSpiritId } = req.params;
    
    const nextEvo = await ProgressionService.evolveSpirit(userId, userSpiritId);
    
    res.json(apiResponse(true, `Successfully evolved into ${nextEvo.evolvedName}!`, nextEvo));
  } catch (err) {
    next(err);
  }
});
