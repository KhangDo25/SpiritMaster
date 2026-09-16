import { db } from "../index";
import { userSpirits } from "../schema";
import { eq, and } from "drizzle-orm";
import { BusinessException } from "../../errors/BusinessException";
import { v4 as uuidv4 } from "uuid";

export class UserSpiritRepository {
  static async getUserSpirits(userId: string) {
    return db.query.userSpirits.findMany({
      where: eq(userSpirits.userId, userId),
      with: {
        spirit: true
      }
    });
  }

  // Server-authoritative logic for progression
  static async addXP(userSpiritId: string, userId: string, xpAmount: number) {
    const targetSpirit = await db.query.userSpirits.findFirst({
      where: and(eq(userSpirits.id, userSpiritId), eq(userSpirits.userId, userId))
    });

    if (!targetSpirit) throw new BusinessException("Spirit not found or not owned by user", 404, "NOT_FOUND");
    if (targetSpirit.level >= 10) return targetSpirit; // Max level

    let newXp = targetSpirit.xp + xpAmount;
    let newLevel = targetSpirit.level;
    const requiredXpForNextLevel = newLevel * 1000; // Progression formula

    if (newXp >= requiredXpForNextLevel && newLevel < 10) {
      newLevel++;
      newXp -= requiredXpForNextLevel;
    }

    await db.update(userSpirits)
      .set({ level: newLevel, xp: newXp })
      .where(eq(userSpirits.id, userSpiritId));
      
    return { ...targetSpirit, level: newLevel, xp: newXp };
  }
}
