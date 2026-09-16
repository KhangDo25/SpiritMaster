import 'dotenv/config';
import express, { Request, Response, NextFunction } from "express";
import path from "path";
import cors from "cors";
import cookieParser from "cookie-parser";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import { createServer as createViteServer } from "vite";
import { createServer } from "http";
import { Server } from "socket.io";
import { errorHandler } from "./server/middlewares/errorHandler";
import { apiResponse } from "./server/utils/response";
import { authRouter } from "./server/routes/auth.routes";
import { spiritRouter } from "./server/routes/spirit.routes";
import { sessionRouter } from "./server/routes/session.routes";
import { mysteryRouter } from "./server/routes/mystery.routes";
import { dailyQuestsRouter } from "./server/routes/daily-quests.routes";
import { collectionRouter } from "./server/routes/collection.routes";
import { dailyMysteryRouter } from "./server/routes/daily-mystery.routes";
import { roomRouter } from "./server/routes/room.routes";
import { achievementRouter } from "./server/routes/achievement.routes";
import { leaderboardRouter } from "./server/routes/leaderboard.routes";
import { eventsRouter } from "./server/routes/events.routes";
import { shopRouter } from "./server/routes/shop.routes";
import { battlePassRouter } from "./server/routes/battlepass.routes";
import { profileRouter } from "./server/routes/profile.routes";
import { setupSocketIO } from "./server/socket";
import { seedDemoUsers } from "./server/db/seedDemoUsers";
import { seedTestUsers } from "./server/db/seedTestUsers";
import { seedAll } from "./server/db/seedAll";
import { dbStatus } from "./server/db";
import { mysqlStatus, checkMysqlConnection, ensureMysqlAuthTables, getMysqlPool } from "./server/db/mysql";
import { ValkeyService } from "./server/services/valkey.service";

function shouldSeedDemoUsers(): boolean {
  return String(process.env.SEED_DEMO_USERS || '').toLowerCase() === 'true';
}

async function startServer() {
  const app = express();
  const server = createServer(app);
  const PORT = Number(process.env.PORT) || 3000;
  
  // Setup Socket.IO
  const io = new Server(server, {
    cors: {
      origin: process.env.CORS_ALLOWED_ORIGINS?.split(",") || ["http://localhost:3000"],
      credentials: true
    }
  });
  
  setupSocketIO(io);

  // Ensure database tables, catalog data and demo accounts are seeded BEFORE handling requests
  try {
    await seedAll();
    if (getMysqlPool()) {
      await checkMysqlConnection();
      await ensureMysqlAuthTables();
      console.log("[Database] Aiven MySQL auth tables verified (users, user_profiles).");
    }
    if (shouldSeedDemoUsers()) {
      await seedDemoUsers();
      console.log("[Database] Demo users seeded (SEED_DEMO_USERS=true).");
    } else {
      console.log("[Database] Demo-user seeding skipped (production auth uses real accounts only).");
    }
    // Opt-in QA accounts: real rows in the active auth store, brand-new state.
    // Self-gated by SEED_TEST_USERS / SEED_TEST_PASSWORD (see seedTestUsers.ts).
    await seedTestUsers();
    console.log("[Database] All catalogs seeded successfully.");
  } catch (err) {
    console.error("[Database] Seeding notice:", err);
  }

  app.set('trust proxy', 1); // Trust first proxy for rate limiter

  // Security Baseline
  app.use(helmet({
    contentSecurityPolicy: false, // Don't block Vite development scripts or external game assets
  }));

  app.use(cookieParser());
  
  app.use(express.json());
  
  // CORS setup
  const allowedOrigins = process.env.CORS_ALLOWED_ORIGINS?.split(",") || ["http://localhost:3000"];
  app.use(cors({
    origin: allowedOrigins,
    credentials: true,
  }));

  // Rate limiting foundation (100 requests per 15 minutes)
  const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, 
    max: 100, 
    message: { success: false, message: "Too many requests, please try again later.", errorCode: "RATE_LIMIT_EXCEEDED" }
  });
  app.use("/api/auth", limiter);

  // API Health Check
  app.get("/api/health", async (req, res) => {
    const mysqlOk = getMysqlPool() ? await checkMysqlConnection() : false;
    const valkey = ValkeyService.valkeyStatus();
    res.json(apiResponse(true, "Application is healthy", {
      status: "UP",
      timestamp: new Date().toISOString(),
      database: dbStatus,
      mysql: {
        configured: mysqlStatus.configured,
        connected: mysqlOk,
        host: mysqlStatus.configured ? mysqlStatus.host : 'not-configured',
        database: mysqlStatus.configured ? mysqlStatus.database : 'not-configured',
        tls: mysqlStatus.tls,
        ...(mysqlStatus.lastError ? { error: mysqlStatus.lastError } : {}),
      },
      valkey: {
        configured: valkey.configured,
        connected: valkey.connected,
        mode: valkey.connected ? "Aiven Valkey Cluster" : "In-Memory High-Speed Cache Fallback"
      }
    }));
  });

  // Auth Routes
  app.use("/api/auth", authRouter);
  
  // Game Routes
  app.use("/api/spirits", spiritRouter);
  app.use("/api/sessions", sessionRouter);
  app.use("/api/mystery", mysteryRouter);
  app.use("/api/quests", dailyQuestsRouter);
  app.use("/api/collection", collectionRouter);
  app.use("/api/daily-mystery", dailyMysteryRouter);
  app.use("/api/rooms", roomRouter);
  app.use("/api/achievements", achievementRouter);
  app.use("/api/leaderboard", leaderboardRouter);
  app.use("/api/events", eventsRouter);
  app.use("/api/shop", shopRouter);
  app.use("/api/battlepass", battlePassRouter);
  app.use("/api/profile", profileRouter);

  // Global Error Handler
  app.use(errorHandler);

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  server.listen(Number(PORT), "0.0.0.0", () => {
    console.log(`Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();

