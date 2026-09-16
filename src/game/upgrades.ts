import { UpgradeDef } from './types';

export const UPGRADE_POOL: UpgradeDef[] = [
  // --- ATTACK UPGRADES ---
  {
    id: 'attack_damage',
    name: 'Sức Mạnh Linh Lực (Spirit Might)',
    category: 'ATTACK',
    rarity: 'COMMON',
    description: 'Tăng 25% sát thương cơ bản của mọi đòn tấn công.',
    icon: 'Sword',
    maxLevel: 5,
    tags: ['attack', 'damage'],
    apply: (player, level) => {
      player.attackDamage += 6;
    }
  },
  {
    id: 'attack_speed',
    name: 'Phong Bạo Liên Hoàn (Rapid Strike)',
    category: 'ATTACK',
    rarity: 'COMMON',
    description: 'Tốc độ xuất chiêu tăng thêm 22%.',
    icon: 'Zap',
    maxLevel: 4,
    tags: ['attack', 'speed'],
    apply: (player, level) => {
      player.attackSpeed += 0.45;
    }
  },
  {
    id: 'multi_shot',
    name: 'Phân Thân Tinh Tú (Multi-Shot)',
    category: 'ATTACK',
    rarity: 'RARE',
    description: 'Bắn thêm +1 tia đạn mỗi lần tấn công theo hình cánh quạt.',
    icon: 'Sparkles',
    maxLevel: 3,
    tags: ['attack', 'projectile'],
    apply: (player, level) => {
      player.projectileCount += 1;
    }
  },
  {
    id: 'crit_chance',
    name: 'Chí Mạng Đoạt Mệnh (Fatal Precision)',
    category: 'ATTACK',
    rarity: 'COMMON',
    description: 'Tăng 15% tỷ lệ chí mạng và +25% sát thương chí mạng.',
    icon: 'Crosshair',
    maxLevel: 4,
    tags: ['attack', 'crit'],
    apply: (player, level) => {
      player.critChance += 0.15;
      player.critDamage += 0.25;
    }
  },
  {
    id: 'lightning_chain',
    name: 'Lôi Đình Liên Tỏa (Lightning Chain)',
    category: 'ELEMENT',
    rarity: 'RARE',
    description: 'Đòn đánh phóng tia sét giật lan sang thêm 1 kẻ địch lân cận.',
    icon: 'Zap',
    maxLevel: 3,
    tags: ['lightning', 'chain'],
    apply: (player, level) => {
      player.chainCount += 1;
    }
  },
  {
    id: 'chain_damage',
    name: 'Lôi Điện Cuồng Bạo (Chain Surge)',
    category: 'ELEMENT',
    rarity: 'EPIC',
    description: 'Sét lan giật mạnh hơn 50% và đánh thêm 1 mục tiêu (Yêu cầu có Lôi Đình Liên Tỏa).',
    icon: 'Activity',
    maxLevel: 2,
    tags: ['lightning', 'chain'],
    apply: (player, level) => {
      player.chainCount += 1;
      player.attackDamage += 8;
    }
  },

  // --- ELEMENT UPGRADES ---
  {
    id: 'burning_aura',
    name: 'Hỏa Giới Thiêu Đốt (Burning Aura)',
    category: 'ELEMENT',
    rarity: 'RARE',
    description: 'Tạo vòng lửa xung quanh người chơi liên tục thiêu đốt quái lại gần.',
    icon: 'Flame',
    maxLevel: 4,
    tags: ['fire', 'aura'],
    apply: (player, level) => {
      player.burningAuraDamage += 12;
      player.burningAuraRadius = Math.max(player.burningAuraRadius, 75) + 15;
    }
  },
  {
    id: 'fire_damage_boost',
    name: 'Hỏa Diệm Nộ (Blazing Wrath)',
    category: 'ELEMENT',
    rarity: 'EPIC',
    description: 'Tăng 60% sát thương thiêu đốt và đốt cháy kẻ địch khi trúng đòn.',
    icon: 'Flame',
    maxLevel: 3,
    tags: ['fire', 'burn'],
    apply: (player, level) => {
      player.burningAuraDamage += 16;
      player.attackDamage += 5;
    }
  },
  {
    id: 'frost_bite',
    name: 'Hàn Băng Thấu Xương (Frostbite)',
    category: 'ELEMENT',
    rarity: 'RARE',
    description: 'Đòn đánh có 35% cơ hội làm chậm 50% và đóng băng quái trong 1.5s.',
    icon: 'Snowflake',
    maxLevel: 3,
    tags: ['ice', 'freeze'],
    apply: (player, level) => {
      player.frostFreezeChance += 0.25;
    }
  },
  {
    id: 'shadow_strike',
    name: 'U Ảnh Đoạt Phách (Shadow Piercer)',
    category: 'ELEMENT',
    rarity: 'EPIC',
    description: 'Đạn bắn xuyên thấu qua mọi kẻ địch trên đường bay và tăng 20% sát thương.',
    icon: 'Moon',
    maxLevel: 2,
    tags: ['shadow', 'pierce'],
    apply: (player, level) => {
      player.attackDamage += 8;
    }
  },

  // --- DEFENSE UPGRADES ---
  {
    id: 'max_hp',
    name: 'Sinh Mệnh Trường Tồn (Vitality Boost)',
    category: 'DEFENSE',
    rarity: 'COMMON',
    description: 'Tăng 35 Máu Tối Đa và hồi phục ngay lập tức 35 Máu.',
    icon: 'Heart',
    maxLevel: 5,
    tags: ['defense', 'hp'],
    apply: (player, level) => {
      player.maxHp += 35;
      player.hp = Math.min(player.maxHp, player.hp + 35);
    }
  },
  {
    id: 'spirit_shield',
    name: 'Linh Thể Hộ Giáp (Spirit Aegis)',
    category: 'DEFENSE',
    rarity: 'RARE',
    description: 'Tạo 1 lớp lá chắn hấp thụ 1 lần sát thương bất kỳ, tự hồi phục sau 12 giây.',
    icon: 'Shield',
    maxLevel: 3,
    tags: ['defense', 'shield'],
    apply: (player, level) => {
      player.maxShield += 1;
      player.shield += 1;
    }
  },
  {
    id: 'thorn_armor',
    name: 'Gai Nhọn Phản Phệ (Spiked Carapace)',
    category: 'DEFENSE',
    rarity: 'COMMON',
    description: 'Kẻ địch chạm vào người chơi chịu 30 sát thương phản đòn.',
    icon: 'ShieldAlert',
    maxLevel: 3,
    tags: ['defense', 'thorn'],
    apply: (player, level) => {
      player.thornDamage += 25;
    }
  },
  {
    id: 'life_regen',
    name: 'Mộc Linh Tự Chữa Lành (Nature Rebirth)',
    category: 'DEFENSE',
    rarity: 'EPIC',
    description: 'Tự động hồi phục 4 Máu mỗi 3 giây trong suốt trận chiến.',
    icon: 'Leaf',
    maxLevel: 3,
    tags: ['defense', 'heal'],
    apply: (player, level) => {
      player.hp = Math.min(player.maxHp, player.hp + 20);
    }
  },

  // --- MOVEMENT UPGRADES ---
  {
    id: 'move_speed',
    name: 'Phong Thần Thần Hành (Swift Spirit)',
    category: 'MOVEMENT',
    rarity: 'COMMON',
    description: 'Tốc độ di chuyển tăng thêm 18%.',
    icon: 'Footprints',
    maxLevel: 4,
    tags: ['movement', 'speed'],
    apply: (player, level) => {
      player.speed += 0.75;
    }
  },
  {
    id: 'dash_cooldown',
    name: 'Huyễn Ảnh Tốc Biến (Dash Mastery)',
    category: 'MOVEMENT',
    rarity: 'RARE',
    description: 'Giảm 30% thời gian hồi chiêu của kỹ năng Lướt (Dash).',
    icon: 'FastForward',
    maxLevel: 3,
    tags: ['movement', 'dash'],
    apply: (player, level) => {
      player.dashCooldownMs = Math.max(600, player.dashCooldownMs * 0.7);
    }
  },
  {
    id: 'dash_trail',
    name: 'Lôi Hỏa Tốc Vết (Blazing Dash)',
    category: 'MOVEMENT',
    rarity: 'EPIC',
    description: 'Lướt để lại vệt lửa/sét thiêu đốt 45 sát thương lên quái đuổi theo.',
    icon: 'Flame',
    maxLevel: 2,
    tags: ['movement', 'dash', 'fire'],
    apply: (player, level) => {
      player.dashTrail = true;
    }
  },

  // --- SPECIAL & UTILITY UPGRADES ---
  {
    id: 'magnet_reach',
    name: 'Hấp Tinh Hào Quang (Essence Magnet)',
    category: 'SPECIAL',
    rarity: 'COMMON',
    description: 'Phạm vi tự động hút Tinh Thạch Linh Lực (XP) tăng thêm 70%.',
    icon: 'Magnet',
    maxLevel: 3,
    tags: ['utility', 'magnet'],
    apply: (player, level) => {
      player.magnetRadius += 65;
    }
  },
  {
    id: 'skill_cooldown',
    name: 'Thần Thông Tinh Thông (Skill Attunement)',
    category: 'SPECIAL',
    rarity: 'RARE',
    description: 'Giảm 25% thời gian hồi chiêu Chiêu Thức Đặc Biệt của Linh Thú.',
    icon: 'Clock',
    maxLevel: 3,
    tags: ['special', 'skill'],
    apply: (player, level) => {
      player.skillCooldownMs = Math.max(3000, player.skillCooldownMs * 0.75);
    }
  },
  {
    id: 'golden_fortune',
    name: 'Kim Thần Chiếu Mệnh (Celestial Fortune)',
    category: 'SPECIAL',
    rarity: 'LEGENDARY',
    description: 'Nhân 1.5x lượng Xu và Linh Lực rơi từ quái, tăng 15% sát thương toàn diện.',
    icon: 'Coins',
    maxLevel: 2,
    tags: ['special', 'fortune'],
    apply: (player, level) => {
      player.attackDamage += 8;
      player.critChance += 0.1;
      player.magnetRadius += 40;
    }
  },
  {
    id: 'avatar_titan',
    name: 'Cổ Thần Giáng Lâm (Avatar of Titans)',
    category: 'SPECIAL',
    rarity: 'LEGENDARY',
    description: 'Tăng 50 Máu, +30% Sát Thương, đòn đánh tạo vụ nổ nhỏ khi va chạm.',
    icon: 'Crown',
    maxLevel: 1,
    tags: ['special', 'titan'],
    apply: (player, level) => {
      player.maxHp += 50;
      player.hp = Math.min(player.maxHp, player.hp + 50);
      player.attackDamage += 14;
    }
  }
];

