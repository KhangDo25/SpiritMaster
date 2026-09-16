import {
  ArenaPlayer,
  ArenaStats,
  ArenaThemeConfig,
  ArenaThemeId,
  DamageNumber,
  EnemyEntity,
  EnemyType,
  InRunEvent,
  Particle,
  ProjectileEntity,
  ShadowClone,
  SpiritConfig,
  SpiritId,
  UpgradeDef,
  UpgradeItem,
  XpOrbEntity
} from './types';
import { resolveArenaTheme } from './maps';
import { SPIRITS } from './spirits';
import { getRandomUpgrades } from './upgrades';
import { soundEngine } from '../utils/audio';

export class ArenaEngine {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private isRunning: boolean = false;
  private isPaused: boolean = false;
  private animationFrameId: number | null = null;
  private lastTime: number = 0;

  // Configurations
  private theme: ArenaThemeConfig;
  private spirit: SpiritConfig;

  // Logical World Dimensions (Resolution-independent gameplay coordinate system)
  public readonly worldWidth: number = 960;
  public readonly worldHeight: number = 600;

  // Viewport & Canvas Dimensions
  public width: number = 960;
  public height: number = 600;
  private dpr: number = 1;
  private scale: number = 1;
  private offsetX: number = 0;
  private offsetY: number = 0;
  private notifyTimer: number = 0;

  // Entities
  private player: ArenaPlayer;
  private enemies: EnemyEntity[] = [];
  private projectiles: ProjectileEntity[] = [];
  private xpOrbs: XpOrbEntity[] = [];
  private damageNumbers: DamageNumber[] = [];
  private particles: Particle[] = [];
  private shadowClones: ShadowClone[] = [];

  // Upgrades
  private equippedUpgrades: Map<string, number> = new Map();
  private equippedUpgradeList: UpgradeItem[] = [];

  // Wave System
  private currentWave: number = 1;
  private maxWaves: number = 5;
  private waveDurationSeconds: number = 32;
  private waveTimer: number = 0;
  private spawnTimer: number = 0;
  private eliteSpawnedThisWave: boolean = false;
  private bossSpawned: boolean = false;
  private bossEntity: EnemyEntity | null = null;

  // Run Stats
  private score: number = 0;
  private coins: number = 0;
  private cluesFound: number = 0;
  private enemiesKilled: number = 0;
  private isGameOver: boolean = false;
  private isVictory: boolean = false;

  // Controls & Inputs
  public inputX: number = 0;
  public inputY: number = 0;
  private attackTimer: number = 0;
  private auraTickTimer: number = 0;

  // Callbacks
  public onStateUpdate?: (stats: ArenaStats) => void;
  public onLevelUp?: (choices: UpgradeDef[]) => void;
  public onEventTrigger?: (event: InRunEvent) => void;
  public onGameOver?: (
    score: number, 
    clues: number, 
    coins: number, 
    victory: boolean, 
    enemiesKilled: number,
    level: number,
    upgrades: UpgradeItem[]
  ) => void;

  constructor(
    canvas: HTMLCanvasElement,
    themeId: ArenaThemeId | string = 'forest',
    spiritId: SpiritId = 'phoenix'
  ) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d')!;
    this.theme = resolveArenaTheme(themeId);
    this.spirit = SPIRITS[spiritId] || SPIRITS.phoenix;

    this.resize();

