export type GameMode = 
  | 'DRAW_GUESS'
  | 'DRAW_BATTLE'
  | 'GUESS_RUSH'
  | 'BLUFF'
  | 'SPIRIT_RACE'
  | 'RANDOM';

export const OFFICIAL_GAME_MODES: readonly GameMode[] = [
  'DRAW_GUESS',
  'DRAW_BATTLE',
  'GUESS_RUSH',
  'BLUFF',
  'SPIRIT_RACE',
  'RANDOM'
] as const;

export function normalizeGameMode(raw: unknown): GameMode | null {
  if (typeof raw !== 'string' || !raw.trim()) return null;
  const clean = raw.trim().toUpperCase().replace(/[-\s]+/g, '_');
  
  if (clean === 'DRAW_AND_GUESS' || clean === 'DRAW' || clean === 'DRAWING' || clean === 'VE_DOAN') {
    return 'DRAW_GUESS';
  }
  if (clean === 'BATTLE' || clean === 'DRAW_BATTLE' || clean === 'VE_DOI_KHANG') {
    return 'DRAW_BATTLE';
  }
  if (clean === 'RUSH' || clean === 'GUESS' || clean === 'GUESS_RUSH' || clean === 'DOAN_TOC_DO') {
    return 'GUESS_RUSH';
  }
  if (clean === 'BLUFF' || clean === 'BAY_LUA') {
    return 'BLUFF';
  }
  if (clean === 'RACE' || clean === 'SPIRIT_RACE' || clean === 'DUA_LINH_THU') {
    return 'SPIRIT_RACE';
  }
  if (clean === 'RANDOM' || clean === 'NGAU_NHIEN') {
    return 'RANDOM';
  }

  const direct = OFFICIAL_GAME_MODES.find(m => m === clean);
  return direct || null;
}
