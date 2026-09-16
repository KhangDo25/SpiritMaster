import { z } from 'zod';

export const guessSchema = z.object({
  guessText: z.string().min(1, "Guess is required").max(100, "Guess is too long"),
});
