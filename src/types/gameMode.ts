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

export interface GameModeMeta {
  id: GameMode;
  label: string;
  enLabel: string;
  desc: string;
  badge: string;
  colorClass: string;
}

export const GAME_MODE_CONFIG: Record<GameMode, GameModeMeta> = {
  DRAW_GUESS: {
    id: 'DRAW_GUESS',
    label: 'Vẽ & Đoán',
    enLabel: 'Draw & Guess',
    desc: 'Họa sĩ luân phiên vẽ nét cọ mượt mà, thần sứ cùng đoán từ khóa',
    badge: 'Kinh Điển',
    colorClass: 'border-rose-500 bg-rose-950/40 text-rose-300'
  },
  DRAW_BATTLE: {
    id: 'DRAW_BATTLE',
    label: 'Vẽ Đối Kháng',
    enLabel: 'Draw Battle',
    desc: '2 họa sĩ song đấu vẽ cùng chủ đề trên 2 bảng vẽ, khán giả bình chọn',
    badge: 'Đối Kháng',
    colorClass: 'border-amber-500 bg-amber-950/40 text-amber-300'
  },
  GUESS_RUSH: {
    id: 'GUESS_RUSH',
    label: 'Đoán Tốc Độ',
    enLabel: 'Guess Rush',
    desc: 'Gợi ý hé lộ dần từng giây, ai phản xạ nhanh nhất giành điểm số tối đa',
    badge: 'Siêu Tốc',
    colorClass: 'border-yellow-500 bg-yellow-950/40 text-yellow-300'
  },
  BLUFF: {
    id: 'BLUFF',
    label: 'Bẫy Lừa Bí Ẩn',
    enLabel: 'Bluff',
    desc: 'Tạo đáp án giả thuyết phục để lừa đối thủ và tìm ra chân lý thật sự',
    badge: 'Trí Tuệ',
    colorClass: 'border-purple-500 bg-purple-950/40 text-purple-300'
  },
  SPIRIT_RACE: {
    id: 'SPIRIT_RACE',
    label: 'Đua Linh Thú',
    enLabel: 'Spirit Race',
    desc: 'Điều khiển linh thú né chướng ngại vật, nhặt xu chạy đua về đích 2000m',
    badge: 'Đua Thú',
    colorClass: 'border-emerald-500 bg-emerald-950/40 text-emerald-300'
  },
  RANDOM: {
    id: 'RANDOM',
    label: 'Ngẫu Nhiên',
    enLabel: 'Random',
    desc: 'Hệ thống tự động xoay tua các chế độ thi đấu mỗi vòng đấu bất ngờ',
    badge: 'Hỗn Hợp',
    colorClass: 'border-cyan-500 bg-cyan-950/40 text-cyan-300'
  }
};

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

export function formatGameModeDisplay(mode: string | undefined | null): string {
  const normalized = normalizeGameMode(mode);
  if (!normalized) return mode || 'Không xác định';
  const meta = GAME_MODE_CONFIG[normalized];
  return `${meta.enLabel} (${meta.label})`;
}
