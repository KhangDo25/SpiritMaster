import { sqliteTable, text, integer, uniqueIndex, index } from "drizzle-orm/sqlite-core";
import { relations, sql } from "drizzle-orm";

// ==========================================
// TASK 2.1 - USER ENTITY
// ==========================================
export const users = sqliteTable("users", {
  id: text("id").primaryKey(),
  username: text("username").notNull().unique(),
  email: text("email").notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  status: text("status").default("ACTIVE").notNull(),
  createdAt: integer("created_at", { mode: "timestamp" }).default(sql`(strftime('%s', 'now'))`).notNull(),
  updatedAt: integer("updated_at", { mode: "timestamp" }).default(sql`(strftime('%s', 'now'))`).notNull(),
});

// ==========================================
// TASK 2.2 - USER PROFILE
// ==========================================
export const userProfiles = sqliteTable("user_profiles", {
  id: text("id").primaryKey(),
  userId: text("user_id").notNull().unique().references(() => users.id), // One-to-one
  displayName: text("display_name").notNull(),
  avatarUrl: text("avatar_url"),
  favoriteSpiritId: text("favorite_spirit_id").references(() => spirits.id),
  coins: integer("coins").default(0).notNull(),
  stats: text("stats", { mode: "json" }), // Flexible for game mode statistics
  
  // TASK 7.2 - STREAK
  currentStreak: integer("current_streak").default(0).notNull(),
  longestStreak: integer("longest_streak").default(0).notNull(),
  lastActivityDate: text("last_activity_date"), // YYYY-MM-DD
  
  createdAt: integer("created_at", { mode: "timestamp" }).default(sql`(strftime('%s', 'now'))`).notNull(),
  updatedAt: integer("updated_at", { mode: "timestamp" }).default(sql`(strftime('%s', 'now'))`).notNull(),
});

// ==========================================
// TASK 2.3 - SPIRIT CATALOG
// ==========================================
export const spirits = sqliteTable("spirits", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  realm: text("realm").notNull(), // Hỏa, Thủy, Mộc, Lôi, Ảnh, Quang
  rarity: text("rarity").notNull(),
  isActive: integer("is_active", { mode: "boolean" }).default(true).notNull(),
  createdAt: integer("created_at", { mode: "timestamp" }).default(sql`(strftime('%s', 'now'))`).notNull(),
});

export const spiritEvolutions = sqliteTable("spirit_evolutions", {
  id: text("id").primaryKey(),
  spiritId: text("spirit_id").notNull().references(() => spirits.id),
  requiredLevel: integer("required_level").notNull(),
  evolvedName: text("evolved_name").notNull(),
  statsMultiplier: integer("stats_multiplier").default(1).notNull(),
  createdAt: integer("created_at", { mode: "timestamp" }).default(sql`(strftime('%s', 'now'))`).notNull(),
});

// ==========================================
// TASK 2.4 - USER SPIRIT PROGRESSION
// ==========================================
export const userSpirits = sqliteTable("user_spirits", {
  id: text("id").primaryKey(),
  userId: text("user_id").notNull().references(() => users.id),
  spiritId: text("spirit_id").notNull().references(() => spirits.id),
  level: integer("level").default(1).notNull(), // Validated at 1-10 on backend
  xp: integer("xp").default(0).notNull(),
  evolutionState: integer("evolution_state").default(0).notNull(),
  acquiredAt: integer("acquired_at", { mode: "timestamp" }).default(sql`(strftime('%s', 'now'))`).notNull(),
}, (table) => ({
  userIdx: index("user_idx").on(table.userId),
}));

// ==========================================
// TASK 4.4 - GAME SESSIONS
// ==========================================
export const gameSessions = sqliteTable("game_sessions", {
  id: text("id").primaryKey(),
  userId: text("user_id").notNull().references(() => users.id),
  mapId: text("map_id").notNull(),
  mysteryTargetId: text("mystery_target_id").references(() => mysteryTargets.id),
  
  sessionType: text("session_type").default("NORMAL").notNull(), // NORMAL, BOSS
  bossPhase: integer("boss_phase").default(0).notNull(), // For BOSS runs
  
  status: text("status").default("ACTIVE").notNull(), // ACTIVE, COMPLETED, ABANDONED
  score: integer("score").default(0).notNull(),
  collectedHints: integer("collected_hints").default(0).notNull(),
  earnedCoins: integer("earned_coins").default(0).notNull(),
  createdAt: integer("created_at", { mode: "timestamp" }).default(sql`(strftime('%s', 'now'))`).notNull(),
  endedAt: integer("ended_at", { mode: "timestamp" }),
});

