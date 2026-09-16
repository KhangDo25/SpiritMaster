import { Router, Response } from 'express';
import { requireAuth, AuthRequest } from '../middlewares/auth';
import { db } from '../db';
import { cosmetics, userCosmetics, userProfiles } from '../db/schema';
import { eq, and, sql } from 'drizzle-orm';
import { apiResponse } from '../utils/response';
import { v4 as uuidv4 } from 'uuid';

export const shopRouter = Router();

// GET /api/shop/cosmetics - List all cosmetics with user ownership and equip state
shopRouter.get('/cosmetics', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.id;

    const allCosmetics = await db.select().from(cosmetics);
    const owned = await db.select()
      .from(userCosmetics)
      .where(eq(userCosmetics.userId, userId));

    const ownedMap = new Map<string, { isEquipped: boolean }>();
    owned.forEach(o => ownedMap.set(o.cosmeticId, { isEquipped: o.isEquipped }));

    const profile = await db.select()
      .from(userProfiles)
      .where(eq(userProfiles.userId, userId))
      .limit(1);

    const userCoins = profile[0]?.coins || 0;

    const catalog = allCosmetics.map(c => ({
      ...c,
      isOwned: ownedMap.has(c.id),
      isEquipped: ownedMap.get(c.id)?.isEquipped || false
    }));

    return res.json(apiResponse(true, "Shop catalog fetched", {
      coins: userCoins,
      catalog
    }));
  } catch (err: any) {
    return res.status(500).json(apiResponse(false, err.message));
  }
});

// POST /api/shop/buy - Purchase cosmetic with coins
shopRouter.post('/buy', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const { cosmeticId } = req.body;

    if (!cosmeticId) {
      return res.status(400).json(apiResponse(false, "Cosmetic ID required"));
    }

    const item = await db.select().from(cosmetics).where(eq(cosmetics.id, cosmeticId)).limit(1);
    if (!item[0]) {
      return res.status(404).json(apiResponse(false, "Item not found"));
    }

    // Check if already owned
    const alreadyOwned = await db.select()
      .from(userCosmetics)
      .where(and(
        eq(userCosmetics.userId, userId),
        eq(userCosmetics.cosmeticId, cosmeticId)
      ))
      .limit(1);

    if (alreadyOwned[0]) {
      return res.status(400).json(apiResponse(false, "You already own this item"));
    }

    const profile = await db.select()
      .from(userProfiles)
      .where(eq(userProfiles.userId, userId))
      .limit(1);

    const currentCoins = profile[0]?.coins || 0;
    if (currentCoins < item[0].priceCoins) {
      return res.status(400).json(apiResponse(false, `Not enough coins. Need ${item[0].priceCoins} coins`));
    }

    // Deduct coins & grant cosmetic
    await db.update(userProfiles)
      .set({ coins: sql`coins - ${item[0].priceCoins}` })
      .where(eq(userProfiles.userId, userId));

    await db.insert(userCosmetics).values({
      id: uuidv4(),
      userId,
      cosmeticId,
      isEquipped: false
    });

    return res.json(apiResponse(true, "Item purchased successfully", {
      purchased: true,
      remainingCoins: currentCoins - item[0].priceCoins,
      item: item[0]
    }));
  } catch (err: any) {
    return res.status(500).json(apiResponse(false, err.message));
  }
});

// POST /api/shop/equip - Equip or unequip item
shopRouter.post('/equip', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const { cosmeticId, shouldEquip = true } = req.body;

    if (!cosmeticId) {
      return res.status(400).json(apiResponse(false, "Cosmetic ID required"));
    }

    const item = await db.select().from(cosmetics).where(eq(cosmetics.id, cosmeticId)).limit(1);
    if (!item[0]) {
      return res.status(404).json(apiResponse(false, "Item not found"));
    }

    // Verify ownership
    const userItem = await db.select()
      .from(userCosmetics)
      .where(and(
        eq(userCosmetics.userId, userId),
        eq(userCosmetics.cosmeticId, cosmeticId)
      ))
      .limit(1);

    if (!userItem[0]) {
      return res.status(403).json(apiResponse(false, "You do not own this item"));
    }

    if (shouldEquip) {
      // Unequip any other cosmetics of the same type first
      const sameTypeCosmetics = await db.select({ id: cosmetics.id })
        .from(cosmetics)
        .where(eq(cosmetics.type, item[0].type));
      
      const ids = sameTypeCosmetics.map(c => c.id);
      for (const cid of ids) {
        await db.update(userCosmetics)
          .set({ isEquipped: false })
          .where(and(
            eq(userCosmetics.userId, userId),
            eq(userCosmetics.cosmeticId, cid)
          ));
      }

      // Equip the chosen one
      await db.update(userCosmetics)
        .set({ isEquipped: true })
        .where(and(
          eq(userCosmetics.userId, userId),
          eq(userCosmetics.cosmeticId, cosmeticId)
        ));
    } else {
      await db.update(userCosmetics)
        .set({ isEquipped: false })
        .where(and(
          eq(userCosmetics.userId, userId),
          eq(userCosmetics.cosmeticId, cosmeticId)
        ));
    }

    return res.json(apiResponse(true, shouldEquip ? "Item equipped" : "Item unequipped", {
      cosmeticId,
      isEquipped: shouldEquip
    }));
  } catch (err: any) {
    return res.status(500).json(apiResponse(false, err.message));
  }
});
