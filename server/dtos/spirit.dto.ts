import { z } from 'zod';

export const selectStarterSchema = z.object({
  spiritId: z.string().min(1, "Spirit ID is required"),
});