// ==========================================
// TASK 2.5 - MYSTERY TARGET CATALOG
// ==========================================
export const mysteryTargets = sqliteTable("mystery_targets", {
  id: text("id").primaryKey(),
  canonicalName: text("canonical_name").notNull(),
  category: text("category").notNull(),
  aliases: text("aliases", { mode: "json" }).notNull(), // Case/accent-insensitive match logic built on this
  hint1: text("hint_1").notNull(),
  hint2: text("hint_2").notNull(),
  hint3: text("hint_3").notNull(),
  difficulty: text("difficulty").notNull(), // EASY, MEDIUM, HARD
  isActive: integer("is_active", { mode: "boolean" }).default(true).notNull(),
  createdAt: integer("created_at", { mode: "timestamp" }).default(sql`(strftime('%s', 'now'))`).notNull(),
});

export const mysteryGuesses = sqliteTable("mystery_guesses", {
  id: text("id").primaryKey(),
  sessionId: text("session_id").notNull().references(() => gameSessions.id),
  userId: text("user_id").notNull().references(() => users.id),
  guessText: text("guess_text").notNull(),
  isCorrect: integer("is_correct", { mode: "boolean" }).notNull(),
  createdAt: integer("created_at", { mode: "timestamp" }).default(sql`(strftime('%s', 'now'))`).notNull(),
});

// ==========================================
// TASK 6.6 - DAILY QUESTS
// ==========================================
export const dailyQuests = sqliteTable("daily_quests", {
  id: text("id").primaryKey(),
  userId: text("user_id").notNull().references(() => users.id),
  questType: text("quest_type").notNull(), // 'PLAY_RUNS', 'COLLECT_COINS', 'GUESS_MYSTERY', 'EARN_XP'
  targetValue: integer("target_value").notNull(),
  currentValue: integer("current_value").default(0).notNull(),
  isClaimed: integer("is_claimed", { mode: "boolean" }).default(false).notNull(),
  date: text("date").notNull(), // YYYY-MM-DD to easily query for today's quests
  rewardCoins: integer("reward_coins").notNull(),
  createdAt: integer("created_at", { mode: "timestamp" }).default(sql`(strftime('%s', 'now'))`).notNull(),
});

// ==========================================
// TASK 7.1 - DAILY MYSTERY
// ==========================================
export const dailyMysteries = sqliteTable("daily_mysteries", {
  id: text("id").primaryKey(),
  date: text("date").notNull().unique(), // YYYY-MM-DD
  mysteryTargetId: text("mystery_target_id").notNull().references(() => mysteryTargets.id),
  createdAt: integer("created_at", { mode: "timestamp" }).default(sql`(strftime('%s', 'now'))`).notNull(),
});

export const dailyMysteryAttempts = sqliteTable("daily_mystery_attempts", {
  id: text("id").primaryKey(),
  dailyMysteryId: text("daily_mystery_id").notNull().references(() => dailyMysteries.id),
  userId: text("user_id").notNull().references(() => users.id),
  guessText: text("guess_text").notNull(),
  isCorrect: integer("is_correct", { mode: "boolean" }).notNull(),
  timeTakenMs: integer("time_taken_ms").notNull(),
  createdAt: integer("created_at", { mode: "timestamp" }).default(sql`(strftime('%s', 'now'))`).notNull(),
});

// ==========================================
// TASK 8.1 - ROOM ENTITY
// ==========================================
export const rooms = sqliteTable("rooms", {
  id: text("id").primaryKey(),
  code: text("code").notNull().unique(), // e.g. K9X27
  hostId: text("host_id").notNull().references(() => users.id),
  mode: text("mode").notNull(), // e.g. BATTLE, COOP
  theme: text("theme").notNull(),
  maxRounds: integer("max_rounds").notNull(),
  roundTimeSeconds: integer("round_time_seconds").notNull(),
  status: text("status").default("LOBBY").notNull(), // LOBBY, PLAYING, FINISHED
  maxPlayers: integer("max_players").default(12).notNull(),
  createdAt: integer("created_at", { mode: "timestamp" }).default(sql`(strftime('%s', 'now'))`).notNull(),
  updatedAt: integer("updated_at", { mode: "timestamp" }).default(sql`(strftime('%s', 'now'))`).notNull(),
});

// ==========================================
// TASK 8.2 - ROOM PLAYER ENTITY
// ==========================================
export const roomPlayers = sqliteTable("room_players", {
  id: text("id").primaryKey(),
  roomId: text("room_id").notNull().references(() => rooms.id),
  userId: text("user_id").notNull().references(() => users.id),
  isReady: integer("is_ready", { mode: "boolean" }).default(false).notNull(),
  score: integer("score").default(0).notNull(),
  connectionState: text("connection_state").default("CONNECTED").notNull(), // CONNECTED, DISCONNECTED
  joinedAt: integer("joined_at", { mode: "timestamp" }).default(sql`(strftime('%s', 'now'))`).notNull(),
}, (table) => ({
  roomUserIdx: index("room_user_idx").on(table.roomId, table.userId),
}));

