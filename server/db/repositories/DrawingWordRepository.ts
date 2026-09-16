import { db } from '../index';
import { drawingWords } from '../schema';
import { eq, sql, and } from 'drizzle-orm';

export class DrawingWordRepository {
  static async getRandomWord(category?: string, difficulty?: string) {
    const conditions = [eq(drawingWords.isActive, true)];
    if (category && category !== 'ALL') {
      conditions.push(eq(drawingWords.category, category));
    }
    if (difficulty && difficulty !== 'ALL') {
      conditions.push(eq(drawingWords.difficulty, difficulty));
    }

    const words = await db.select()
      .from(drawingWords)
      .where(and(...conditions))
      .orderBy(sql`RANDOM()`)
      .limit(1);

    return words[0] || null;
  }

  static async getRandomWords(count: number, category?: string) {
    const conditions = [eq(drawingWords.isActive, true)];
    if (category && category !== 'ALL') {
      conditions.push(eq(drawingWords.category, category));
    }

    return await db.select()
      .from(drawingWords)
      .where(and(...conditions))
      .orderBy(sql`RANDOM()`)
      .limit(count);
  }

  static async getAllCategories(): Promise<string[]> {
    const result = await db.selectDistinct({ category: drawingWords.category })
      .from(drawingWords)
      .where(eq(drawingWords.isActive, true));

    return result.map(r => r.category);
  }

  static async getWordById(id: string) {
    const result = await db.select()
      .from(drawingWords)
      .where(eq(drawingWords.id, id))
      .limit(1);

    return result[0] || null;
  }
}
