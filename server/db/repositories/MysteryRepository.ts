import { db } from "../index";
import { gameSessions, mysteryTargets, mysteryGuesses } from "../schema";
import { eq, and } from "drizzle-orm";
import { v4 as uuidv4 } from 'uuid';
import { BusinessException } from "../../errors/BusinessException";
import { ProgressionService } from "../../services/ProgressionService";

export class MysteryRepository {
  static async getHintsForSession(userId: string, sessionId: string) {
    const session = await db.query.gameSessions.findFirst({
      where: and(eq(gameSessions.id, sessionId), eq(gameSessions.userId, userId)),
      with: {
        mysteryTarget: true
      }
    });

    if (!session || !session.mysteryTarget) {
      throw new BusinessException("Session or mystery target not found", 404, "NOT_FOUND");
    }

    const hints = [];
    if (session.collectedHints >= 1) hints.push(session.mysteryTarget.hint1);
    if (session.collectedHints >= 2) hints.push(session.mysteryTarget.hint2);
    if (session.collectedHints >= 3) hints.push(session.mysteryTarget.hint3);

    return {
      category: session.mysteryTarget.category,
      difficulty: session.mysteryTarget.difficulty,
      hints
    };
  }

  static async submitGuess(userId: string, sessionId: string, guessText: string) {
    const session = await db.query.gameSessions.findFirst({
      where: and(eq(gameSessions.id, sessionId), eq(gameSessions.userId, userId)),
      with: {
        mysteryTarget: true
      }
    });

    if (!session || !session.mysteryTarget) {
      throw new BusinessException("Session or mystery target not found", 404, "NOT_FOUND");
    }

    // Rate Limiting: Prevent more than 5 guesses per session
    const existingGuesses = await db.select().from(mysteryGuesses).where(eq(mysteryGuesses.sessionId, sessionId));
    if (existingGuesses.length >= 5) {
      throw new BusinessException("Maximum guess attempts reached for this session", 429, "TOO_MANY_GUESSES");
    }

    // Check if already correctly guessed
    if (existingGuesses.some(g => g.isCorrect)) {
      throw new BusinessException("You have already solved this mystery", 400, "ALREADY_SOLVED");
    }

    // Normalize guess
    const normalize = (str: string) => str.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim();
    const normalizedGuess = normalize(guessText);
    
    // Check against canonical name
    let isCorrect = normalize(session.mysteryTarget.canonicalName) === normalizedGuess;

    // Check against aliases
    if (!isCorrect) {
      const aliases = session.mysteryTarget.aliases as string[];
      if (aliases && Array.isArray(aliases)) {
        isCorrect = aliases.some(alias => normalize(alias) === normalizedGuess);
      }
    }

    await db.insert(mysteryGuesses).values({
      id: uuidv4(),
      sessionId,
      userId,
      guessText,
      isCorrect,
      createdAt: new Date()
    });

    if (isCorrect) {
      await ProgressionService.updateDailyQuestProgress(userId, 'GUESS_MYSTERY', 1);
      // Extra reward for correct guess
      await ProgressionService.grantXp(userId, 50);
    }

    return {
      isCorrect,
      canonicalName: isCorrect ? session.mysteryTarget.canonicalName : null
    };
  }
}
