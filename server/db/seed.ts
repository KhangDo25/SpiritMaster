import { db } from "./index";
import { spirits, mysteryTargets } from "./schema";
import { v4 as uuidv4 } from "uuid";
import { sql } from "drizzle-orm";

async function seed() {
  console.log("Seeding Database...");

  // 1. Seed 6 Initial Spirits + 1 Void Spirit
  const initialSpirits = [
    { id: uuidv4(), name: "Hỏa Khuyển", realm: "Hỏa", rarity: "COMMON", isActive: true },
    { id: uuidv4(), name: "Thủy Ngư", realm: "Thủy", rarity: "COMMON", isActive: true },
    { id: uuidv4(), name: "Mộc Tinh", realm: "Mộc", rarity: "COMMON", isActive: true },
    { id: uuidv4(), name: "Lôi Điểu", realm: "Lôi", rarity: "COMMON", isActive: true },
    { id: uuidv4(), name: "Ảnh Miêu", realm: "Ảnh", rarity: "COMMON", isActive: true },
    { id: uuidv4(), name: "Quang Lộc", realm: "Quang", rarity: "COMMON", isActive: true },
    { id: uuidv4(), name: "Hư Không", realm: "Void", rarity: "LEGENDARY", isActive: true },
  ];

  await db.insert(spirits)
    .values(initialSpirits)
    .onConflictDoUpdate({
      target: spirits.id,
      set: { name: sql`excluded.name` }
    });
  console.log(`Seeded ${initialSpirits.length} spirits.`);

  // 2. Seed 100 Mystery Targets
  const targets = [];
  
  // Category: Animals (10)
  const animals = ["Sư tử", "Cá mập", "Đại bàng", "Gấu trúc", "Sói", "Hổ", "Rắn", "Cú mèo", "Cá voi", "Khỉ"];
  animals.forEach((name, i) => targets.push({
    id: uuidv4(), canonicalName: name, category: "Animals", aliases: [name.toLowerCase()],
    hint1: "Đây là một loài động vật", hint2: `Đặc điểm ${i+1} của nó`, hint3: "Gợi ý cuối cùng", difficulty: "EASY"
  }));

  // Category: Countries (10)
  const countries = ["Việt Nam", "Nhật Bản", "Mỹ", "Hàn Quốc", "Pháp", "Đức", "Anh", "Brazil", "Nga", "Úc"];
  countries.forEach((name, i) => targets.push({
    id: uuidv4(), canonicalName: name, category: "Countries", aliases: [name.toLowerCase()],
    hint1: "Đây là một quốc gia", hint2: `Đặc điểm ${i+1} của nó`, hint3: "Gợi ý cuối cùng", difficulty: "EASY"
  }));

  // Add more systematically to reach 100
  const categories = ["Movies", "Games", "Tech", "Food", "History", "Brands", "Sports", "Anime"];
  categories.forEach(cat => {
    for (let i = 1; i <= 10; i++) {
      targets.push({
        id: uuidv4(), canonicalName: `${cat} Target ${i}`, category: cat, aliases: [`${cat.toLowerCase()} target ${i}`],
        hint1: `Một đối tượng thuộc ${cat}`, hint2: `Gợi ý thứ 2 của ${cat} ${i}`, hint3: `Gợi ý cuối của ${cat} ${i}`, difficulty: "MEDIUM"
      });
    }
  });

  await db.insert(mysteryTargets)
    .values(targets)
    .onConflictDoUpdate({
      target: mysteryTargets.id,
      set: { canonicalName: sql`excluded.canonical_name` }
    });
  console.log(`Seeded ${targets.length} mystery targets.`);
  
  console.log("Seeding Complete!");
  process.exit(0);
}

seed().catch(err => {
  console.error("Seeding failed:", err);
  process.exit(1);
});
