import { db } from "../db";
import { userSpirits, spirits, spiritEvolutions, dailyQuests, userProfiles } from "../db/schema";
import { eq, and } from "drizzle-orm";
import { BusinessException } from "../errors/BusinessException";

const MAX_LEVEL = 10;
const getXpForNextLevel = (currentLevel: number) => currentLevel * 100;

export class ProgressionService {
  /**
   * Grants XP to a user's active/favorite spirit, handling level ups.
   */
  static async grantXp(userId: string, xpAmount: number) {
    if (xpAmount <= 0) return null;

    // Find the user's active spirit (either favorite, or the highest level one if no favorite)
    const profile = await db.query.userProfiles.findFirst({ where: eq(userProfiles.userId, userId) });
    let targetSpiritId = profile?.favoriteSpiritId;

    let targetUserSpirit = null;
    
    if (targetSpiritId) {
      targetUserSpirit = await db.query.userSpirits.findFirst({
        where: and(eq(userSpirits.userId, userId), eq(userSpirits.spiritId, targetSpiritId))
      });
    }

    if (!targetUserSpirit) {
      // Fallback: pick the first one they own
      targetUserSpirit = await db.query.userSpirits.findFirst({
        where: eq(userSpirits.userId, userId)
      });
    }

    if (!targetUserSpirit) return null;

    // Calculate new XP and Level
    let newXp = targetUserSpirit.xp + xpAmount;
    let newLevel = targetUserSpirit.level;
    let levelUpOccurred = false;

    while (newLevel < MAX_LEVEL) {
      const required = getXpForNextLevel(newLevel);
      if (newXp >= required) {
        newXp -= required;
        newLevel++;
        levelUpOccurred = true;
      } else {
        break;
      }
    }

    if (newLevel === MAX_LEVEL) {
      newXp = 0; // Cap XP at max level
    }

    // Update in DB
    await db.update(userSpirits)
      .set({ level: newLevel, xp: newXp })
      .where(eq(userSpirits.id, targetUserSpirit.id));

    // Update Daily Quest for XP
    await this.updateDailyQuestProgress(userId, 'EARN_XP', xpAmount);

    return {
      spiritId: targetUserSpirit.spiritId,
      oldLevel: targetUserSpirit.level,
      newLevel,
      newXp,
      levelUpOccurred
    };
  }

  /**
   * Evolves a spirit if it meets the level requirement.
   */
  static async evolveSpirit(userId: string, userSpiritId: string) {
    const userSpirit = await db.query.userSpirits.findFirst({
      where: and(eq(userSpirits.id, userSpiritId), eq(userSpirits.userId, userId))
    });

    if (!userSpirit) throw new BusinessException("Spirit not found", 404, "NOT_FOUND");

    // Check available evolutions that require a level <= current level
    const evolutions = await db.query.spiritEvolutions.findMany({
      where: eq(spiritEvolutions.spiritId, userSpirit.spiritId)
    });

    // Assume evolutionState is just a counter (1, 2, 3...) tracking which evolution we are on.
    // So if evolutionState = 0, we can unlock evolution 1.
    if (evolutions.length <= userSpirit.evolutionState) {
      throw new BusinessException("No further evolutions available", 400, "MAX_EVOLUTION");
    }

    const nextEvo = evolutions[userSpirit.evolutionState]; // Assuming ordered correctly

    if (userSpirit.level < nextEvo.requiredLevel) {
      throw new BusinessException(`Level ${nextEvo.requiredLevel} required for this evolution`, 400, "LEVEL_TOO_LOW");
    }

    // Process evolution
    await db.update(userSpirits)
      .set({ evolutionState: userSpirit.evolutionState + 1 })
      .where(eq(userSpirits.id, userSpiritId));

    return nextEvo;
  }

  /**
   * Universal method to progress daily quests.
   */
  static async updateDailyQuestProgress(userId: string, questType: string, amount: number) {
    const today = new Date().toISOString().split('T')[0];
    
    const quests = await db.query.dailyQuests.findMany({
      where: and(eq(dailyQuests.userId, userId), eq(dailyQuests.date, today), eq(dailyQuests.questType, questType))
    });

    for (const quest of quests) {
      if (quest.isClaimed || quest.currentValue >= quest.targetValue) continue;

      const newValue = Math.min(quest.currentValue + amount, quest.targetValue);
      await db.update(dailyQuests)
        .set({ currentValue: newValue })
        .where(eq(dailyQuests.id, quest.id));
    }
  }
}