export function getRandomUpgrades(
  count: number = 3, 
  currentUpgrades: Map<string, number>,
  fortuneBonus: number = 0
): UpgradeDef[] {
  // Filter out maxed upgrades
  const available = UPGRADE_POOL.filter(u => {
    const currentLvl = currentUpgrades.get(u.id) || 0;
    return currentLvl < u.maxLevel;
  });

  if (available.length <= count) return available;

  // Weighted random by rarity + fortune
  const weights: Record<string, number> = {
    COMMON: 60,
    RARE: 28 + fortuneBonus * 10,
    EPIC: 10 + fortuneBonus * 10,
    LEGENDARY: 2 + fortuneBonus * 6
  };

  const selected: UpgradeDef[] = [];
  const pool = [...available];

  while (selected.length < count && pool.length > 0) {
    const totalWeight = pool.reduce((acc, u) => acc + (weights[u.rarity] || 20), 0);
    let rand = Math.random() * totalWeight;

    let chosenIdx = 0;
    for (let i = 0; i < pool.length; i++) {
      rand -= weights[pool[i].rarity] || 20;
      if (rand <= 0) {
        chosenIdx = i;
        break;
      }
    }

    selected.push(pool[chosenIdx]);
    pool.splice(chosenIdx, 1);
  }

  return selected;
}