// ==========================================
// RELATIONS
// ==========================================
export const usersRelations = relations(users, ({ one, many }) => ({
  profile: one(userProfiles, {
    fields: [users.id],
    references: [userProfiles.userId],
  }),
  spirits: many(userSpirits),
}));

export const userProfilesRelations = relations(userProfiles, ({ one }) => ({
  user: one(users, {
    fields: [userProfiles.userId],
    references: [users.id],
  }),
  favoriteSpirit: one(spirits, {
    fields: [userProfiles.favoriteSpiritId],
    references: [spirits.id],
  }),
}));

export const spiritsRelations = relations(spirits, ({ many }) => ({
  evolutions: many(spiritEvolutions),
}));

export const spiritEvolutionsRelations = relations(spiritEvolutions, ({ one }) => ({
  spirit: one(spirits, {
    fields: [spiritEvolutions.spiritId],
    references: [spirits.id],
  }),
}));

export const userSpiritsRelations = relations(userSpirits, ({ one }) => ({
  user: one(users, {
    fields: [userSpirits.userId],
    references: [users.id],
  }),
  spirit: one(spirits, {
    fields: [userSpirits.spiritId],
    references: [spirits.id],
  }),
}));

export const gameSessionsRelations = relations(gameSessions, ({ one, many }) => ({
  user: one(users, {
    fields: [gameSessions.userId],
    references: [users.id],
  }),
  mysteryTarget: one(mysteryTargets, {
    fields: [gameSessions.mysteryTargetId],
    references: [mysteryTargets.id],
  }),
  guesses: many(mysteryGuesses),
}));

export const mysteryGuessesRelations = relations(mysteryGuesses, ({ one }) => ({
  session: one(gameSessions, {
    fields: [mysteryGuesses.sessionId],
    references: [gameSessions.id],
  }),
  user: one(users, {
    fields: [mysteryGuesses.userId],
    references: [users.id],
  }),
}));

export const roomsRelations = relations(rooms, ({ one, many }) => ({
  host: one(users, {
    fields: [rooms.hostId],
    references: [users.id],
  }),
  players: many(roomPlayers),
}));

export const roomPlayersRelations = relations(roomPlayers, ({ one }) => ({
  room: one(rooms, {
    fields: [roomPlayers.roomId],
    references: [rooms.id],
  }),
  user: one(users, {
    fields: [roomPlayers.userId],
    references: [users.id],
  }),
}));

export const dailyMysteriesRelations = relations(dailyMysteries, ({ one, many }) => ({
  mysteryTarget: one(mysteryTargets, {
    fields: [dailyMysteries.mysteryTargetId],
    references: [mysteryTargets.id],
  }),
  attempts: many(dailyMysteryAttempts),
}));

export const dailyMysteryAttemptsRelations = relations(dailyMysteryAttempts, ({ one }) => ({
  dailyMystery: one(dailyMysteries, {
    fields: [dailyMysteryAttempts.dailyMysteryId],
    references: [dailyMysteries.id],
  }),
  user: one(users, {
    fields: [dailyMysteryAttempts.userId],
    references: [users.id],
  }),
}));

// ==========================================
// PHASE 10 - DRAWING WORD CATALOG
// ==========================================
export const drawingWords = sqliteTable("drawing_words", {
  id: text("id").primaryKey(),
  word: text("word").notNull(),
  category: text("category").notNull(), // Myth, Animals, Elements, Objects, Landmarks, Vietnamese Culture
  difficulty: text("difficulty").default("MEDIUM").notNull(), // EASY, MEDIUM, HARD
  hint: text("hint").notNull(),
  isActive: integer("is_active", { mode: "boolean" }).default(true).notNull(),
  createdAt: integer("created_at", { mode: "timestamp" }).default(sql`(strftime('%s', 'now'))`).notNull(),
});

// ==========================================
// PHASE 12 - COSMETICS & INVENTORY
// ==========================================
export const cosmetics = sqliteTable("cosmetics", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  type: text("type").notNull(), // SKIN, TRAIL, EMOTE, FRAME, BACKGROUND
  rarity: text("rarity").notNull(), // COMMON, RARE, EPIC, LEGENDARY
  priceCoins: integer("price_coins").notNull(),
  assetValue: text("asset_value").notNull(), // color code, icon, or css class
  description: text("description").notNull(),
  seasonEventId: text("season_event_id"),
  createdAt: integer("created_at", { mode: "timestamp" }).default(sql`(strftime('%s', 'now'))`).notNull(),
});

