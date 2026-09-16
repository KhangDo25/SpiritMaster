import 'dotenv/config';
import { getMysqlPool, checkMysqlConnection, ensureMysqlAuthTables, mysqlStatus } from './mysql';
import { MysqlUserStore, mysqlAuthActive } from './repositories/MysqlUserStore';
import { UserRepository } from './repositories/UserRepository';
import { UserProfileRepository } from './repositories/UserProfileRepository';

/**
 * Test-account seeding (opt-in, never implicit).
 *
 * Purpose: give QA a couple of REAL accounts that behave exactly like a
 * freshly registered user (profile created, coins 0, zero spirits, zero
 * progress). Nothing is faked: rows are written to the ACTIVE auth store
 * (Aiven MySQL when configured, local dev store otherwise) and the password
 * is stored as a bcrypt hash only.
 *
 * Enable with:
 *   SEED_TEST_USERS="khang,thư"
 *   SEED_TEST_PASSWORD="882003"
 *
 * Behaviour:
 *  - Runs at server start (see server.ts) against the active auth store.
 *  - Also runnable standalone: npm run db:seed:test.
 *  - Idempotent: existing accounts are skipped, never overwritten.
 *  - Refuses to run when NODE_ENV=production unless
 *    ALLOW_TEST_SEED_IN_PRODUCTION=true is set deliberately.
 *  - Passwords are NEVER logged, returned, or stored in plaintext.
 */

export interface TestAccountSpec {
  username: string;
  email: string;
}

export interface TestSeedResult {
  target: 'Aiven MySQL' | 'Local dev store';
  created: string[];
  existing: string[];
  failed: { username: string; reason: string }[];
  skipped: string;
}

const DEFAULT_EMAIL_DOMAIN = 'linhthuhoi.com';

function isProduction(): boolean {
  return String(process.env.NODE_ENV || '').toLowerCase() === 'production';
}

function stripDiacritics(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'D');
}

/** "thư" -> "thu" so the derived email address stays RFC-friendly. */
function toSafeEmailLocalPart(username: string): string {
  const ascii = stripDiacritics(username).toLowerCase().replace(/[^a-z0-9._-]/g, '');
  return ascii.length > 0 ? ascii : `player${Date.now()}`;
}

/** Accepts "khang,thư" or "khang|khang@x.com,thư|thu@x.com". */
export function parseTestAccountSpecs(raw: string, emailDomain: string): TestAccountSpec[] {
  const specs: TestAccountSpec[] = [];
  const seen = new Set<string>();

  for (const entry of String(raw || '').split(',').map((s) => s.trim()).filter(Boolean)) {
    const [rawName, rawEmail] = entry.split('|').map((s) => s.trim());
    if (!rawName) continue;
    const dedupeKey = rawName.toLowerCase();
    if (seen.has(dedupeKey)) continue;
    seen.add(dedupeKey);
    specs.push({
      username: rawName,
      email: (rawEmail || `${toSafeEmailLocalPart(rawName)}@${emailDomain}`).toLowerCase(),
    });
  }

  return specs;
}

function targetLabel(): 'Aiven MySQL' | 'Local dev store' {
  return mysqlAuthActive() ? 'Aiven MySQL' : 'Local dev store';
}

/**
 * Creates the configured test accounts in the active auth store.
 * Safe to call on every boot: existing accounts are left untouched.
 */
