import { SpiritConfig, SpiritId } from './types';

export const SPIRITS: Record<SpiritId, SpiritConfig> = {
  phoenix: {
    id: 'phoenix',
    name: 'Phượng Hoàng',
    realm: 'Hỏa',
    elementName: 'Hỏa Linh (Fire)',
    title: 'Hỏa Vũ Bất Diệt',
    color: '#F97316', // Orange-500
    secondaryColor: '#EF4444', // Red-500
    glowColor: 'rgba(249, 115, 22, 0.4)',
    description: 'Chúa tể ngọn lửa vĩnh cửu. Chuyên bùng nổ sát thương diện rộng và thiêu đốt quân thù.',
    skillName: 'Hỏa Diệm Bạo Phát (Fire Burst)',
    skillDescription: 'Tạo đợt sóng lửa quét 360 độ xung quanh, gây 75 sát thương và thiêu đốt kẻ địch trong 4 giây.',
    skillCooldownMs: 8000,
    baseStats: {
      maxHp: 110,
      speed: 3.6,
      attackDamage: 22,
      attackSpeed: 1.8,
      projectileCount: 1,
      critChance: 0.12,
      dashCooldownMs: 1600,
      magnetRadius: 100
    }
  },
  frost_fox: {
    id: 'frost_fox',
    name: 'Hồ Ly Băng',
    realm: 'Thủy',
    elementName: 'Băng Thủy (Frost)',
    title: 'Hàn Băng Thần Thú',
    color: '#06B6D4', // Cyan-500
    secondaryColor: '#3B82F6', // Blue-500
    glowColor: 'rgba(6, 182, 212, 0.4)',
    description: 'Bậc thầy kiểm soát không gian. Làm chậm và đóng băng kẻ địch để khống chế toàn bộ sàn đấu.',
    skillName: 'Băng Sương Bạo Vũ (Ice Nova)',
    skillDescription: 'Giải phóng vòng tròn băng giá, gây 40 sát thương và đóng băng toàn bộ kẻ địch trong 2.5 giây.',
    skillCooldownMs: 9000,
    baseStats: {
      maxHp: 100,
      speed: 3.7,
      attackDamage: 18,
      attackSpeed: 2.1,
      projectileCount: 1,
      critChance: 0.15,
      dashCooldownMs: 1400,
      magnetRadius: 110
    }
  },
  spirit_deer: {
    id: 'spirit_deer',
    name: 'Linh Dương',
    realm: 'Mộc',
    elementName: 'Mộc Linh (Nature)',
    title: 'Thủ Hộ Rừng Thiêng',
    color: '#10B981', // Emerald-500
    secondaryColor: '#84CC16', // Lime-500
    glowColor: 'rgba(16, 185, 129, 0.4)',
    description: 'Linh hồn thiên nhiên hiền hòa nhưng kiên cường. Sức sống bền bỉ và khả năng tự hồi phục tối thượng.',
    skillName: 'Sinh Mệnh Ba Động (Nature Pulse)',
    skillDescription: 'Hồi phục ngay lập tức 35 Máu và tạo 1 tầng Linh Thể Hộ Giáp chặn đòn đánh kế tiếp.',
    skillCooldownMs: 11000,
    baseStats: {
      maxHp: 140,
      speed: 3.4,
      attackDamage: 19,
      attackSpeed: 1.6,
      projectileCount: 1,
      critChance: 0.08,
      dashCooldownMs: 1700,
      magnetRadius: 120
    }
  },
  thunder_wolf: {
    id: 'thunder_wolf',
    name: 'Thần Sói Lôi',
    realm: 'Lôi',
    elementName: 'Lôi Điện (Thunder)',
    title: 'Tia Chớp Cuồng Nộ',
    color: '#FACC15', // Yellow-400
    secondaryColor: '#EAB308', // Yellow-500
    glowColor: 'rgba(250, 204, 21, 0.4)',
    description: 'Chiến binh lôi đình thần tốc. Lướt qua kẻ địch và phóng ra chuỗi sét đánh lan hủy diệt.',
    skillName: 'Lôi Đình Cuồng Trảm (Lightning Dash)',
    skillDescription: 'Bứt tốc thần sầu xuyên qua quái gây 90 sát thương và phóng tia sét liên tỏa giật 5 kẻ địch xung quanh.',
    skillCooldownMs: 7000,
    baseStats: {
      maxHp: 105,
      speed: 4.1,
      attackDamage: 24,
      attackSpeed: 2.0,
      projectileCount: 1,
      critChance: 0.20,
      dashCooldownMs: 1100,
      magnetRadius: 95
    }
  },
  shadow_cat: {
    id: 'shadow_cat',
    name: 'Mèo Bóng Tối',
    realm: 'Ảnh',
    elementName: 'U Minh (Shadow)',
    title: 'Bóng Đêm Thần Bí',
    color: '#A855F7', // Purple-500
    secondaryColor: '#6366F1', // Indigo-500
    glowColor: 'rgba(168, 85, 247, 0.4)',
    description: 'Thích khách thoắt ẩn thoắt hiện. Tách ra phân thân bóng tối tấn công áp đảo đối thủ.',
    skillName: 'Huyễn Ảnh Phân Thân (Shadow Clones)',
    skillDescription: 'Triệu hồi 2 phân thân huyễn ảnh tự động săn lùng và chém quái xung quanh trong 6 giây.',
    skillCooldownMs: 10000,
    baseStats: {
      maxHp: 95,
      speed: 3.9,
      attackDamage: 25,
      attackSpeed: 2.2,
      projectileCount: 1,
      critChance: 0.22,
      dashCooldownMs: 1300,
      magnetRadius: 100
    }
  },
  celestial_kirin: {
    id: 'celestial_kirin',
    name: 'Kỳ Lân Thánh Quang',
    realm: 'Quang',
    elementName: 'Thánh Quang (Celestial)',
    title: 'Kỳ Lân Hoàng Gia',
    color: '#F59E0B', // Amber-500
    secondaryColor: '#FBBF24', // Amber-400
    glowColor: 'rgba(245, 158, 11, 0.4)',
    description: 'Thần thú điềm lành cổ xưa. Tích tụ linh khí thần thánh và tăng cơ hội nhận nâng cấp truyền thuyết.',
    skillName: 'Tinh Quang Định Mệnh (Fortune Star)',
    skillDescription: 'Bắn ra 6 ngôi sao tinh tú tự tìm mục tiêu phát nổ, tăng mạnh tỷ lệ xuất hiện nâng cấp quý.',
    skillCooldownMs: 8500,
    baseStats: {
      maxHp: 120,
      speed: 3.5,
      attackDamage: 20,
      attackSpeed: 1.7,
      projectileCount: 2,
      critChance: 0.15,
      dashCooldownMs: 1500,
      magnetRadius: 140
    }
  }
};

export const SPIRIT_LIST = Object.values(SPIRITS);

// Backward compatibility stats for legacy references
SPIRIT_LIST.forEach((s) => {
  s.stats = {
    speed: s.baseStats.speed / 3.5,
    jump: 1,
    energy: 1,
    luck: 1
  };
});
