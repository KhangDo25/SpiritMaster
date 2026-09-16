import { z } from 'zod';
import { normalizeGameMode, OFFICIAL_GAME_MODES } from '../types/gameMode';

export const createRoomSchema = z.preprocess((val: any) => {
  if (typeof val === 'object' && val !== null) {
    const data = { ...val };
    // Alias rounds -> maxRounds
    if (data.rounds !== undefined && data.maxRounds === undefined) {
      data.maxRounds = Number(data.rounds);
    }
    // Alias time/roundTime -> roundTimeSeconds
    if (data.time !== undefined && data.roundTimeSeconds === undefined) {
      data.roundTimeSeconds = Number(data.time);
    } else if (data.roundTime !== undefined && data.roundTimeSeconds === undefined) {
      data.roundTimeSeconds = Number(data.roundTime);
    }
    return data;
  }
  return val;
}, z.object({
  mode: z.string().min(1, "Vui lòng chọn chế độ chơi (mode)").refine((val) => normalizeGameMode(val) !== null, {
    message: `Chế độ chơi không hợp lệ. Các chế độ hợp lệ: ${OFFICIAL_GAME_MODES.join(', ')}`
  }).transform((val) => normalizeGameMode(val)!),
  theme: z.string().default('forest_1'),
  maxRounds: z.coerce.number().int().min(1, "Số vòng tối thiểu là 1").max(10, "Số vòng tối đa là 10").default(3),
  roundTimeSeconds: z.coerce.number().int().min(20, "Thời gian mỗi vòng tối thiểu 20 giây").max(300, "Thời gian mỗi vòng tối đa 300 giây").default(60),
  maxPlayers: z.coerce.number().int().min(2, "Số người chơi tối thiểu là 2").max(16, "Số người chơi tối đa là 16").default(12),
}));

export const joinRoomSchema = z.object({
  code: z.string().min(4).max(6).toUpperCase(),
});