    // Initialize player based on spirit base stats in center of logical arena
    const bs = this.spirit.baseStats;
    this.player = {
      x: this.worldWidth / 2,
      y: this.worldHeight / 2,
      radius: 16,
      vx: 0,
      vy: 0,
      hp: bs.maxHp,
      maxHp: bs.maxHp,
      shield: 0,
      maxShield: 0,
      shieldRegenTimer: 0,
      speed: bs.speed,
      attackDamage: bs.attackDamage,
      attackSpeed: bs.attackSpeed,
      projectileCount: bs.projectileCount,
      critChance: bs.critChance,
      critDamage: 1.5,
      chainCount: 0,
      magnetRadius: bs.magnetRadius,
      dashCooldownMs: bs.dashCooldownMs,
      dashTimer: 0,
      isDashing: false,
      dashTrail: false,
      skillCooldownMs: this.spirit.skillCooldownMs,
      skillTimer: 0,
      burningAuraDamage: 0,
      burningAuraRadius: 0,
      frostFreezeChance: 0,
      thornDamage: 0,
      level: 1,
      xp: 0,
      xpToNextLevel: 40
    };
  }

  public resize(containerWidth?: number, containerHeight?: number): void {
    const parent = this.canvas.parentElement;
    const cssWidth = containerWidth || parent?.clientWidth || window.innerWidth || 960;
    const cssHeight = containerHeight || parent?.clientHeight || window.innerHeight || 600;

    this.dpr = Math.min(window.devicePixelRatio || 1, 2.5);
    this.canvas.width = Math.round(cssWidth * this.dpr);
    this.canvas.height = Math.round(cssHeight * this.dpr);

    this.width = cssWidth;
    this.height = cssHeight;

    // Aspect-fit world into canvas screen with proper letterbox/pillarbox
    const scaleX = cssWidth / this.worldWidth;
    const scaleY = cssHeight / this.worldHeight;
    this.scale = Math.min(scaleX, scaleY);

    this.offsetX = Math.round((cssWidth - this.worldWidth * this.scale) / 2);
    this.offsetY = Math.round((cssHeight - this.worldHeight * this.scale) / 2);
  }

  public start(): void {
    if (this.isRunning) return;
    this.isRunning = true;
    this.isPaused = false;
    this.lastTime = performance.now();
    this.waveTimer = this.waveDurationSeconds;
    this.loop(this.lastTime);
  }

  public pause(): void {
    this.isPaused = true;
  }

  public resume(): void {
    if (!this.isRunning) return;
    this.isPaused = false;
    this.lastTime = performance.now();
  }

  public getIsPaused(): boolean {
    return this.isPaused;
  }

  public stop(): void {
    this.isRunning = false;
    if (this.animationFrameId) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }
  }

  // --- CONTROLS ---

  public move(dx: number, dy: number): void {
    const len = Math.hypot(dx, dy);
    if (len > 0) {
      this.inputX = dx / len;
      this.inputY = dy / len;
    } else {
      this.inputX = 0;
      this.inputY = 0;
    }
  }

  public dash(): void {
    if (this.player.dashTimer > 0 || this.player.isDashing || this.isPaused || !this.isRunning) return;

    this.player.isDashing = true;
    this.player.dashTimer = this.player.dashCooldownMs;
    soundEngine.playDash();

    // Determine dash direction
    let dirX = this.inputX;
    let dirY = this.inputY;
    if (dirX === 0 && dirY === 0) {
      dirX = 1; // Default forward
    }

    const dashSpeed = this.player.speed * 3.8;
    this.player.vx = dirX * dashSpeed;
    this.player.vy = dirY * dashSpeed;

    // Dash trail effects
    for (let i = 0; i < 14; i++) {
      this.particles.push({
        x: this.player.x + (Math.random() - 0.5) * 20,
        y: this.player.y + (Math.random() - 0.5) * 20,
        vx: -dirX * Math.random() * 2,
        vy: -dirY * Math.random() * 2,
        size: Math.random() * 6 + 3,
        color: this.spirit.color,
        alpha: 1,
        life: 0,
        maxLife: 250
      });
    }

    // Special Thunder Wolf dash
    if (this.spirit.id === 'thunder_wolf') {
      this.triggerThunderDashDamage();
    }

    setTimeout(() => {
      this.player.isDashing = false;
    }, 200);
  }

  public triggerSkill(): void {
    if (this.player.skillTimer > 0 || this.isPaused || !this.isRunning) return;

    this.player.skillTimer = this.player.skillCooldownMs;
    soundEngine.playLevelUp();

    switch (this.spirit.id) {
      case 'phoenix':
        this.triggerPhoenixBurst();
        break;
      case 'frost_fox':
        this.triggerFrostNova();
        break;
      case 'spirit_deer':
        this.triggerNaturePulse();
        break;
      case 'thunder_wolf':
        this.triggerThunderDashSkill();
        break;
      case 'shadow_cat':
        this.triggerShadowClones();
        break;
      case 'celestial_kirin':
        this.triggerCelestialStar();
        break;
    }
  }

  // --- SKILL IMPLEMENTATIONS ---

  private triggerPhoenixBurst(): void {
    const burstRadius = 170;
    for (let i = 0; i < 40; i++) {
      const angle = (Math.PI * 2 * i) / 40;
      this.particles.push({
        x: this.player.x,
        y: this.player.y,
        vx: Math.cos(angle) * 7,
        vy: Math.sin(angle) * 7,
        size: 8,
        color: '#F97316',
        alpha: 1,
        life: 0,
        maxLife: 400
      });
    }

    // Hit all enemies in range
    for (const enemy of this.enemies) {
      const dist = Math.hypot(enemy.x - this.player.x, enemy.y - this.player.y);
      if (dist <= burstRadius) {
        this.damageEnemy(enemy, 80, true);
        enemy.burnTimer = 4000;
        enemy.burnDamage = 18;
      }
    }
  }

  private triggerFrostNova(): void {
    const novaRadius = 210;
    for (let i = 0; i < 36; i++) {
      const angle = (Math.PI * 2 * i) / 36;
      this.particles.push({
        x: this.player.x,
        y: this.player.y,
        vx: Math.cos(angle) * 6,
        vy: Math.sin(angle) * 6,
        size: 7,
        color: '#06B6D4',
        alpha: 1,
        life: 0,
        maxLife: 450
      });
    }

    for (const enemy of this.enemies) {
      const dist = Math.hypot(enemy.x - this.player.x, enemy.y - this.player.y);
      if (dist <= novaRadius) {
        this.damageEnemy(enemy, 45, false);
        enemy.isFrozen = true;
        enemy.frozenTimer = 2800;
      }
    }
  }

  private triggerNaturePulse(): void {
    this.player.hp = Math.min(this.player.maxHp, this.player.hp + 35);
    this.player.shield += 1;
    this.player.maxShield = Math.max(this.player.maxShield, 1);
    this.addDamageNumber(this.player.x, this.player.y - 20, 35, false, '#10B981');

    for (let i = 0; i < 30; i++) {
      this.particles.push({
        x: this.player.x + (Math.random() - 0.5) * 30,
        y: this.player.y + (Math.random() - 0.5) * 30,
        vx: (Math.random() - 0.5) * 4,
        vy: -Math.random() * 5,
        size: 6,
        color: '#34D399',
        alpha: 1,
        life: 0,
        maxLife: 500
      });
    }
  }

  private triggerThunderDashDamage(): void {
    for (const enemy of this.enemies) {
      const dist = Math.hypot(enemy.x - this.player.x, enemy.y - this.player.y);
      if (dist < 60) {
        this.damageEnemy(enemy, 75, true);
      }
    }
  }

  private triggerThunderDashSkill(): void {
    this.dash();
    // Lightning strikes to 5 enemies
    const targets = [...this.enemies]
      .sort((a, b) => Math.hypot(a.x - this.player.x, a.y - this.player.y) - Math.hypot(b.x - this.player.x, b.y - this.player.y))
      .slice(0, 5);

    for (const target of targets) {
      this.damageEnemy(target, 90, true);
      this.createLightningEffect(this.player.x, this.player.y, target.x, target.y);
    }
  }

  private triggerShadowClones(): void {
    this.shadowClones.push(
      { x: this.player.x - 30, y: this.player.y - 20, durationMs: 6000, attackTimer: 0 },
      { x: this.player.x + 30, y: this.player.y + 20, durationMs: 6000, attackTimer: 0 }
    );
  }

  private triggerCelestialStar(): void {
    // Fire 6 homing stars
    for (let i = 0; i < 6; i++) {
      const angle = (Math.PI * 2 * i) / 6;
      this.projectiles.push({
        id: `star_${Date.now()}_${i}`,
        x: this.player.x,
        y: this.player.y,
        vx: Math.cos(angle) * 7,
        vy: Math.sin(angle) * 7,
        radius: 7,
        damage: 48,
        isCrit: true,
        isPlayer: true,
        color: '#F59E0B',
        lifeMs: 0,
        maxLifeMs: 2500,
        pierce: 1,
        chainsLeft: 0,
        hitEnemies: new Set(),
        homingTarget: this.getClosestEnemy(this.player.x, this.player.y)
      });
    }

    // Pull all XP orbs on screen
    for (const orb of this.xpOrbs) {
      orb.isMagnetized = true;
    }
  }

  // --- UPGRADES ---

  public applyUpgrade(upgrade: UpgradeDef): void {
    const currentLevel = (this.equippedUpgrades.get(upgrade.id) || 0) + 1;
    this.equippedUpgrades.set(upgrade.id, currentLevel);

    const existingIdx = this.equippedUpgradeList.findIndex(u => u.def.id === upgrade.id);
    if (existingIdx >= 0) {
      this.equippedUpgradeList[existingIdx].level = currentLevel;
    } else {
      this.equippedUpgradeList.push({ def: upgrade, level: currentLevel });
    }

    upgrade.apply(this.player, currentLevel);
    soundEngine.playLevelUp();
    this.resume();
  }

  // --- GAME LOOP ---

  private loop = (time: number): void => {
    if (!this.isRunning) return;

    const dtMs = Math.min(100, time - this.lastTime);
    this.lastTime = time;

    if (!this.isPaused) {
      this.update(dtMs);
      this.render();

      // Mobile performance: throttle React state update to ~12 FPS instead of 60 FPS
      this.notifyTimer += dtMs;
      if (this.notifyTimer >= 80) {
        this.notifyTimer = 0;
        this.notifyState();
      }
    }

    this.animationFrameId = requestAnimationFrame(this.loop);
  };

  private update(dtMs: number): void {
    if (this.isGameOver) return;

    const dt = dtMs / 1000;

    // 1. Update Player Movement & Bounds in logical world space
    this.player.vx += this.inputX * this.player.speed * 8 * dt;
    this.player.vy += this.inputY * this.player.speed * 8 * dt;
    this.player.vx *= 0.85; // Friction
    this.player.vy *= 0.85;

    this.player.x += this.player.vx;
    this.player.y += this.player.vy;

    // Logical World Boundaries
    const padding = 28;
    this.player.x = Math.max(padding, Math.min(this.worldWidth - padding, this.player.x));
    this.player.y = Math.max(padding, Math.min(this.worldHeight - padding, this.player.y));

    // Timers
    if (this.player.dashTimer > 0) {
      this.player.dashTimer = Math.max(0, this.player.dashTimer - dtMs);
    }
    if (this.player.skillTimer > 0) {
      this.player.skillTimer = Math.max(0, this.player.skillTimer - dtMs);
    }

    // Shield Regen
    if (this.player.maxShield > 0 && this.player.shield < this.player.maxShield) {
      this.player.shieldRegenTimer += dtMs;
      if (this.player.shieldRegenTimer >= 12000) {
        this.player.shield = Math.min(this.player.maxShield, this.player.shield + 1);
        this.player.shieldRegenTimer = 0;
      }
    }

    // Burning Aura Tick
    if (this.player.burningAuraDamage > 0) {
      this.auraTickTimer += dtMs;
      if (this.auraTickTimer >= 500) {
        this.auraTickTimer = 0;
        for (const enemy of this.enemies) {
          const dist = Math.hypot(enemy.x - this.player.x, enemy.y - this.player.y);
          if (dist <= this.player.burningAuraRadius) {
            this.damageEnemy(enemy, this.player.burningAuraDamage, false);
          }
        }
      }
    }

    // Dash trail damage
    if (this.player.isDashing && this.player.dashTrail) {
      for (const enemy of this.enemies) {
        if (Math.hypot(enemy.x - this.player.x, enemy.y - this.player.y) < 45) {
          this.damageEnemy(enemy, 40, true);
        }
      }
    }

    // 2. Auto-Attack Shooting
    this.attackTimer += dtMs;
    const attackIntervalMs = 1000 / this.player.attackSpeed;
    if (this.attackTimer >= attackIntervalMs) {
      this.attackTimer = 0;
      this.shootAtNearestEnemy();
    }

    // 3. Shadow Clones
    this.updateShadowClones(dtMs);

    // 4. Wave & Spawning
    this.updateWave(dtMs);

    // 5. Enemies AI & Collision
    this.updateEnemies(dtMs);

    // 6. Projectiles
    this.updateProjectiles(dtMs);

    // 7. XP Orbs
    this.updateXpOrbs(dtMs);

    // 8. Particles & Damage Numbers
    this.updateParticles(dtMs);

    // 9. Check Victory or Death
    if (this.player.hp <= 0 && !this.isGameOver) {
      this.handlePlayerDeath();
    }
  }

  // --- COMBAT & ATTACK ---

  private shootAtNearestEnemy(): void {
    const target = this.getClosestEnemy(this.player.x, this.player.y);
    if (!target) return;

    soundEngine.playJump();

    const dx = target.x - this.player.x;
    const dy = target.y - this.player.y;
    const baseAngle = Math.atan2(dy, dx);
    const count = this.player.projectileCount;
    const spread = 0.22; // Arc spread in radians
    const startAngle = baseAngle - ((count - 1) * spread) / 2;

    for (let i = 0; i < count; i++) {
      const angle = startAngle + i * spread;
      const speed = 9;
      const isCrit = Math.random() < this.player.critChance;
      const damage = Math.round(this.player.attackDamage * (isCrit ? this.player.critDamage : 1));

      this.projectiles.push({
        id: `p_${Date.now()}_${i}`,
        x: this.player.x,
        y: this.player.y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        radius: isCrit ? 6 : 4.5,
        damage,
        isCrit,
        isPlayer: true,
        color: isCrit ? '#FACC15' : this.spirit.color,
        lifeMs: 0,
        maxLifeMs: 1600,
        pierce: 1,
        chainsLeft: this.player.chainCount,
        hitEnemies: new Set()
      });
    }
  }

  private updateShadowClones(dtMs: number): void {
    for (let i = this.shadowClones.length - 1; i >= 0; i--) {
      const clone = this.shadowClones[i];
      clone.durationMs -= dtMs;
      if (clone.durationMs <= 0) {
        this.shadowClones.splice(i, 1);
        continue;
      }

      // Move toward closest enemy
      const target = this.getClosestEnemy(clone.x, clone.y);
      if (target) {
        const dx = target.x - clone.x;
        const dy = target.y - clone.y;
        const dist = Math.hypot(dx, dy);
        if (dist > 25) {
          clone.x += (dx / dist) * 4.2;
          clone.y += (dy / dist) * 4.2;
        }

        clone.attackTimer += dtMs;
        if (clone.attackTimer >= 400 && dist < 40) {
          clone.attackTimer = 0;
          this.damageEnemy(target, 28, true);
        }
      }
    }
  }

  // --- WAVE & SPAWNING SYSTEM ---

  private updateWave(dtMs: number): void {
    this.waveTimer -= dtMs / 1000;

    // Check Boss in Wave 5
    if (this.currentWave === 5 && !this.bossSpawned) {
      this.spawnBoss();
      this.bossSpawned = true;
    }

    // Normal Wave clear check
    if (this.waveTimer <= 0 && this.currentWave < this.maxWaves) {
      this.advanceWave();
      return;
    }

    // Spawn regular enemies
    this.spawnTimer += dtMs;
    const spawnRateMs = Math.max(350, 1100 - this.currentWave * 140);
    if (this.spawnTimer >= spawnRateMs && this.enemies.length < 35 + this.currentWave * 8) {
      this.spawnTimer = 0;
      this.spawnEnemyForWave();
    }

    // Spawn Elite midway through waves 3 & 4
    if ((this.currentWave === 3 || this.currentWave === 4) && !this.eliteSpawnedThisWave && this.waveTimer < 20) {
      this.spawnElite();
      this.eliteSpawnedThisWave = true;
    }
  }

  private advanceWave(): void {
    this.currentWave++;
    this.waveTimer = this.waveDurationSeconds + this.currentWave * 4;
    this.eliteSpawnedThisWave = false;
    soundEngine.playLevelUp();

    // Trigger mini-event between wave 2 & 3 or 3 & 4
    if (this.currentWave === 3 && this.onEventTrigger) {
      this.pause();
      this.onEventTrigger({
        id: 'ancient_shrine',
        title: 'Cổ Miếu Thần Thú (Spirit Shrine)',
        subtitle: 'Linh hồn cổ xưa ngự trị tại tế đàn thiêng',
        description: 'Tế đàn phát sáng mời gọi ngươi hiến tế sinh lực để đổi lấy bảo vật thần thoại.',
        choices: [
          {
            label: 'Hiến Tế Sinh Mệnh (-25 Máu)',
            description: 'Mất 25 HP đổi lấy nâng cấp Huyền Thoại ngay lập tức.',
            riskType: 'RISK',
            onChoose: () => {
              this.player.hp = Math.max(10, this.player.hp - 25);
              this.triggerLevelUpChoices(2.0); // High fortune
            }
          },
          {
            label: 'Cầu Nguyện Bình An (+30 Máu)',
            description: 'Tịnh hóa tâm hồn, hồi phục 30 HP và an toàn tiếp tục.',
            riskType: 'SAFE',
            onChoose: () => {
              this.player.hp = Math.min(this.player.maxHp, this.player.hp + 30);
              this.resume();
            }
          }
        ]
      });
      return;
    }

    if (this.currentWave === 4 && this.onEventTrigger) {
      this.pause();
      this.onEventTrigger({
        id: 'cursed_orb',
        title: 'Hắc Cầu Nguyền Rủa (Cursed Orb)',
        subtitle: 'Linh khí hắc ám cuộn trào',
        description: 'Ngươi có muốn hấp thụ nguồn năng lượng cấm kỵ để gia tăng sức mạnh vượt bậc?',
        choices: [
          {
            label: 'Hấp Thụ Hắc Cầu (+35% Sát Thương)',
            description: 'Tăng 12 Sát Thương đòn đánh, nhưng quái vật sẽ chạy nhanh hơn 20%.',
            riskType: 'RISK',
            onChoose: () => {
              this.player.attackDamage += 12;
              this.resume();
            }
          },
          {
            label: 'Thanh Tẩy Hắc Khí (+150 Xu Vàng)',
            description: 'Phá hủy hắc cầu an toàn, nhận 150 Xu Vàng và tiếp tục.',
            riskType: 'SAFE',
            onChoose: () => {
              this.coins += 150;
              this.resume();
            }
          }
        ]
      });
      return;
    }
  }

  private spawnEnemyForWave(): void {
    // Pick random spawn position along edge
    const pos = this.getRandomEdgePosition();
    let type: EnemyType = 'CHASER';

    const rand = Math.random();
    if (this.currentWave === 1) {
      type = rand < 0.35 ? 'SWARM' : 'CHASER';
    } else if (this.currentWave === 2) {
      type = rand < 0.3 ? 'RANGED' : rand < 0.6 ? 'SWARM' : 'CHASER';
    } else if (this.currentWave === 3) {
      type = rand < 0.25 ? 'TANK' : rand < 0.55 ? 'RANGED' : 'CHASER';
    } else {
      type = rand < 0.25 ? 'TANK' : rand < 0.5 ? 'RANGED' : rand < 0.75 ? 'SWARM' : 'CHASER';
    }

    this.spawnEnemy(type, pos.x, pos.y);
  }

  private spawnEnemy(type: EnemyType, x: number, y: number): void {
    let hp = 30 + this.currentWave * 15;
    let radius = 14;
    let speed = 2.2;
    let damage = 10;
    let color = '#EF4444';
    let xpValue = 10;
    let coinValue = 2;

    switch (type) {
      case 'SWARM':
        hp = 16 + this.currentWave * 6;
        radius = 10;
        speed = 3.2;
        damage = 6;
        color = '#F97316';
        xpValue = 6;
        coinValue = 1;
        break;
      case 'RANGED':
        hp = 35 + this.currentWave * 12;
        radius = 15;
        speed = 1.8;
        damage = 12;
        color = '#8B5CF6';
        xpValue = 14;
        coinValue = 4;
        break;
      case 'TANK':
        hp = 110 + this.currentWave * 45;
        radius = 24;
        speed = 1.2;
        damage = 22;
        color = '#64748B';
        xpValue = 35;
        coinValue = 8;
        break;
      case 'ELITE':
        hp = 320 + this.currentWave * 100;
        radius = 28;
        speed = 2.4;
        damage = 25;
        color = '#EAB308';
        xpValue = 100;
        coinValue = 35;
        break;
    }

    this.enemies.push({
      id: `e_${Date.now()}_${Math.random()}`,
      type,
      x,
      y,
      radius,
      hp,
      maxHp: hp,
      speed,
      damage,
      xpValue,
      coinValue,
      color,
      isFrozen: false,
      frozenTimer: 0,
      burnTimer: 0,
      burnDamage: 0,
      shootTimer: 0
    });
  }

  private spawnElite(): void {
    const pos = this.getRandomEdgePosition();
    this.spawnEnemy('ELITE', pos.x, pos.y);
    soundEngine.playDash();
  }

  private spawnBoss(): void {
    const bossHp = 1400;
    const boss: EnemyEntity = {
      id: 'the_void_titan_boss',
      type: 'BOSS',
      x: this.worldWidth / 2,
      y: 70,
      radius: 40,
      hp: bossHp,
      maxHp: bossHp,
      speed: 1.6,
      damage: 32,
      xpValue: 400,
      coinValue: 150,
      color: '#A855F7',
      isFrozen: false,
      frozenTimer: 0,
      burnTimer: 0,
      burnDamage: 0,
      shootTimer: 0,
      chargeTimer: 0,
      isCharging: false
    };

    this.bossEntity = boss;
    this.enemies.push(boss);
    soundEngine.playLevelUp();
    this.notifyState();
  }

  private getRandomEdgePosition(): { x: number; y: number } {
    const side = Math.floor(Math.random() * 4);
    switch (side) {
      case 0: // Top
        return { x: Math.random() * this.worldWidth, y: -20 };
      case 1: // Right
        return { x: this.worldWidth + 20, y: Math.random() * this.worldHeight };
      case 2: // Bottom
        return { x: Math.random() * this.worldWidth, y: this.worldHeight + 20 };
      default: // Left
        return { x: -20, y: Math.random() * this.worldHeight };
    }
  }

  // --- ENEMY LOGIC & AI ---

  private updateEnemies(dtMs: number): void {
    const dt = dtMs / 1000;

    for (let i = this.enemies.length - 1; i >= 0; i--) {
      const enemy = this.enemies[i];

      // Frozen status
      if (enemy.isFrozen) {
        enemy.frozenTimer -= dtMs;
        if (enemy.frozenTimer <= 0) enemy.isFrozen = false;
        continue;
      }

      // Burn status
      if (enemy.burnTimer > 0) {
        enemy.burnTimer -= dtMs;
        this.damageEnemy(enemy, (enemy.burnDamage * dtMs) / 1000, false);
      }

      // AI Movement
      const dx = this.player.x - enemy.x;
      const dy = this.player.y - enemy.y;
      const dist = Math.hypot(dx, dy);

      if (enemy.type === 'BOSS') {
        this.updateBossAI(enemy, dtMs, dist, dx, dy);
      } else if (enemy.type === 'RANGED') {
        // Keep distance ~200px
        if (dist < 180) {
          enemy.x -= (dx / dist) * enemy.speed * 60 * dt;
          enemy.y -= (dy / dist) * enemy.speed * 60 * dt;
        } else if (dist > 250) {
          enemy.x += (dx / dist) * enemy.speed * 60 * dt;
          enemy.y += (dy / dist) * enemy.speed * 60 * dt;
        }

        // Ranged shooting
        enemy.shootTimer = (enemy.shootTimer || 0) + dtMs;
        if (enemy.shootTimer >= 2200) {
          enemy.shootTimer = 0;
          this.shootEnemyProjectile(enemy);
        }
      } else {
        // Standard chaser / swarm / tank / elite
        if (dist > 5) {
          enemy.x += (dx / dist) * enemy.speed * 60 * dt;
          enemy.y += (dy / dist) * enemy.speed * 60 * dt;
        }
      }

      // Collision with Player
      if (dist < enemy.radius + this.player.radius) {
        if (!this.player.isDashing) {
          this.hitPlayer(enemy.damage);
          // Thorn damage
          if (this.player.thornDamage > 0) {
            this.damageEnemy(enemy, this.player.thornDamage, false);
          }
        }
      }

      // Death check
      if (enemy.hp <= 0) {
        this.handleEnemyDeath(enemy, i);
      }
    }
  }

  private updateBossAI(boss: EnemyEntity, dtMs: number, dist: number, dx: number, dy: number): void {
    const dt = dtMs / 1000;

    // Movement toward player center
    if (dist > 70) {
      boss.x += (dx / dist) * boss.speed * 40 * dt;
      boss.y += (dy / dist) * boss.speed * 40 * dt;
    }

    // Pattern 1: Bullet spiral
    boss.shootTimer = (boss.shootTimer || 0) + dtMs;
    if (boss.shootTimer >= 1800) {
      boss.shootTimer = 0;
      for (let i = 0; i < 8; i++) {
        const angle = (Math.PI * 2 * i) / 8 + performance.now() * 0.001;
        this.projectiles.push({
          id: `boss_p_${Date.now()}_${i}`,
          x: boss.x,
          y: boss.y,
          vx: Math.cos(angle) * 4.2,
          vy: Math.sin(angle) * 4.2,
          radius: 6,
          damage: 16,
          isCrit: false,
          isPlayer: false,
          color: '#C084FC',
          lifeMs: 0,
          maxLifeMs: 3000,
          pierce: 1,
          chainsLeft: 0,
          hitEnemies: new Set()
        });
      }
    }

    // Pattern 2: Summon minions
    boss.chargeTimer = (boss.chargeTimer || 0) + dtMs;
    if (boss.chargeTimer >= 8000) {
      boss.chargeTimer = 0;
      for (let i = 0; i < 3; i++) {
        this.spawnEnemy('SWARM', boss.x + (i - 1) * 30, boss.y + 40);
      }
    }
  }

  private shootEnemyProjectile(enemy: EnemyEntity): void {
    const dx = this.player.x - enemy.x;
    const dy = this.player.y - enemy.y;
    const dist = Math.hypot(dx, dy);
    if (dist === 0) return;

    const speed = 4.8;
    this.projectiles.push({
      id: `ep_${Date.now()}`,
      x: enemy.x,
      y: enemy.y,
      vx: (dx / dist) * speed,
      vy: (dy / dist) * speed,
      radius: 5,
      damage: enemy.damage,
      isCrit: false,
      isPlayer: false,
      color: '#A855F7',
      lifeMs: 0,
      maxLifeMs: 2500,
      pierce: 1,
      chainsLeft: 0,
      hitEnemies: new Set()
    });
  }

  private hitPlayer(damage: number): void {
    if (this.player.isDashing || this.isGameOver) return;

    if (this.player.shield > 0) {
      this.player.shield--;
      soundEngine.playShieldBreak();
      this.addDamageNumber(this.player.x, this.player.y - 25, 0, false, '#38BDF8');
      return;
    }

    this.player.hp = Math.max(0, this.player.hp - damage);
    soundEngine.playHit();
    this.addDamageNumber(this.player.x, this.player.y - 25, damage, false, '#EF4444');

    // Knockback
    this.player.vx += (Math.random() - 0.5) * 6;
    this.player.vy += (Math.random() - 0.5) * 6;
  }

  private damageEnemy(enemy: EnemyEntity, damage: number, isCrit: boolean): void {
    enemy.hp -= damage;
    this.addDamageNumber(
      enemy.x + (Math.random() - 0.5) * 16, 
      enemy.y - 15, 
      Math.round(damage), 
      isCrit, 
      isCrit ? '#FACC15' : '#FFFFFF'
    );

    // Frost chance
    if (Math.random() < this.player.frostFreezeChance) {
      enemy.isFrozen = true;
      enemy.frozenTimer = 1800;
    }
  }

  private handleEnemyDeath(enemy: EnemyEntity, index: number): void {
    this.enemies.splice(index, 1);
    this.enemiesKilled++;
    this.score += enemy.xpValue * 2;
    this.coins += enemy.coinValue;

    // Drop XP Gem
    this.xpOrbs.push({
      id: `xp_${Date.now()}_${Math.random()}`,
      x: enemy.x,
      y: enemy.y,
      value: enemy.xpValue,
      color: enemy.type === 'ELITE' ? '#FACC15' : enemy.type === 'BOSS' ? '#A855F7' : '#38BDF8',
      radius: enemy.type === 'ELITE' ? 8 : 5,
      isMagnetized: false
    });

    // Elite & Boss special drops
    if (enemy.type === 'ELITE') {
      this.cluesFound = Math.min(3, this.cluesFound + 1);
      soundEngine.playLevelUp();
    }

    if (enemy.type === 'BOSS') {
      this.cluesFound = 3;
      this.isVictory = true;
      this.isGameOver = true;
      soundEngine.playVictory();
      if (this.onGameOver) {
        this.onGameOver(
          this.score, 
          this.cluesFound, 
          this.coins, 
          true, 
          this.enemiesKilled, 
          this.player.level, 
          this.equippedUpgradeList
        );
      }
    }

    // Death particles
    for (let i = 0; i < 8; i++) {
      this.particles.push({
        x: enemy.x,
        y: enemy.y,
        vx: (Math.random() - 0.5) * 4,
        vy: (Math.random() - 0.5) * 4,
        size: 4,
        color: enemy.color,
        alpha: 1,
        life: 0,
        maxLife: 300
      });
    }
  }

  // --- PROJECTILES & COLLISION ---

  private updateProjectiles(dtMs: number): void {
    const dt = dtMs / 1000;

    for (let i = this.projectiles.length - 1; i >= 0; i--) {
      const p = this.projectiles[i];

      // Homing behavior for Celestial stars
      if (p.homingTarget && p.homingTarget.hp > 0) {
        const dx = p.homingTarget.x - p.x;
        const dy = p.homingTarget.y - p.y;
        const dist = Math.hypot(dx, dy);
        if (dist > 0) {
          p.vx += (dx / dist) * 1.5;
          p.vy += (dy / dist) * 1.5;
          const currentSpeed = Math.hypot(p.vx, p.vy);
          p.vx = (p.vx / currentSpeed) * 8.5;
          p.vy = (p.vy / currentSpeed) * 8.5;
        }
      }

      p.x += p.vx * 60 * dt;
      p.y += p.vy * 60 * dt;
      p.lifeMs += dtMs;

      // Expire by life or screen bounds
      if (p.lifeMs >= p.maxLifeMs || p.x < 0 || p.x > this.width || p.y < 0 || p.y > this.height) {
        this.projectiles.splice(i, 1);
        continue;
      }

      // Check hits
      if (p.isPlayer) {
        let hit = false;
        for (const enemy of this.enemies) {
          if (p.hitEnemies.has(enemy.id)) continue;

          const dist = Math.hypot(enemy.x - p.x, enemy.y - p.y);
          if (dist < enemy.radius + p.radius) {
            this.damageEnemy(enemy, p.damage, p.isCrit);
            p.hitEnemies.add(enemy.id);
            p.pierce--;

            // Chain lightning logic
            if (p.chainsLeft > 0) {
              p.chainsLeft--;
              const chainTarget = this.getClosestEnemy(enemy.x, enemy.y, enemy.id);
              if (chainTarget) {
                this.damageEnemy(chainTarget, p.damage * 0.75, false);
                this.createLightningEffect(enemy.x, enemy.y, chainTarget.x, chainTarget.y);
              }
            }

            if (p.pierce <= 0) {
              hit = true;
              break;
            }
          }
        }

        if (hit) {
          this.projectiles.splice(i, 1);
        }
      } else {
        // Enemy projectile hitting player
        const dist = Math.hypot(this.player.x - p.x, this.player.y - p.y);
        if (dist < this.player.radius + p.radius) {
          this.hitPlayer(p.damage);
          this.projectiles.splice(i, 1);
        }
      }
    }
  }

  // --- XP ORBS & LEVEL UP ---

  private updateXpOrbs(dtMs: number): void {
    const dt = dtMs / 1000;

    for (let i = this.xpOrbs.length - 1; i >= 0; i--) {
      const orb = this.xpOrbs[i];
      const dx = this.player.x - orb.x;
      const dy = this.player.y - orb.y;
      const dist = Math.hypot(dx, dy);

      if (dist <= this.player.magnetRadius) {
        orb.isMagnetized = true;
      }

      if (orb.isMagnetized) {
        const pullSpeed = 8.5;
        orb.x += (dx / dist) * pullSpeed * 60 * dt;
        orb.y += (dy / dist) * pullSpeed * 60 * dt;
      }

      // Collect orb
      if (dist < this.player.radius + orb.radius) {
        this.xpOrbs.splice(i, 1);
        this.addXp(orb.value);
        soundEngine.playCoin();
      }
    }
  }

  private addXp(amount: number): void {
    this.player.xp += amount;
    if (this.player.xp >= this.player.xpToNextLevel) {
      this.player.xp -= this.player.xpToNextLevel;
      this.player.level++;
      this.player.xpToNextLevel = Math.round(this.player.xpToNextLevel * 1.35);

      this.triggerLevelUpChoices();
    }
  }

  private triggerLevelUpChoices(fortuneMultiplier: number = 1.0): void {
    this.pause();
    soundEngine.playLevelUp();
    const fortuneBonus = (this.spirit.id === 'celestial_kirin' ? 0.3 : 0) * fortuneMultiplier;
    const choices = getRandomUpgrades(3, this.equippedUpgrades, fortuneBonus);

    if (this.onLevelUp) {
      this.onLevelUp(choices);
    }
  }

  private handlePlayerDeath(): void {
    this.isGameOver = true;
    soundEngine.playGameOver();
    if (this.onGameOver) {
      this.onGameOver(
        this.score, 
        this.cluesFound, 
        this.coins, 
        false, 
        this.enemiesKilled, 
        this.player.level, 
        this.equippedUpgradeList
      );
    }
  }

  // --- HELPERS & VISUAL FX ---

  private getClosestEnemy(x: number, y: number, excludeId?: string): EnemyEntity | null {
    let closest: EnemyEntity | null = null;
    let minDist = Infinity;

    for (const enemy of this.enemies) {
      if (excludeId && enemy.id === excludeId) continue;
      const dist = Math.hypot(enemy.x - x, enemy.y - y);
      if (dist < minDist) {
        minDist = dist;
        closest = enemy;
      }
    }

    return closest;
  }

  private addDamageNumber(x: number, y: number, value: number, isCrit: boolean, color: string): void {
    this.damageNumbers.push({
      id: `dmg_${Date.now()}_${Math.random()}`,
      x,
      y,
      value,
      isCrit,
      color,
      alpha: 1,
      life: 0
    });
  }

  private createLightningEffect(x1: number, y1: number, x2: number, y2: number): void {
    // Generate lightning points
    const steps = 6;
    for (let i = 0; i <= steps; i++) {
      const t = i / steps;
      const lx = x1 + (x2 - x1) * t + (Math.random() - 0.5) * 18;
      const ly = y1 + (y2 - y1) * t + (Math.random() - 0.5) * 18;
      this.particles.push({
        x: lx,
        y: ly,
        vx: 0,
        vy: 0,
        size: 3.5,
        color: '#FACC15',
        alpha: 1,
        life: 0,
        maxLife: 150
      });
    }
  }

  private updateParticles(dtMs: number): void {
    // Mobile performance: cap active particles to prevent GC pauses
    if (this.particles.length > 120) {
      this.particles.splice(0, this.particles.length - 120);
    }
    if (this.damageNumbers.length > 30) {
      this.damageNumbers.splice(0, this.damageNumbers.length - 30);
    }

    // Particles
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.life += dtMs;
      p.x += p.vx;
      p.y += p.vy;
      p.alpha = 1 - p.life / p.maxLife;

      if (p.life >= p.maxLife) {
        this.particles.splice(i, 1);
      }
    }

    // Damage numbers
    for (let i = this.damageNumbers.length - 1; i >= 0; i--) {
      const dn = this.damageNumbers[i];
      dn.life += dtMs;
      dn.y -= 0.6;
      dn.alpha = 1 - dn.life / 800;

      if (dn.life >= 800) {
        this.damageNumbers.splice(i, 1);
      }
    }
  }

  // --- NOTIFY REACT STATE ---

  private notifyState(): void {
    if (!this.onStateUpdate) return;

    this.onStateUpdate({
      hp: Math.max(0, Math.round(this.player.hp)),
      maxHp: this.player.maxHp,
      shield: this.player.shield,
      level: this.player.level,
      xp: this.player.xp,
      xpToNextLevel: this.player.xpToNextLevel,
      score: this.score,
      coins: this.coins,
      cluesFound: this.cluesFound,
      currentWave: this.currentWave,
      totalWaves: this.maxWaves,
      waveTimerSeconds: Math.max(0, Math.ceil(this.waveTimer)),
      enemiesKilled: this.enemiesKilled,
      dashCooldownRemaining: Math.ceil(this.player.dashTimer / 1000),
      skillCooldownRemaining: Math.ceil(this.player.skillTimer / 1000),
      isBossAlive: this.bossEntity !== null && this.bossEntity.hp > 0,
      bossHpPercent: this.bossEntity ? Math.max(0, (this.bossEntity.hp / this.bossEntity.maxHp) * 100) : 0,
      isDead: this.isGameOver && !this.isVictory,
      isVictory: this.isVictory,
      equippedUpgrades: this.equippedUpgradeList.map(u => ({
        id: u.def.id,
        name: u.def.name,
        level: u.level,
        rarity: u.def.rarity,
        icon: u.def.icon
      }))
    });
  }

  // --- RENDER ARENA CANVAS ---

  private render(): void {
    // 0. Reset transform & Clear canvas screen
    this.ctx.setTransform(1, 0, 0, 1, 0, 0);
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

    // Letterbox background if canvas aspect ratio differs from world
    this.ctx.fillStyle = '#030712';
    this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

    // 1. Transform context to scale & offset logical world
    this.ctx.setTransform(
      this.dpr * this.scale,
      0,
      0,
      this.dpr * this.scale,
      this.offsetX * this.dpr,
      this.offsetY * this.dpr
    );

    // 2. Draw Arena Floor & Grid in logical world dimensions
    this.ctx.fillStyle = this.theme.floorColor;
    this.ctx.fillRect(0, 0, this.worldWidth, this.worldHeight);

    // Grid lines
    this.ctx.strokeStyle = this.theme.gridColor;
    this.ctx.lineWidth = 1;
    const gridSize = 40;
    for (let x = 0; x <= this.worldWidth; x += gridSize) {
      this.ctx.beginPath();
      this.ctx.moveTo(x, 0);
      this.ctx.lineTo(x, this.worldHeight);
      this.ctx.stroke();
    }
    for (let y = 0; y <= this.worldHeight; y += gridSize) {
      this.ctx.beginPath();
      this.ctx.moveTo(0, y);
      this.ctx.lineTo(this.worldWidth, y);
      this.ctx.stroke();
    }

    // Arena Outer Border
    this.ctx.strokeStyle = this.theme.wallColor;
    this.ctx.lineWidth = 6;
    this.ctx.strokeRect(10, 10, this.worldWidth - 20, this.worldHeight - 20);

    // Inner Glowing Accent Line
    this.ctx.strokeStyle = this.theme.accentColor;
    this.ctx.lineWidth = 1.5;
    this.ctx.strokeRect(20, 20, this.worldWidth - 40, this.worldHeight - 40);

    // Center Emblem
    this.ctx.beginPath();
    this.ctx.arc(this.worldWidth / 2, this.worldHeight / 2, 60, 0, Math.PI * 2);
    this.ctx.strokeStyle = `${this.theme.accentColor}33`;
    this.ctx.lineWidth = 2;
    this.ctx.stroke();

    // 2. Burning Aura Circle (if active)
    if (this.player.burningAuraDamage > 0) {
      this.ctx.beginPath();
      this.ctx.arc(this.player.x, this.player.y, this.player.burningAuraRadius, 0, Math.PI * 2);
      this.ctx.fillStyle = 'rgba(249, 115, 22, 0.12)';
      this.ctx.fill();
      this.ctx.strokeStyle = 'rgba(249, 115, 22, 0.4)';
      this.ctx.lineWidth = 1.5;
      this.ctx.stroke();
    }

    // 3. XP Orbs
    for (const orb of this.xpOrbs) {
      this.ctx.beginPath();
      this.ctx.arc(orb.x, orb.y, orb.radius, 0, Math.PI * 2);
      this.ctx.fillStyle = orb.color;
      this.ctx.shadowColor = orb.color;
      this.ctx.shadowBlur = 8;
      this.ctx.fill();
      this.ctx.shadowBlur = 0;
    }

    // 4. Shadow Clones
    for (const clone of this.shadowClones) {
      this.ctx.beginPath();
      this.ctx.arc(clone.x, clone.y, 14, 0, Math.PI * 2);
      this.ctx.fillStyle = 'rgba(168, 85, 247, 0.6)';
      this.ctx.fill();
      this.ctx.strokeStyle = '#C084FC';
      this.ctx.lineWidth = 2;
      this.ctx.stroke();
    }

    // 5. Enemies
    for (const enemy of this.enemies) {
      this.renderEnemy(enemy);
    }

    // 6. Projectiles
    for (const p of this.projectiles) {
      this.ctx.beginPath();
      this.ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
      this.ctx.fillStyle = p.color;
      this.ctx.shadowColor = p.color;
      this.ctx.shadowBlur = p.isCrit ? 10 : 4;
      this.ctx.fill();
      this.ctx.shadowBlur = 0;
    }

    // 7. Player Spirit
    this.renderPlayer();

    // 8. Particles
    for (const part of this.particles) {
      this.ctx.beginPath();
      this.ctx.arc(part.x, part.y, part.size, 0, Math.PI * 2);
      this.ctx.fillStyle = part.color;
      this.ctx.globalAlpha = Math.max(0, part.alpha);
      this.ctx.fill();
      this.ctx.globalAlpha = 1;
    }

    // 9. Floating Damage Numbers
    for (const dn of this.damageNumbers) {
      this.ctx.font = dn.isCrit ? 'bold 15px sans-serif' : 'bold 12px sans-serif';
      this.ctx.fillStyle = dn.color;
      this.ctx.globalAlpha = Math.max(0, dn.alpha);
      this.ctx.fillText(
        dn.value === 0 ? 'BLOCKED' : `${dn.value}${dn.isCrit ? '!' : ''}`, 
        dn.x, 
        dn.y
      );
      this.ctx.globalAlpha = 1;
    }
  }

  private renderPlayer(): void {
    // Dash ghosting
    if (this.player.isDashing) {
      this.ctx.beginPath();
      this.ctx.arc(this.player.x - this.player.vx * 2, this.player.y - this.player.vy * 2, this.player.radius, 0, Math.PI * 2);
      this.ctx.fillStyle = `${this.spirit.color}40`;
      this.ctx.fill();
    }

    // Outer Aura Ring
    this.ctx.beginPath();
    this.ctx.arc(this.player.x, this.player.y, this.player.radius + 4, 0, Math.PI * 2);
    this.ctx.strokeStyle = this.spirit.glowColor;
    this.ctx.lineWidth = 3;
    this.ctx.stroke();

    // Shield Aura
    if (this.player.shield > 0) {
      this.ctx.beginPath();
      this.ctx.arc(this.player.x, this.player.y, this.player.radius + 8, 0, Math.PI * 2);
      this.ctx.strokeStyle = '#38BDF8';
      this.ctx.lineWidth = 2;
      this.ctx.stroke();
    }

    // Spirit Body
    this.ctx.beginPath();
    this.ctx.arc(this.player.x, this.player.y, this.player.radius, 0, Math.PI * 2);
    this.ctx.fillStyle = this.spirit.color;
    this.ctx.shadowColor = this.spirit.color;
    this.ctx.shadowBlur = 12;
    this.ctx.fill();
    this.ctx.shadowBlur = 0;

    // Direction indicator eye / crest
    const facingAngle = Math.atan2(this.player.vy, this.player.vx);
    const eyeX = this.player.x + Math.cos(facingAngle) * 7;
    const eyeY = this.player.y + Math.sin(facingAngle) * 7;
    this.ctx.beginPath();
    this.ctx.arc(eyeX, eyeY, 4, 0, Math.PI * 2);
    this.ctx.fillStyle = '#FFFFFF';
    this.ctx.fill();
  }

  private renderEnemy(enemy: EnemyEntity): void {
    // Frozen overlay
    if (enemy.isFrozen) {
      this.ctx.beginPath();
      this.ctx.arc(enemy.x, enemy.y, enemy.radius + 4, 0, Math.PI * 2);
      this.ctx.fillStyle = 'rgba(6, 182, 212, 0.4)';
      this.ctx.fill();
    }

    // Elite Gold Aura
    if (enemy.type === 'ELITE') {
      this.ctx.beginPath();
      this.ctx.arc(enemy.x, enemy.y, enemy.radius + 6, 0, Math.PI * 2);
      this.ctx.strokeStyle = '#FACC15';
      this.ctx.lineWidth = 2.5;
      this.ctx.stroke();
    }

    // Body
    this.ctx.beginPath();
    this.ctx.arc(enemy.x, enemy.y, enemy.radius, 0, Math.PI * 2);
    this.ctx.fillStyle = enemy.color;
    this.ctx.fill();

    // Mini Health Bar above enemy
    if (enemy.hp < enemy.maxHp && enemy.type !== 'BOSS') {
      const barWidth = enemy.radius * 2;
      const barHeight = 4;
      const hpPercent = Math.max(0, enemy.hp / enemy.maxHp);

      this.ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
      this.ctx.fillRect(enemy.x - barWidth / 2, enemy.y - enemy.radius - 8, barWidth, barHeight);

      this.ctx.fillStyle = enemy.type === 'ELITE' ? '#FACC15' : '#EF4444';
      this.ctx.fillRect(enemy.x - barWidth / 2, enemy.y - enemy.radius - 8, barWidth * hpPercent, barHeight);
    }
  }
}
