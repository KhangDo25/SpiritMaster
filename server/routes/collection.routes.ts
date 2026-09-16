import { Router } from 'express';
import { requireAuth, AuthRequest } from '../middlewares/auth';
import { apiResponse } from '../utils/response';
import { db } from '../db';
import { mysteryTargets, mysteryGuesses, userSpirits } from '../db/schema';
import { eq, and } from 'drizzle-orm';

export const collectionRouter = Router();

collectionRouter.get('/', requireAuth, async (req: AuthRequest, res, next) => {
  try {
    const userId = req.user!.userId;

    // Fetch all available targets
    const allTargets = await db.query.mysteryTargets.findMany({
      where: eq(mysteryTargets.isActive, true)
    });

    // Fetch user's correct guesses
    const correctGuesses = await db.query.mysteryGuesses.findMany({
      where: and(eq(mysteryGuesses.userId, userId), eq(mysteryGuesses.isCorrect, true)),
      with: {
        session: {
          with: {
            mysteryTarget: true
          }
        }
      }
    });

    const unlockedTargetIds = new Set(
      correctGuesses.filter(g => g.session?.mysteryTarget).map(g => g.session!.mysteryTarget!.id)
    );

    // Group by category
    const collectionsByCategory = allTargets.reduce((acc, target) => {
      if (!acc[target.category]) {
        acc[target.category] = { total: 0, unlocked: 0, items: [] };
      }
      
      const isUnlocked = unlockedTargetIds.has(target.id);
      
      acc[target.category].total++;
      if (isUnlocked) acc[target.category].unlocked++;
      
      acc[target.category].items.push({
        id: target.id,
        category: target.category,
        difficulty: target.difficulty,
        isUnlocked,
        // Hide details if locked
        canonicalName: isUnlocked ? target.canonicalName : '???',
        hint1: isUnlocked ? target.hint1 : 'Complete runs to unlock hints',
        hint2: isUnlocked ? target.hint2 : '...',
        hint3: isUnlocked ? target.hint3 : '...'
      });
      
      return acc;
    }, {} as Record<string, { total: number, unlocked: number, items: any[] }>);

    // Add Spirits (Linh Thú) collection category
    const allSpirits = await db.query.spirits.findMany();
    const userSpiritsList = await db.query.userSpirits.findMany({
      where: eq(userSpirits.userId, userId)
    });
    const unlockedSpiritIds = new Set(userSpiritsList.map(us => us.spiritId));

    collectionsByCategory["Linh Thú"] = {
      total: allSpirits.length,
      unlocked: unlockedSpiritIds.size,
      items: allSpirits.map(sp => {
        const isUnlocked = unlockedSpiritIds.has(String(sp.id));
        const userSpirit = userSpiritsList.find(us => String(us.spiritId) === String(sp.id));
        return {
          id: sp.id,
          category: "Linh Thú",
          difficulty: sp.rarity,
          isUnlocked,
          canonicalName: isUnlocked ? sp.name : (sp.realm === "Void" ? "??? (Thần Thú Hư Không)" : "???"),
          hint1: `Hệ: ${sp.realm} | Phẩm cấp: ${sp.rarity}`,
          hint2: isUnlocked ? `Cấp độ hiện tại: Lv.${userSpirit?.level || 1} (Kinh nghiệm: ${userSpirit?.xp || 0})` : (sp.realm === "Void" ? "Đánh bại Boss Hư Không để mở khóa" : "Chọn tại khởi đầu hoặc nhận thưởng sự kiện"),
          hint3: sp.realm === "Void" ? "Thần thú thứ 7 huyền thoại - Nắm giữ quyền năng Hư Không" : "Linh thú đồng hành bảo trợ trên mọi nẻo đường"
        };
      })
    };

    res.json(apiResponse(true, "Collection retrieved", collectionsByCategory));
  } catch (err) {
    next(err);
  }
});
