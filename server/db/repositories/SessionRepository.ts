import { db } from "../index";
import { gameSessions, mysteryTargets, userProfiles, spirits } from "../schema";
import { eq, and, sql } from "drizzle-orm";
import { v4 as uuidv4 } from 'uuid';
import { BusinessException } from "../../errors/BusinessException";
import { ProgressionService } from "../../services/ProgressionService";
import { SpiritRepository } from "./SpiritRepository";
import { ValkeyService } from "../../services/valkey.service";

import { StreakService } from "./StreakService";

export class SessionRepository {
  static async startSession(userId: string, mapId: string, sessionType: "NORMAL" | "BOSS" = "NORMAL") {
    const sessionId = uuidv4();
    
    // Pick a random active mystery target
    const targets = await db.select().from(mysteryTargets).where(eq(mysteryTargets.isActive, true));
    if (targets.length === 0) {
      throw new BusinessException("No mystery targets available", 500, "NO_TARGETS");
    }
    const randomTarget = targets[Math.floor(Math.random() * targets.length)];

    await db.insert(gameSessions).values({
      id: sessionId,
      userId,
      mapId,
      mysteryTargetId: randomTarget.id,
      sessionType,
      bossPhase: 0,
      status: "ACTIVE",
      score: 0,
      collectedHints: 0,
      earnedCoins: 0,
      createdAt: new Date(),
    });
    return sessionId;
  }

  static async endSession(userId: string, sessionId: string, status: "COMPLETED" | "ABANDONED", score: number, hints: number, coins: number, bossPhase?: number) {
    const session = await db.query.gameSessions.findFirst({
      where: and(eq(gameSessions.id, sessionId), eq(gameSessions.userId, userId))
    });

    if (!session) {
      throw new BusinessException("Session not found", 404, "SESSION_NOT_FOUND");
    }
    
    if (session.status !== "ACTIVE") {
      throw new BusinessException("Session is already ended", 400, "SESSION_ALREADY_ENDED");
    }

    // Validate claims (Anti-cheat hard limits)
    const validatedHints = Math.min(Math.max(0, hints), 3);
    const validatedCoins = Math.min(Math.max(0, coins), 300); // Anti-cheat cap max 300 coins per run
    const validatedScore = Math.min(Math.max(0, score), 50000); // Anti-cheat cap max 50000 score per run
    const finalBossPhase = bossPhase ?? session.bossPhase;

    let xpResult = null;

    // 1. Update Session
    await db.update(gameSessions)
      .set({
        status,
        score: validatedScore, 
        collectedHints: validatedHints,
        earnedCoins: validatedCoins,
        bossPhase: finalBossPhase,
        endedAt: new Date()
      })
      .where(eq(gameSessions.id, sessionId));

    // 2. Award Coins to User Profile
    if (validatedCoins > 0) {
      await db.update(userProfiles)
        .set({ coins: sql`coins + ${validatedCoins}` })
        .where(eq(userProfiles.userId, userId));
    }
      
    // 3. Grant XP and Update Daily Quests OUTSIDE the main transaction to avoid complex locks
    if (status === "COMPLETED") {
      let xpGained = Math.floor(validatedScore / 10) + (validatedHints * 10);
      if (session.sessionType === "BOSS") xpGained += (finalBossPhase * 50);

      xpResult = await ProgressionService.grantXp(userId, xpGained);
      
      await ProgressionService.updateDailyQuestProgress(userId, 'PLAY_RUNS', 1);
      if (validatedCoins > 0) {
        await ProgressionService.updateDailyQuestProgress(userId, 'COLLECT_COINS', validatedCoins);
      }

      // Check for Boss victory to unlock Void Spirit (Linh thú thứ 7)
      if (session.sessionType === "BOSS" && finalBossPhase >= 4) {
        try {
          const voidSpirit = await db.query.spirits.findFirst({
            where: eq(spirits.realm, "Void")
          });
          if (voidSpirit) {
            await SpiritRepository.unlockSpirit(userId, voidSpirit.id);
            console.log(`[Spirit System] User ${userId} defeated Void Boss! Unlocked 7th Spirit: Void Spirit.`);
          }
        } catch (err) {
          console.error("Auto unlock Void Spirit error:", err);
        }
      }

      // Update Valkey/Redis Realtime Leaderboard
      ValkeyService.updateLeaderboardScore('global_runs', userId, validatedScore).catch(() => {});
    }

    // Process daily streak logic upon participating
    await StreakService.processDailyLogin(userId);

    return xpResult;
  }
}
