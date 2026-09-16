import { db } from './index';
import { users, userProfiles, spirits, userSpirits } from './schema';
import { eq } from 'drizzle-orm';
import bcrypt from 'bcryptjs';

// NOTE: Local-dev demo accounts only. Test/QA accounts requested by an
// operator live in server/db/seedTestUsers.ts and are seeded into the ACTIVE
// auth store (Aiven MySQL when configured). Never enable this in production.

export const DEMO_USER_ID = 'user-demo-linhthu';
export const P2_USER_ID = 'user-demo-hoasivip';


export async function seedDemoUsers() {
  if (String(process.env.SEED_DEMO_USERS || '').toLowerCase() !== 'true') {
    console.log("Demo-user seeding disabled (SEED_DEMO_USERS != 'true'). Skipping.");
    return;
  }
  if (process.env.NODE_ENV === 'production') {
    console.log("Demo-user seeding refused in production. Skipping.");
    return;
  }
  console.log("Checking and seeding demo users (local dev only)...");

  const existingDemo = await db.query.users.findFirst({
    where: eq(users.username, 'linhthu')
  });

  const salt = await bcrypt.genSalt(10);
  const passwordHash = await bcrypt.hash('password123', salt);

  if (!existingDemo) {
    // 1. Create main demo user
    await db.insert(users).values({
      id: DEMO_USER_ID,
      username: 'linhthu',
      email: 'demo@linhthuhoi.com',
      passwordHash,
      status: 'ACTIVE',
      createdAt: new Date(),
      updatedAt: new Date()
    }).onConflictDoNothing();

    await db.insert(userProfiles).values({
      id: 'profile-demo-linhthu',
      userId: DEMO_USER_ID,
      displayName: 'Đạo Sĩ Linh Thú',
      coins: 2500,
      currentStreak: 4,
      longestStreak: 7,
      stats: { level: 5, totalXp: 1500, matchesPlayed: 15, wins: 10, totalXPEarned: 1500 }
    }).onConflictDoNothing();

    // Assign starter spirit (Hỏa Khuyển)
    const hoaKhuyen = await db.query.spirits.findFirst({
      where: eq(spirits.name, 'Hỏa Khuyển')
    });

    if (hoaKhuyen) {
      await db.insert(userSpirits).values({
        id: 'user-spirit-demo-linhthu',
        userId: DEMO_USER_ID,
        spiritId: hoaKhuyen.id,
        level: 5,
        xp: 450,
        evolutionState: 0
      }).onConflictDoNothing();
    }

    console.log("✓ Demo user 'linhthu' created.");
  }

  const existingPlayer2 = await db.query.users.findFirst({
    where: eq(users.username, 'hoasivip')
  });

  if (!existingPlayer2) {
    // 2. Create second player for multiplayer testing
    await db.insert(users).values({
      id: P2_USER_ID,
      username: 'hoasivip',
      email: 'hoasi@linhthuhoi.com',
      passwordHash,
      status: 'ACTIVE',
      createdAt: new Date(),
      updatedAt: new Date()
    }).onConflictDoNothing();

    await db.insert(userProfiles).values({
      id: 'profile-demo-hoasivip',
      userId: P2_USER_ID,
      displayName: 'Thần Họa Linh Giới',
      coins: 1800,
      currentStreak: 3,
      longestStreak: 5,
      stats: { level: 4, totalXp: 900, matchesPlayed: 10, wins: 6, totalXPEarned: 900 }
    }).onConflictDoNothing();

    const thuyNgu = await db.query.spirits.findFirst({
      where: eq(spirits.name, 'Thủy Ngư')
    });

    if (thuyNgu) {
      await db.insert(userSpirits).values({
        id: 'user-spirit-demo-hoasivip',
        userId: P2_USER_ID,
        spiritId: thuyNgu.id,
        level: 4,
        xp: 200,
        evolutionState: 0
      }).onConflictDoNothing();
    }

    console.log("✓ Demo user 'hoasivip' created.");
  }
}