export const userCosmetics = sqliteTable("user_cosmetics", {
  id: text("id").primaryKey(),
  userId: text("user_id").notNull().references(() => users.id),
  cosmeticId: text("cosmetic_id").notNull().references(() => cosmetics.id),
  isEquipped: integer("is_equipped", { mode: "boolean" }).default(false).notNull(),
  acquiredAt: integer("acquired_at", { mode: "timestamp" }).default(sql`(strftime('%s', 'now'))`).notNull(),
}, (table) => ({
  userCosmeticIdx: index("user_cosmetic_idx").on(table.userId, table.cosmeticId),
}));

// ==========================================
// PHASE 12 - ACHIEVEMENTS
// ==========================================
export const achievements = sqliteTable("achievements", {
  id: text("id").primaryKey(),
  code: text("code").notNull().unique(), // ARTIST, SHERLOCK, SPEED_DEMON, TRICKSTER, COLLECTOR, MASTER_SPIRIT
  name: text("name").notNull(),
  description: text("description").notNull(),
  category: text("category").notNull(),
  rewardCoins: integer("reward_coins").notNull(),
  rewardXp: integer("reward_xp").notNull(),
  icon: text("icon").notNull(),
});

export const userAchievements = sqliteTable("user_achievements", {
  id: text("id").primaryKey(),
  userId: text("user_id").notNull().references(() => users.id),
  achievementCode: text("achievement_code").notNull().references(() => achievements.code),
  unlockedAt: integer("unlocked_at", { mode: "timestamp" }).default(sql`(strftime('%s', 'now'))`).notNull(),
}, (table) => ({
  userAchievementIdx: index("user_achievement_idx").on(table.userId, table.achievementCode),
}));

// ==========================================
// PHASE 12 - SEASONAL EVENTS
// ==========================================
export const seasonalEvents = sqliteTable("seasonal_events", {
  id: text("id").primaryKey(),
  code: text("code").notNull().unique(), // e.g., TET_FESTIVAL, MOON_FESTIVAL, SOLAR_ECLIPSE
  name: text("name").notNull(),
  theme: text("theme").notNull(),
  description: text("description").notNull(),
  startDate: text("start_date").notNull(), // ISO Date
  endDate: text("end_date").notNull(),
  currencyName: text("currency_name").notNull(), // e.g. "Ngọc Tết", "Ngọc Trăng"
  isActive: integer("is_active", { mode: "boolean" }).default(true).notNull(),
  createdAt: integer("created_at", { mode: "timestamp" }).default(sql`(strftime('%s', 'now'))`).notNull(),
});

// ==========================================
// PHASE 13 - BATTLE PASS
// ==========================================
export const battlePasses = sqliteTable("battle_passes", {
  id: text("id").primaryKey(),
  seasonNumber: integer("season_number").notNull().unique(),
  name: text("name").notNull(),
  maxTier: integer("max_tier").default(20).notNull(),
  startDate: text("start_date").notNull(),
  endDate: text("end_date").notNull(),
  priceCoins: integer("price_coins").default(1000).notNull(),
});

export const battlePassProgress = sqliteTable("battle_pass_progress", {
  id: text("id").primaryKey(),
  userId: text("user_id").notNull().references(() => users.id),
  seasonNumber: integer("season_number").notNull(),
  currentTier: integer("current_tier").default(1).notNull(),
  currentXp: integer("current_xp").default(0).notNull(),
  isPremiumPurchased: integer("is_premium_purchased", { mode: "boolean" }).default(false).notNull(),
  claimedFreeTiers: text("claimed_free_tiers", { mode: "json" }).default([]).notNull(), // number[]
  claimedPremiumTiers: text("claimed_premium_tiers", { mode: "json" }).default([]).notNull(), // number[]
  updatedAt: integer("updated_at", { mode: "timestamp" }).default(sql`(strftime('%s', 'now'))`).notNull(),
}, (table) => ({
  userBattlePassIdx: index("user_bp_idx").on(table.userId, table.seasonNumber),
}));

// ==========================================
// ADDITIONAL RELATIONS
// ==========================================
export const cosmeticsRelations = relations(cosmetics, ({ many }) => ({
  userCosmetics: many(userCosmetics),
}));

export const userCosmeticsRelations = relations(userCosmetics, ({ one }) => ({
  cosmetic: one(cosmetics, {
    fields: [userCosmetics.cosmeticId],
    references: [cosmetics.id],
  }),
  user: one(users, {
    fields: [userCosmetics.userId],
    references: [users.id],
  }),
}));

export const achievementsRelations = relations(achievements, ({ many }) => ({
  userAchievements: many(userAchievements),
}));

export const userAchievementsRelations = relations(userAchievements, ({ one }) => ({
  achievement: one(achievements, {
    fields: [userAchievements.achievementCode],
    references: [achievements.code],
  }),
  user: one(users, {
    fields: [userAchievements.userId],
    references: [users.id],
  }),
}));
