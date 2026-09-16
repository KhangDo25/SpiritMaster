import { z } from 'zod';

export const startSessionSchema = z.object({
  mapId: z.string().default('forest_1'),
  sessionType: z.enum(["NORMAL", "BOSS"]).optional(),
});

export const endSessionSchema = z.object({
  sessionId: z.string().min(1, "Session ID is required"),
  status: z.enum(['COMPLETED', 'ABANDONED']),
  claimedScore: z.number().int().min(0),
  claimedHints: z.number().int().min(0),
  claimedCoins: z.number().int().min(0).default(0),
  bossPhase: z.number().int().min(0).optional(),
});
