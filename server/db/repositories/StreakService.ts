import { db } from "../index";
import { userProfiles } from "../schema";
import { eq } from "drizzle-orm";

export class StreakService {
  static async processDailyLogin(userId: string) {
    const profile = await db.query.userProfiles.findFirst({
      where: eq(userProfiles.userId, userId)
    });

    if (!profile) return null;

    const today = new Date();
    // Normalize to YYYY-MM-DD
    const todayStr = today.toISOString().split('T')[0];

    if (profile.lastActivityDate === todayStr) {
      // Already logged in today
      return profile;
    }

    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = yesterday.toISOString().split('T')[0];

    let newStreak = 1;
    let longestStreak = profile.longestStreak;

    if (profile.lastActivityDate === yesterdayStr) {
      // Continuous streak
      newStreak = profile.currentStreak + 1;
      longestStreak = Math.max(newStreak, profile.longestStreak);
    } // Else missed a day, resets to 1

    await db.update(userProfiles)
      .set({
        currentStreak: newStreak,
        longestStreak: longestStreak,
        lastActivityDate: todayStr
      })
      .where(eq(userProfiles.userId, userId));

    return {
      currentStreak: newStreak,
      longestStreak: longestStreak
    };
  }
}
