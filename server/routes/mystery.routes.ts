import { Router } from 'express';
import { requireAuth, AuthRequest } from '../middlewares/auth';
import { apiResponse } from '../utils/response';
import { MysteryRepository } from '../db/repositories/MysteryRepository';
import { validate } from '../middlewares/validate';
import { guessSchema } from '../dtos/mystery.dto';

export const mysteryRouter = Router();

mysteryRouter.get('/:sessionId/hints', requireAuth, async (req: AuthRequest, res, next) => {
  try {
    const userId = req.user!.userId;
    const { sessionId } = req.params;
    
    const hintsData = await MysteryRepository.getHintsForSession(userId, sessionId);
    
    res.json(apiResponse(true, "Hints retrieved", hintsData));
  } catch (err) {
    next(err);
  }
});

mysteryRouter.post('/:sessionId/guess', requireAuth, validate(guessSchema), async (req: AuthRequest, res, next) => {
  try {
    const userId = req.user!.userId;
    const { sessionId } = req.params;
    const { guessText } = req.body;
    
    const result = await MysteryRepository.submitGuess(userId, sessionId, guessText);
    
    res.json(apiResponse(true, result.isCorrect ? "Correct guess!" : "Incorrect guess", result));
  } catch (err) {
    next(err);
  }
});
