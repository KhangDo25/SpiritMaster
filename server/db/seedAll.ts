import { db } from './index';
import { 
  spirits, 
  mysteryTargets, 
  drawingWords, 
  achievements, 
  cosmetics, 
  seasonalEvents, 
  battlePasses 
} from './schema';
import { 
  DRAWING_WORDS_SEED, 
  ACHIEVEMENTS_SEED, 
  COSMETICS_SEED, 
  SEASONAL_EVENT_SEED, 
  BATTLE_PASS_SEED 
} from './seedData';
import { sql } from 'drizzle-orm';
import { v4 as uuidv4 } from 'uuid';

export async function seedAll() {
  console.log("Starting comprehensive database seeding...");

  // 1. Spirits with stable deterministic IDs
  const initialSpirits = [
    { id: "spirit-hoa-khuyen", name: "Hỏa Khuyển", realm: "Hỏa", rarity: "COMMON", isActive: true },
    { id: "spirit-thuy-ngu", name: "Thủy Ngư", realm: "Thủy", rarity: "COMMON", isActive: true },
    { id: "spirit-moc-tinh", name: "Mộc Tinh", realm: "Mộc", rarity: "COMMON", isActive: true },
    { id: "spirit-loi-dieu", name: "Lôi Điểu", realm: "Lôi", rarity: "COMMON", isActive: true },
    { id: "spirit-anh-mieu", name: "Ảnh Miêu", realm: "Ảnh", rarity: "COMMON", isActive: true },
    { id: "spirit-quang-loc", name: "Quang Lộc", realm: "Quang", rarity: "COMMON", isActive: true },
    { id: "spirit-hu-khong", name: "Hư Không", realm: "Void", rarity: "LEGENDARY", isActive: true },
  ];

  await db.insert(spirits)
    .values(initialSpirits)
    .onConflictDoNothing();
  console.log("✓ Spirits checked/seeded.");

  // 2. Mystery Targets
  const targets = [];
  const animals = ["Sư tử", "Cá mập", "Đại bàng", "Gấu trúc", "Sói", "Hổ", "Rắn", "Cú mèo", "Cá voi", "Khỉ"];
  animals.forEach((name, i) => targets.push({
    id: uuidv4(), canonicalName: name, category: "Animals", aliases: [name.toLowerCase()],
    hint1: "Đây là một loài động vật hoang dã", hint2: `Đặc điểm ${i+1} của nó rất dễ nhận diện`, hint3: "Gợi ý cuối cùng về tập tính", difficulty: "EASY"
  }));
  const countries = ["Việt Nam", "Nhật Bản", "Mỹ", "Hàn Quốc", "Pháp", "Đức", "Anh", "Brazil", "Nga", "Úc"];
  countries.forEach((name, i) => targets.push({
    id: uuidv4(), canonicalName: name, category: "Countries", aliases: [name.toLowerCase()],
    hint1: "Đây là một quốc gia nổi tiếng", hint2: `Đặc điểm văn hóa và vị trí địa lý số ${i+1}`, hint3: "Quốc kỳ hoặc thủ đô của nó", difficulty: "EASY"
  }));
  const categories = ["Movies", "Games", "Tech", "Food", "History", "Brands", "Sports", "Anime"];
  categories.forEach(cat => {
    for (let i = 1; i <= 10; i++) {
      targets.push({
        id: uuidv4(), canonicalName: `${cat} Target ${i}`, category: cat, aliases: [`${cat.toLowerCase()} target ${i}`],
        hint1: `Một đối tượng thuộc danh mục ${cat}`, hint2: `Gợi ý thứ 2 về chi tiết ${cat} ${i}`, hint3: `Gợi ý quyết định của ${cat} ${i}`, difficulty: "MEDIUM"
      });
    }
  });

  await db.insert(mysteryTargets)
    .values(targets)
    .onConflictDoNothing();
  console.log("✓ Mystery targets checked/seeded.");

  // 3. Drawing Words (Task 10.3 - at least 200 seed words)
  console.log(`Seeding ${DRAWING_WORDS_SEED.length} drawing words...`);
  // Insert in chunks of 50 to avoid SQLite parameter limit
  for (let i = 0; i < DRAWING_WORDS_SEED.length; i += 50) {
    const chunk = DRAWING_WORDS_SEED.slice(i, i + 50);
    await db.insert(drawingWords)
      .values(chunk)
      .onConflictDoNothing();
  }
  console.log(`✓ ${DRAWING_WORDS_SEED.length} Drawing words seeded successfully.`);

  // 4. Achievements (Task 12.2)
  for (const ach of ACHIEVEMENTS_SEED) {
    await db.insert(achievements)
      .values({
        id: uuidv4(),
        ...ach
      })
      .onConflictDoNothing();
  }
  console.log(`✓ ${ACHIEVEMENTS_SEED.length} Achievements seeded successfully.`);

  // 5. Cosmetics (Task 12.6, 13.2)
  for (const cos of COSMETICS_SEED) {
    await db.insert(cosmetics)
      .values(cos)
      .onConflictDoNothing();
  }
  console.log(`✓ ${COSMETICS_SEED.length} Cosmetics seeded.`);

  // 6. Seasonal Events (Task 12.4)
  await db.insert(seasonalEvents)
    .values(SEASONAL_EVENT_SEED)
    .onConflictDoNothing();
  console.log("✓ Seasonal Event seeded.");

  // 7. Battle Pass (Task 13.3)
  await db.insert(battlePasses)
    .values(BATTLE_PASS_SEED)
    .onConflictDoNothing();
  console.log("✓ Battle Pass Season 1 seeded.");

  console.log("All comprehensive seeds completed successfully!");
}

if (process.argv[1] && process.argv[1].endsWith('seedAll.ts')) {
  seedAll().catch(err => {
    console.error("Seeding failed:", err);
    process.exit(1);
  });
}
