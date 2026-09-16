import { Router } from 'express';
import { requireAuth, AuthRequest } from '../middlewares/auth';
import { apiResponse } from '../utils/response';
import { SessionRepository } from '../db/repositories/SessionRepository';
import { validate } from '../middlewares/validate';
import { startSessionSchema, endSessionSchema } from '../dtos/session.dto';

export const sessionRouter = Router();

sessionRouter.post('/start', requireAuth, validate(startSessionSchema), async (req: AuthRequest, res, next) => {
  try {
    const userId = req.user!.userId;
    const { mapId, sessionType } = req.body;
    
    const sessionId = await SessionRepository.startSession(userId, mapId, sessionType);
    
    res.json(apiResponse(true, "Session started", { sessionId }));
  } catch (err) {
    next(err);
  }
});

sessionRouter.post('/end', requireAuth, validate(endSessionSchema), async (req: AuthRequest, res, next) => {
  try {
    const userId = req.user!.userId;
    const { sessionId, status, claimedScore, claimedHints, claimedCoins, bossPhase } = req.body;
    
    const xpResult = await SessionRepository.endSession(userId, sessionId, status, claimedScore, claimedHints, claimedCoins, bossPhase);
    
    res.json(apiResponse(true, "Session ended successfully", xpResult));
  } catch (err) {
    next(err);
  }
});
