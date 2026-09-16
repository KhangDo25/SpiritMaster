import { db } from "../index";
import { userProfiles } from "../schema";
import { eq } from "drizzle-orm";
import { v4 as uuidv4 } from "uuid";

export class UserProfileRepository {
  static async getProfileByUserId(userId: string) {
    return db.query.userProfiles.findFirst({
      where: eq(userProfiles.userId, userId),
    });
  }

  static async createProfile(userId: string, displayName: string) {
    const id = uuidv4();
    await db.insert(userProfiles).values({
      id,
      userId,
      displayName,
      stats: { matchesPlayed: 0, wins: 0, totalXPEarned: 0 }
    });
    return id;
  }
}
