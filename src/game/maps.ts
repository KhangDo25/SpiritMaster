import { ArenaThemeConfig, ArenaThemeId } from './types';

export const ARENA_THEMES: Record<ArenaThemeId, ArenaThemeConfig> = {
  forest: {
    id: 'forest',
    name: 'Spirit Forest Arena',
    vietnameseName: 'Võ Đài Rừng Thiêng Mộc Linh',
    description: 'Sàn đấu cỏ xanh cổ thụ, đài đá rêu phong lưu lại ngàn năm linh khí thiên nhiên.',
    floorColor: '#062015',
    gridColor: '#0a3322',
    wallColor: '#105238',
    accentColor: '#10B981',
    ambientParticleColor: '#34D399'
  },
  fire: {
    id: 'fire',
    name: 'Infernal Volcano Arena',
    vietnameseName: 'Đấu Trường Nham Sơn Hỏa Diệm',
    description: 'Đất đá nứt nẻ rực lửa nham thạch, linh khí hỏa bốc lên cuồn cuộn nóng bỏng.',
    floorColor: '#1c0804',
    gridColor: '#331008',
    wallColor: '#6e1d0d',
    accentColor: '#F97316',
    ambientParticleColor: '#FB923C'
  },
  frost: {
    id: 'frost',
    name: 'Frozen Glacier Arena',
    vietnameseName: 'Băng Nguyên Tuyết Giới Cổ Đại',
    description: 'Bề mặt băng tuyết vĩnh cửu phản chiếu tinh tú lấp lánh giá lạnh buốt giá.',
    floorColor: '#051b24',
    gridColor: '#0c2d3b',
    wallColor: '#154e66',
    accentColor: '#06B6D4',
    ambientParticleColor: '#38BDF8'
  },
  shadow: {
    id: 'shadow',
    name: 'Nether Shadow Arena',
    vietnameseName: 'U Minh Vực Sâu Huyền Ảo',
    description: 'Bóng tối vĩnh hằng bao trùm với những luồng khói tím u mịch huyền bí.',
    floorColor: '#13091f',
    gridColor: '#1f1033',
    wallColor: '#431878',
    accentColor: '#A855F7',
    ambientParticleColor: '#C084FC'
  },
  celestial: {
    id: 'celestial',
    name: 'Celestial Shrine Arena',
    vietnameseName: 'Thánh Quang Điện Thần Cổ',
    description: 'Đá cẩm thạch thiêng liêng dát viền vàng kim, ngập tràn hào quang phúc thần.',
    floorColor: '#1a1608',
    gridColor: '#2e240c',
    wallColor: '#634b12',
    accentColor: '#F59E0B',
    ambientParticleColor: '#FDE047'
  }
};

export const ARENA_THEME_LIST = Object.values(ARENA_THEMES);

export function resolveArenaTheme(idOrName: string): ArenaThemeConfig {
  const normalized = (idOrName || '').toLowerCase();
  if (normalized.includes('fire') || normalized.includes('volcano') || normalized.includes('hỏa')) return ARENA_THEMES.fire;
  if (normalized.includes('frost') || normalized.includes('ocean') || normalized.includes('băng') || normalized.includes('thủy')) return ARENA_THEMES.frost;
  if (normalized.includes('shadow') || normalized.includes('u minh') || normalized.includes('ảnh')) return ARENA_THEMES.shadow;
  if (normalized.includes('celestial') || normalized.includes('thánh') || normalized.includes('quang')) return ARENA_THEMES.celestial;
  return ARENA_THEMES.forest;
}

// Backward compatibility aliases
export const MAPS = ARENA_THEMES;
export const REALMS = ARENA_THEMES;
export const REALM_LIST = ARENA_THEME_LIST;
export const resolveRealm = resolveArenaTheme;
