import { defineConfig } from "drizzle-kit";
import * as dotenv from "dotenv";

dotenv.config();

// AUTH source of truth is Aiven MySQL (server/db/mysql.ts ensures tables).
// The legacy sqlite drizzle schema below only backs non-auth game catalog
// data in local dev; keep sqlite dialect so existing migrations keep working.
export default defineConfig({
  schema: "./server/db/schema.ts",
  out: "./server/db/migrations",
  dialect: "sqlite",
  dbCredentials: {
    url: "sqlite.db",
  },
});
