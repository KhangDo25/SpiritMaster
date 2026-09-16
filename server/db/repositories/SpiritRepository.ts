import { db } from "../index";
import { spirits, userSpirits } from "../schema";
import { eq, and } from "drizzle-orm";
import { v4 as uuidv4 } from 'uuid';
import { BusinessException } from "../../errors/BusinessException";

export class SpiritRepository {
  static async getStartingSpirits() {
    return await db.select().from(spirits).where(eq(spirits.rarity, 'COMMON'));
  }

  static async assignStarterSpirit(userId: string, spiritId: string) {
    // Verify spirit exists and is a starter
    const spirit = await db.query.spirits.findFirst({
      where: and(eq(spirits.id, spiritId), eq(spirits.rarity, 'COMMON'))
    });

    if (!spirit) {
      throw new BusinessException("Invalid starter spirit selected", 400, "INVALID_SPIRIT");
    }

    // Verify user doesn't already have spirits
    const existingSpirits = await db.select().from(userSpirits).where(eq(userSpirits.userId, userId));
    if (existingSpirits.length > 0) {
      throw new BusinessException("User already has a starting spirit", 400, "ALREADY_HAS_STARTER");
    }

    const newUserSpiritId = uuidv4();
    await db.insert(userSpirits).values({
      id: newUserSpiritId,
      userId,
      spiritId,
      level: 1,
      xp: 0,
      evolutionState: 0,
      acquiredAt: new Date()
    });

    return newUserSpiritId;
  }

  static async unlockSpirit(userId: string, spiritId: string) {
    const spirit = await db.query.spirits.findFirst({
      where: eq(spirits.id, spiritId)
    });

    if (!spirit) {
      throw new BusinessException("Linh thú không tồn tại", 404, "SPIRIT_NOT_FOUND");
    }

    const existing = await db.query.userSpirits.findFirst({
      where: and(eq(userSpirits.userId, userId), eq(userSpirits.spiritId, spiritId))
    });

    if (existing) {
      return { id: existing.id, isNew: false, spirit };
    }

    const newUserSpiritId = uuidv4();
    await db.insert(userSpirits).values({
      id: newUserSpiritId,
      userId,
      spiritId,
      level: 1,
      xp: 0,
      evolutionState: 0,
      acquiredAt: new Date()
    });

    return { id: newUserSpiritId, isNew: true, spirit };
  }
}
