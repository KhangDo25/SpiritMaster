import { db } from "../index";
import { dailyMysteries, dailyMysteryAttempts, mysteryTargets } from "../schema";
import { eq, and } from "drizzle-orm";
import { v4 as uuidv4 } from 'uuid';
import { BusinessException } from "../../errors/BusinessException";

export class DailyMysteryRepository {
  static async getDailyMystery() {
    const today = new Date().toISOString().split('T')[0];
    
    let daily = await db.query.dailyMysteries.findFirst({
      where: eq(dailyMysteries.date, today),
      with: {
        mysteryTarget: true
      }
    });

    if (!daily) {
      // Pick random active target
      const targets = await db.select().from(mysteryTargets).where(eq(mysteryTargets.isActive, true));
      if (targets.length === 0) return null;
      const randomTarget = targets[Math.floor(Math.random() * targets.length)];

      const [inserted] = await db.insert(dailyMysteries).values({
        id: uuidv4(),
        date: today,
        mysteryTargetId: randomTarget.id
      }).returning();

      daily = {
        ...inserted,
        mysteryTarget: randomTarget
      } as any;
    }

    return daily;
  }

  static async submitDailyGuess(userId: string, guessText: string, timeTakenMs: number) {
    const daily = await this.getDailyMystery();
    if (!daily || !daily.mysteryTarget) throw new BusinessException("No daily mystery active", 404, "NOT_FOUND");

    const existingAttempts = await db.select().from(dailyMysteryAttempts).where(
      and(
        eq(dailyMysteryAttempts.dailyMysteryId, daily.id),
        eq(dailyMysteryAttempts.userId, userId)
      )
    );

    if (existingAttempts.length >= 3) {
      throw new BusinessException("Maximum attempts reached for today", 429, "MAX_ATTEMPTS");
    }

    if (existingAttempts.some(a => a.isCorrect)) {
      throw new BusinessException("Already solved today", 400, "ALREADY_SOLVED");
    }

    const normalize = (str: string) => str.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim();
    const normalizedGuess = normalize(guessText);
    
    let isCorrect = normalize(daily.mysteryTarget.canonicalName) === normalizedGuess;
    if (!isCorrect) {
      const aliases = daily.mysteryTarget.aliases as string[];
      if (aliases && Array.isArray(aliases)) {
        isCorrect = aliases.some(alias => normalize(alias) === normalizedGuess);
      }
    }

    await db.insert(dailyMysteryAttempts).values({
      id: uuidv4(),
      dailyMysteryId: daily.id,
      userId,
      guessText,
      isCorrect,
      timeTakenMs
    });

    return {
      isCorrect,
      canonicalName: isCorrect ? daily.mysteryTarget.canonicalName : null
    };
  }

  static async getDailyLeaderboard() {
    const daily = await this.getDailyMystery();
    if (!daily) return [];

    const attempts = await db.query.dailyMysteryAttempts.findMany({
      where: and(
        eq(dailyMysteryAttempts.dailyMysteryId, daily.id),
        eq(dailyMysteryAttempts.isCorrect, true)
      ),
      with: {
        user: {
          with: {
            profile: true
          }
        }
      }
    });

    // Sort by fastest time
    const sorted = attempts.sort((a, b) => a.timeTakenMs - b.timeTakenMs);

    return sorted.map((a, i) => ({
      rank: i + 1,
      displayName: a.user.profile?.displayName || a.user.username,
      timeTakenMs: a.timeTakenMs
    })).slice(0, 10); // Top 10
  }
}