export async function seedTestUsers(): Promise<TestSeedResult> {
  const rawUsers = String(process.env.SEED_TEST_USERS || '').trim();
  const password = String(process.env.SEED_TEST_PASSWORD || '');

  const result: TestSeedResult = {
    target: targetLabel(),
    created: [],
    existing: [],
    failed: [],
    skipped: '',
  };

  if (!rawUsers || !password) {
    result.skipped = 'SEED_TEST_USERS / SEED_TEST_PASSWORD not set - no test accounts seeded.';
    return result;
  }

  if (password.length < 6) {
    result.skipped = 'SEED_TEST_PASSWORD is shorter than 6 characters - refusing to create weak test accounts.';
    return result;
  }

  if (isProduction() && String(process.env.ALLOW_TEST_SEED_IN_PRODUCTION || '').toLowerCase() !== 'true') {
    result.skipped = 'Refused: NODE_ENV=production (set ALLOW_TEST_SEED_IN_PRODUCTION=true to override deliberately).';
    return result;
  }

  const emailDomain = String(process.env.SEED_TEST_EMAIL_DOMAIN || DEFAULT_EMAIL_DOMAIN).trim() || DEFAULT_EMAIL_DOMAIN;
  const specs = parseTestAccountSpecs(rawUsers, emailDomain);
  if (specs.length === 0) {
    result.skipped = 'SEED_TEST_USERS contained no usable usernames.';
    return result;
  }

  const useMysql = mysqlAuthActive();
  result.target = targetLabel();

  for (const spec of specs) {
    try {
      const existing = useMysql
        ? (await MysqlUserStore.findByUsername(spec.username)) || (await MysqlUserStore.findByEmail(spec.email))
        : (await UserRepository.findByUsername(spec.username)) || (await UserRepository.findByEmail(spec.email));

      if (existing) {
        result.existing.push(spec.username);
        console.log(`[TestSeed] Account '${spec.username}' already exists on ${result.target} - skipped (untouched).`);
        continue;
      }

      if (useMysql) {
        // MysqlUserStore hashes with bcrypt cost 12 and maps duplicate-key races to 409.
        const userId = await MysqlUserStore.create({ username: spec.username, email: spec.email, password });
        await MysqlUserStore.createProfile(userId, spec.username);
      } else {
        // Local dev store. UserRepository hashes with bcrypt cost 12.
        const userId = await UserRepository.createUser({
          id: '',
          username: spec.username,
          email: spec.email,
          passwordHash: password,
          status: 'ACTIVE',
          createdAt: new Date(),
          updatedAt: new Date(),
        } as any);
        await UserProfileRepository.createProfile(userId, spec.username);
      }

      result.created.push(spec.username);
      console.log(
        `[TestSeed] Created '${spec.username}' (${spec.email}) on ${result.target} - brand-new state: coins 0, no spirits, no progress.`
      );
    } catch (err: any) {
      const reason = String(err?.message || err);
      result.failed.push({ username: spec.username, reason });
      console.warn(`[TestSeed] Could not create '${spec.username}': ${reason}`);
    }
  }

  console.log(
    `[TestSeed] Summary (${result.target}): created=${result.created.length}, existing=${result.existing.length}, failed=${result.failed.length}. Passwords stored as bcrypt hashes only.`
  );

  return result;
}

async function runCli(): Promise<void> {
  const rawUsers = String(process.env.SEED_TEST_USERS || '').trim();
  if (!rawUsers) {
    console.error(
      '[TestSeed] SEED_TEST_USERS is required. Example:\n' +
        '  SEED_TEST_USERS="khang,thư" SEED_TEST_PASSWORD="882003" npm run db:seed:test'
    );
    process.exit(1);
  }

  if (getMysqlPool()) {
    const connected = await checkMysqlConnection();
    if (!connected) {
      console.error(
        `[TestSeed] Cannot reach Aiven MySQL (${mysqlStatus.host}/${mysqlStatus.database}): ` +
          `${mysqlStatus.lastError || 'unknown error'}. Aborting - refusing to silently write accounts elsewhere.`
      );
      process.exit(1);
    }
    await ensureMysqlAuthTables();
    console.log(`[TestSeed] Connected to Aiven MySQL (${mysqlStatus.host}/${mysqlStatus.database}, TLS=${mysqlStatus.tls}).`);
  } else if (!String(process.env.DEV_SQLITE_PATH || '').trim()) {
    console.error(
      '[TestSeed] MySQL is not configured and the local dev store is in-memory, so a standalone seed run\n' +
        'would be discarded when this process exits.\n' +
        '  - Aiven MySQL: set DATABASE_URL (or MYSQL_*) and re-run.\n' +
        '  - Local QA: keep SEED_TEST_USERS/SEED_TEST_PASSWORD set and start the game server\n' +
        '    (accounts are seeded at boot), or set DEV_SQLITE_PATH to a file for a persistent dev store.'
    );
    process.exit(1);
  } else {
    console.warn('[TestSeed] MySQL not configured - seeding the file-backed local dev store (DEV_SQLITE_PATH).');
  }

  const result = await seedTestUsers();
  if (result.skipped) console.warn(`[TestSeed] ${result.skipped}`);
  const ok = result.failed.length === 0 && (result.created.length + result.existing.length) > 0;
  process.exit(ok ? 0 : 1);
}

const invokedDirectly = /\/seedTestUsers\.(ts|mts|cts|js|mjs|cjs)$/.test(
  String(process.argv[1] || '').replace(/\\/g, '/')
);

if (invokedDirectly) {
  runCli().catch((err) => {
    console.error('[TestSeed] Failed:', err?.message || err);
    process.exit(1);
  });
}