import { db } from "../index";
import { users } from "../schema";
import { eq } from "drizzle-orm";
import bcrypt from "bcryptjs";
import { BusinessException } from "../../errors/BusinessException";
import { v4 as uuidv4 } from "uuid";

export class UserRepository {
  static async findByUsername(username: string) {
    return db.query.users.findFirst({
      where: eq(users.username, username),
    });
  }

  static async findByEmail(email: string) {
    return db.query.users.findFirst({
      where: eq(users.email, email),
    });
  }

  static async createUser(data: typeof users.$inferInsert) {
    // Check constraints (fast-path friendly errors; DB unique index is the
    // real race-condition guard and is mapped to 409 — see errorHandler).
    const existingUsername = await this.findByUsername(data.username);
    if (existingUsername) throw new BusinessException("Username already exists", 409, "USER_EXISTS");

    const existingEmail = await this.findByEmail(data.email);
    if (existingEmail) throw new BusinessException("Email already exists", 409, "EMAIL_EXISTS");

    // Enforce no plaintext
    const salt = await bcrypt.genSalt(12);
    const passwordHash = await bcrypt.hash(data.passwordHash, salt);

    const id = data.id || uuidv4();

    try {
      await db.insert(users).values({
        ...data,
        id,
        passwordHash,
      });
    } catch (err: any) {
      const msg = String(err?.message || '');
      if (msg.includes('UNIQUE constraint failed: users.email')) {
        throw new BusinessException("Email already exists", 409, "EMAIL_EXISTS");
      }
      if (msg.includes('UNIQUE constraint failed: users.username')) {
        throw new BusinessException("Username already exists", 409, "USER_EXISTS");
      }
      throw err;
    }

    return id;
  }
}
