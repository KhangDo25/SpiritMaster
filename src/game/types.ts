export type SpiritId = 'phoenix' | 'frost_fox' | 'spirit_deer' | 'thunder_wolf' | 'shadow_cat' | 'celestial_kirin';

export type ArenaThemeId = 'forest' | 'fire' | 'frost' | 'shadow' | 'celestial';

export type EnemyType = 'CHASER' | 'RANGED' | 'TANK' | 'SWARM' | 'ELITE' | 'BOSS';

export type UpgradeCategory = 'ATTACK' | 'DEFENSE' | 'MOVEMENT' | 'ELEMENT' | 'SPECIAL';

export type UpgradeRarity = 'COMMON' | 'RARE' | 'EPIC' | 'LEGENDARY';

export interface UpgradeDef {
  id: string;
  name: string;
  category: UpgradeCategory;
  rarity: UpgradeRarity;
  description: string;
  icon: string;
  maxLevel: number;
  tags: string[]; // e.g. ['fire', 'aura'], ['lightning', 'chain']
  apply: (player: ArenaPlayer, level: number) => void;
}

export interface UpgradeItem {
  def: UpgradeDef;
  level: number;
}

export interface SpiritConfig {
  id: SpiritId;
  name: string;
  realm: string;
  elementName: string;
  title: string;
  color: string;
  secondaryColor: string;
  glowColor: string;
  description: string;
  skillName: string;
  skillDescription: string;
  skillCooldownMs: number;
  stats?: {
    speed: number;
    jump: number;
    energy: number;
    luck: number;
  };
  baseStats: {
    maxHp: number;
    speed: number;
    attackDamage: number;
    attackSpeed: number; // Attacks per second
    projectileCount: number;
    critChance: number;
    dashCooldownMs: number;
    magnetRadius: number;
  };
}

export interface ArenaPlayer {
  x: number;
  y: number;
  radius: number;
  vx: number;
  vy: number;
  hp: number;
  maxHp: number;
  shield: number;
  maxShield: number;
  shieldRegenTimer: number;
  speed: number;
  attackDamage: number;
  attackSpeed: number;
  projectileCount: number;
  critChance: number;
  critDamage: number;
  chainCount: number;
  magnetRadius: number;
  dashCooldownMs: number;
  dashTimer: number;
  isDashing: boolean;
  dashTrail: boolean;
  skillCooldownMs: number;
  skillTimer: number;
  burningAuraDamage: number;
  burningAuraRadius: number;
  frostFreezeChance: number;
  thornDamage: number;
  level: number;
  xp: number;
  xpToNextLevel: number;
}

export interface EnemyEntity {
  id: string;
  type: EnemyType;
  x: number;
  y: number;
  radius: number;
  hp: number;
  maxHp: number;
  speed: number;
  damage: number;
  xpValue: number;
  coinValue: number;
  color: string;
  isFrozen: boolean;
  frozenTimer: number;
  burnTimer: number;
  burnDamage: number;
  shootTimer?: number;
  eliteModifier?: string;
  attackCooldown?: number;
  chargeTimer?: number;
  isCharging?: boolean;
}

export interface ProjectileEntity {
  id: string;
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  damage: number;
  isCrit: boolean;
  isPlayer: boolean;
  color: string;
  lifeMs: number;
  maxLifeMs: number;
  pierce: number;
  chainsLeft: number;
  hitEnemies: Set<string>;
  homingTarget?: EnemyEntity | null;
}

export interface XpOrbEntity {
  id: string;
  x: number;
  y: number;
  value: number;
  color: string;
  radius: number;
  isMagnetized: boolean;
}

export interface DamageNumber {
  id: string;
  x: number;
  y: number;
  value: number;
  isCrit: boolean;
  color: string;
  alpha: number;
  life: number;
}

export interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  color: string;
  alpha: number;
  life: number;
  maxLife: number;
}

export interface ShadowClone {
  x: number;
  y: number;
  durationMs: number;
  attackTimer: number;
}

export interface ArenaThemeConfig {
  id: ArenaThemeId;
  name: string;
  vietnameseName: string;
  description: string;
  floorColor: string;
  gridColor: string;
  wallColor: string;
  accentColor: string;
  ambientParticleColor: string;
}

export interface InRunEventChoice {
  label: string;
  description: string;
  riskType: 'SAFE' | 'RISK';
  onChoose: () => void;
}

export interface InRunEvent {
  id: string;
  title: string;
  subtitle: string;
  description: string;
  choices: InRunEventChoice[];
}

export interface ArenaStats {
  hp: number;
  maxHp: number;
  shield: number;
  level: number;
  xp: number;
  xpToNextLevel: number;
  score: number;
  coins: number;
  cluesFound: number;
  currentWave: number;
  totalWaves: number;
  waveTimerSeconds: number;
  enemiesKilled: number;
  dashCooldownRemaining: number;
  skillCooldownRemaining: number;
  isBossAlive: boolean;
  bossHpPercent: number;
  isDead: boolean;
  isVictory: boolean;
  equippedUpgrades: { id: string; name: string; level: number; rarity: UpgradeRarity; icon: string }[];
}

// Backward compatibility interfaces
export type RealmId = string;
export type RouteType = string;
export interface Platform { 
  [key: string]: any;
  x: number; 
  y: number; 
  width: number; 
  height: number; 
  type?: string; 
  routeType?: string;
  color?: string;
}
export interface ObstacleEntity { 
  [key: string]: any;
  id?: string;
  x: number; 
  y: number; 
  width: number; 
  height: number; 
  type: string; 
  isFrozen?: boolean;
  isBroken?: boolean;
}
export interface CollectibleEntity { 
  [key: string]: any;
  id?: string;
  x: number; 
  y: number; 
  radius?: number; 
  width?: number;
  height?: number;
  type: string; 
  value?: number; 
  collected?: boolean;
  floatOffset?: number;
}
export interface GameStats { [key: string]: any; }
export interface RealmConfig { [key: string]: any; }
