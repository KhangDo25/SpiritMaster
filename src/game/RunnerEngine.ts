import { 
  GameStats, 
  ObstacleEntity, 
  CollectibleEntity, 
  Platform, 
  RealmConfig, 
  RealmId, 
  RouteType, 
  SpiritConfig, 
  SpiritId,
  InRunEvent
} from './types';
import { REALMS, resolveRealm } from './maps';
import { SPIRITS } from './spirits';
import { soundEngine } from '../utils/audio';

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  alpha: number;
  color: string;
  life: number;
  maxLife: number;
}

export class RunnerEngine {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  
  public realmConfig: RealmConfig;
  public spiritConfig: SpiritConfig;

  // Game State
  public isRunning = false;
  public isPaused = false;
  public distance = 0;
  public maxDistance = 1200; // 1.2km run to reach the Ancient Seal
  public score = 0;
  public coins = 0;
  public spiritEnergy = 0;
  public maxEnergy = 100;
  public cluesFound = 0;
  public maxClues = 3;
  
  // Health & Defense
  public hp = 3;
  public maxHp = 3;
  public shield = 0; // Number of absorbed hits
  public invulnerabilityTimer = 0; // ms of damage immunity after hit
  
  // Awakening
  public isAwakened = false;
  public awakeningTimer = 0;
  public readonly awakeningDuration = 7500; // 7.5 seconds
  
  // Dash & Movement
  public baseSpeed = 5.5;
  public currentSpeed = 5.5;
  public dashCooldown = 0;
  public isDashing = false;
  public dashDurationTimer = 0;
  
  // Physics: Player
  public player = {
    x: 120,
    y: 260,
    width: 44,
    height: 60,
    vx: 0,
    vy: 0,
    isGrounded: false,
    canDoubleJump: true,
    isGliding: false, // Phoenix float
    gravity: 0.72,
    jumpForce: -13.8,
  };

  // World Platforms & Entities
  public groundY = 340;
  public platforms: Platform[] = [];
  public obstacles: ObstacleEntity[] = [];
  public collectibles: CollectibleEntity[] = [];
  public particles: Particle[] = [];
  public trailPositions: { x: number; y: number; alpha: number; color: string }[] = [];
  
  // Active Route
  public currentRoute: RouteType = 'RISKY';
  
  // Boss & Event Triggers
  public isBossChasing = false;
  public bossX = -150;
  public bossProgress = 0;
  private triggeredEvents = new Set<number>();
  private shakeTimer = 0;
  private shakeIntensity = 0;

  // Timers & Loop
  private lastTime = 0;
  private animationFrameId = 0;
  private spawnProgress = 0;

  // Callbacks
  public onStateUpdate?: (stats: GameStats) => void;
  public onGameOver?: (score: number, clues: number, coins: number, victory: boolean) => void;
  public onEventTrigger?: (event: InRunEvent) => void;

  constructor(
    canvas: HTMLCanvasElement, 
    realmId: RealmId | string = 'forest', 
    spiritId: SpiritId = 'phoenix'
  ) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d')!;
    this.realmConfig = resolveRealm(realmId);
    this.spiritConfig = SPIRITS[spiritId as SpiritId] || SPIRITS.phoenix;
    
    // Adjust canvas resolution for crisp retina rendering
    const dpr = window.devicePixelRatio || 1;
    if (this.canvas.width !== 800 * dpr || this.canvas.height !== 400 * dpr) {
      this.canvas.width = 800;
      this.canvas.height = 400;
    }
    this.groundY = this.canvas.height - 50;

    // Apply Spirit passive bonuses
    if (this.spiritConfig.id === 'spirit_deer') {
      this.shield = 1; // Nature shield
    }
  }

  public start() {
    this.isRunning = true;
    this.isPaused = false;
    this.distance = 0;
    this.score = 0;
    this.coins = 0;
    this.spiritEnergy = 0;
    this.cluesFound = 0;
    this.hp = this.maxHp;
    this.shield = this.spiritConfig.id === 'spirit_deer' ? 1 : 0;
    this.invulnerabilityTimer = 0;
    this.isAwakened = false;
    this.awakeningTimer = 0;
    this.isBossChasing = false;
    this.bossX = -150;
    this.triggeredEvents.clear();
    
    this.platforms = [];
    this.obstacles = [];
    this.collectibles = [];
    this.particles = [];
    this.trailPositions = [];

    // Reset Player
    this.player.x = 120;
    this.player.y = this.groundY - this.player.height;
    this.player.vy = 0;
    this.player.isGrounded = true;
    this.player.canDoubleJump = true;
    this.player.isGliding = false;

    // Generate initial world chunks
    this.generateInitialTerrain();

    this.lastTime = performance.now();
    this.animationFrameId = requestAnimationFrame(this.loop);

    soundEngine.playClick();
  }

  public stop() {
    this.isRunning = false;
    cancelAnimationFrame(this.animationFrameId);
  }

  public pause() {
    this.isPaused = true;
  }

  public resume() {
    if (!this.isRunning) return;
    this.isPaused = false;
    this.lastTime = performance.now();
    this.animationFrameId = requestAnimationFrame(this.loop);
  }

  // --- CONTROLS ---

  public jump() {
    if (!this.isRunning || this.isPaused) return;

    if (this.player.isGrounded) {
      this.player.vy = this.player.jumpForce * this.spiritConfig.stats.jump;
      this.player.isGrounded = false;
      this.player.canDoubleJump = true;
      this.spawnJumpPuff();
      soundEngine.playJump();
    } else if (this.player.canDoubleJump) {
      // Double Jump
      this.player.vy = this.player.jumpForce * 0.9 * this.spiritConfig.stats.jump;
      this.player.canDoubleJump = false;
      this.spawnJumpPuff();
      soundEngine.playJump();
    } else if (this.spiritConfig.id === 'phoenix') {
      // Phoenix Glide
      this.player.isGliding = true;
      this.player.vy = Math.min(this.player.vy, 1.2);
    }
  }

  public releaseJump() {
    this.player.isGliding = false;
    if (this.player.vy < -4) {
      this.player.vy *= 0.55; // Variable jump height
    }
  }

  public dash() {
    if (!this.isRunning || this.isPaused) return;
    if (this.dashCooldown > 0 && !this.isAwakened) return;

    this.isDashing = true;
    this.dashDurationTimer = 280; // 280ms of dash
    
    // Cooldown modified by spirit (Thunder Wolf gets 45% faster cooldown)
    const baseCd = this.spiritConfig.id === 'thunder_wolf' ? 1200 : 2200;
    this.dashCooldown = baseCd;

    // Trigger trail
    this.spawnDashBlast();
    soundEngine.playJump();

    // Frost Fox ability: freeze nearby hazards
    if (this.spiritConfig.id === 'frost_fox') {
      for (const obs of this.obstacles) {
        if (Math.abs(obs.x - this.player.x) < 220) {
          obs.isFrozen = true;
        }
      }
    }

    // Thunder Wolf lightning burst
    if (this.spiritConfig.id === 'thunder_wolf') {
      for (const obs of this.obstacles) {
        if (obs.x > this.player.x && obs.x < this.player.x + 180) {
          obs.isBroken = true;
          this.score += 25;
          this.createExplosion(obs.x + obs.width / 2, obs.y + obs.height / 2, '#F59E0B');
        }
      }
    }
  }

  public triggerAwakening() {
    if (this.spiritEnergy >= this.maxEnergy && !this.isAwakened) {
      this.isAwakened = true;
      this.awakeningTimer = this.awakeningDuration;
      this.spiritEnergy = 0;
      
      this.shake(300, 6);
      this.createExplosion(this.player.x + this.player.width / 2, this.player.y + this.player.height / 2, this.spiritConfig.color);
      soundEngine.playVictory();
    }
  }

  // --- GAME LOOP ---

  private loop = (timestamp: number) => {
    if (!this.isRunning || this.isPaused) return;

    const deltaTime = Math.min(timestamp - this.lastTime, 40); // Cap delta to prevent tunneling
    this.lastTime = timestamp;

    this.update(deltaTime);
    this.draw();

    this.animationFrameId = requestAnimationFrame(this.loop);
  };

  private update(deltaTime: number) {
    const dtSeconds = deltaTime / 1000;

    // 1. Calculate Speeds
    let speedMult = this.spiritConfig.stats.speed;
    if (this.isAwakened) speedMult *= 1.65;
    else if (this.isDashing) speedMult *= 2.1;

    // Accelerate gradually with distance
    this.currentSpeed = (this.baseSpeed + (this.distance / this.maxDistance) * 2.5) * speedMult;
    const worldStep = this.currentSpeed * (deltaTime / 16.6);

    // Progress distance
    this.distance += worldStep * 0.08;
    this.score += Math.round(worldStep * 0.35);

    // 2. Dash & Cooldown Timers
    if (this.dashCooldown > 0) this.dashCooldown -= deltaTime;
    if (this.isDashing) {
      this.dashDurationTimer -= deltaTime;
      if (this.dashDurationTimer <= 0) {
        this.isDashing = false;
      }
    }

    // 3. Invulnerability & Shake
    if (this.invulnerabilityTimer > 0) this.invulnerabilityTimer -= deltaTime;
    if (this.shakeTimer > 0) this.shakeTimer -= deltaTime;

    // 4. Awakening Timer
    if (this.isAwakened) {
      this.awakeningTimer -= deltaTime;
      if (this.awakeningTimer <= 0) {
        this.isAwakened = false;
      }
    }

    // 5. Player Physics
    if (this.player.isGliding && this.spiritConfig.id === 'phoenix') {
      this.player.vy += this.player.gravity * 0.25;
      if (this.player.vy > 1.8) this.player.vy = 1.8;
    } else {
      this.player.vy += this.player.gravity;
    }
    
    this.player.y += this.player.vy;

    // Platform & Ground Collision
    let onPlatform = false;
    this.currentRoute = 'RISKY';

    // Check elevated platforms
    for (const plat of this.platforms) {
      const prevY = this.player.y - this.player.vy;
      const isAbove = prevY + this.player.height <= plat.y + 12;
      const withinX = this.player.x + this.player.width * 0.7 > plat.x && this.player.x + this.player.width * 0.3 < plat.x + plat.width;

      if (isAbove && withinX && this.player.y + this.player.height >= plat.y && this.player.vy >= 0) {
        this.player.y = plat.y - this.player.height;
        this.player.vy = 0;
        this.player.isGrounded = true;
        this.player.canDoubleJump = true;
        this.player.isGliding = false;
        onPlatform = true;
        this.currentRoute = plat.routeType;
        break;
      }
    }

    // Floor Collision
    if (!onPlatform) {
      if (this.player.y >= this.groundY - this.player.height) {
        this.player.y = this.groundY - this.player.height;
        this.player.vy = 0;
        this.player.isGrounded = true;
        this.player.canDoubleJump = true;
        this.player.isGliding = false;
      } else {
        this.player.isGrounded = false;
      }
    }

    // 6. World Scrolling
    this.scrollWorld(worldStep);

    // 7. Entity Spawning
    this.spawnProgress += worldStep;
    if (this.spawnProgress > 160) {
      this.spawnProgress = 0;
      this.spawnNextChunk();
    }

    // 8. Handle Magnet & Collectibles
    this.updateCollectibles();

    // 9. Handle Obstacle Collisions
    this.updateObstacles();

    // 10. Check Milestone Events & Boss Chase
    this.checkMilestones();

    // 11. Particles & Visual FX
    this.updateParticles(deltaTime);
    this.updateMotionTrail();

    // 12. Check Victory Condition
    if (this.distance >= this.maxDistance) {
      this.triggerFinishVictory();
      return;
    }

    // 13. State Callback for UI HUD
    if (this.onStateUpdate) {
      this.onStateUpdate({
        distance: Math.min(Math.round(this.distance), this.maxDistance),
        maxDistance: this.maxDistance,
        score: this.score,
        coins: this.coins,
        spiritEnergy: Math.round(this.spiritEnergy),
        maxEnergy: this.maxEnergy,
        hp: this.hp,
        maxHp: this.maxHp,
        shield: this.shield,
        isAwakened: this.isAwakened,
        awakeningTimeRemaining: Math.max(0, Math.ceil(this.awakeningTimer / 1000)),
        cluesFound: this.cluesFound,
        activeRoute: this.currentRoute,
        speed: Math.round(this.currentSpeed * 10) / 10,
        isBossChasing: this.isBossChasing,
        dashCooldownRemaining: Math.max(0, Math.ceil(this.dashCooldown / 100) / 10),
        isDead: this.hp <= 0,
        isFinished: this.distance >= this.maxDistance
      });
    }
  }

  private scrollWorld(worldStep: number) {
    // Platforms
    for (let i = this.platforms.length - 1; i >= 0; i--) {
      this.platforms[i].x -= worldStep;
      if (this.platforms[i].x + this.platforms[i].width < -100) {
        this.platforms.splice(i, 1);
      }
    }

    // Obstacles
    for (let i = this.obstacles.length - 1; i >= 0; i--) {
      this.obstacles[i].x -= worldStep;
      if (this.obstacles[i].x + this.obstacles[i].width < -100) {
        this.obstacles.splice(i, 1);
      }
    }

    // Collectibles
    for (let i = this.collectibles.length - 1; i >= 0; i--) {
      this.collectibles[i].x -= worldStep;
      if (this.collectibles[i].x + this.collectibles[i].width < -100) {
        this.collectibles.splice(i, 1);
      }
    }

    // Boss position during climax
    if (this.isBossChasing) {
      this.bossX = Math.min(this.bossX + worldStep * 0.12, 10);
    }
  }

  private updateCollectibles() {
    const playerCenter = {
      x: this.player.x + this.player.width / 2,
      y: this.player.y + this.player.height / 2
    };

    // Magnet radius
    let magnetRadius = 60;
    if (this.isAwakened) magnetRadius = 600; // Fullscreen vacuum during Awakening
    else if (this.spiritConfig.id === 'celestial_kirin') magnetRadius = 180; // Passive kirin magnet

    for (let i = this.collectibles.length - 1; i >= 0; i--) {
      const item = this.collectibles[i];
      if (item.collected) continue;

      const itemCenter = {
        x: item.x + item.width / 2,
        y: item.y + item.height / 2
      };

      const dx = playerCenter.x - itemCenter.x;
      const dy = playerCenter.y - itemCenter.y;
      const dist = Math.sqrt(dx * dx + dy * dy);

      // Vacuum magnet pull
      if (dist < magnetRadius && !item.collected) {
        const pullStrength = this.isAwakened ? 0.22 : 0.08;
        item.x += dx * pullStrength;
        item.y += dy * pullStrength;
      }

      // Check pickup collision
      if (
        this.player.x < item.x + item.width &&
        this.player.x + this.player.width > item.x &&
        this.player.y < item.y + item.height &&
        this.player.y + this.player.height > item.y
      ) {
        item.collected = true;
        this.handleItemPickup(item);
        this.collectibles.splice(i, 1);
      }
    }
  }

  private handleItemPickup(item: CollectibleEntity) {
    soundEngine.playCoin();

    switch (item.type) {
      case 'COIN': {
        const coinVal = this.spiritConfig.id === 'celestial_kirin' ? 2 : 1;
        this.coins += coinVal;
        this.score += 15 * coinVal;
        this.addEnergy(2.5);
        this.createSparks(item.x, item.y, '#FBBF24', 5);
        break;
      }
      case 'SPIRIT_GEM': {
        this.score += 50;
        this.addEnergy(16);
        this.createSparks(item.x, item.y, this.spiritConfig.color, 9);
        break;
      }
      case 'MYSTERY_FRAGMENT': {
        if (this.cluesFound < this.maxClues) {
          this.cluesFound++;
          this.score += 100;
          this.addEnergy(35);
          soundEngine.playCorrect();
          this.createExplosion(item.x, item.y, '#EC4899');
        }
        break;
      }
      case 'HEALTH_HEART': {
        if (this.hp < this.maxHp) {
          this.hp++;
          soundEngine.playVictory();
          this.createSparks(item.x, item.y, '#EF4444', 8);
        }
        break;
      }
      case 'CHEST': {
        this.coins += 20;
        this.score += 250;
        this.addEnergy(40);
        soundEngine.playVictory();
        this.createExplosion(item.x, item.y, '#F59E0B');
        break;
      }
    }
  }

  private addEnergy(amount: number) {
    const prev = this.spiritEnergy;
    this.spiritEnergy = Math.min(this.maxEnergy, this.spiritEnergy + amount);

    // Deer passive: heal 1 HP when reaching 60+ energy
    if (this.spiritConfig.id === 'spirit_deer' && prev < 60 && this.spiritEnergy >= 60 && this.hp < this.maxHp) {
      this.hp++;
      this.createSparks(this.player.x, this.player.y, '#10B981', 12);
    }

    // Auto-trigger awakening when full
    if (this.spiritEnergy >= this.maxEnergy && !this.isAwakened) {
      this.triggerAwakening();
    }
  }

  private updateObstacles() {
    for (let i = this.obstacles.length - 1; i >= 0; i--) {
      const obs = this.obstacles[i];
      if (obs.isBroken) continue;

      // Hitbox check
      const hitPadding = 6;
      const isColliding =
        this.player.x + hitPadding < obs.x + obs.width &&
        this.player.x + this.player.width - hitPadding > obs.x &&
        this.player.y + hitPadding < obs.y + obs.height &&
        this.player.y + this.player.height - hitPadding > obs.y;

      if (isColliding) {
        if (this.isAwakened || this.isDashing) {
          // Smash obstacle!
          obs.isBroken = true;
          this.score += 40;
          this.addEnergy(6);
          this.shake(120, 3);
          this.createExplosion(obs.x + obs.width / 2, obs.y + obs.height / 2, this.realmConfig.hazardColor);
          soundEngine.playCoin();
          this.obstacles.splice(i, 1);
        } else if (obs.isFrozen) {
          // Shatter harmless frozen block
          obs.isBroken = true;
          this.score += 20;
          this.addEnergy(10);
          this.createExplosion(obs.x + obs.width / 2, obs.y + obs.height / 2, '#06B6D4');
          soundEngine.playCoin();
          this.obstacles.splice(i, 1);
        } else if (this.invulnerabilityTimer <= 0) {
          // Take Damage
          this.handlePlayerHit(obs);
          this.obstacles.splice(i, 1);
        }
      }
    }
  }

  private handlePlayerHit(obs: ObstacleEntity) {
    if (this.shield > 0) {
      // Shield absorbs
      this.shield--;
      this.invulnerabilityTimer = 1400;
      this.shake(200, 4);
      this.createExplosion(this.player.x, this.player.y, '#10B981');
      soundEngine.playWrong();
      return;
    }

    // Shadow Cat passive: first shadow dodge
    if (this.spiritConfig.id === 'shadow_cat' && this.invulnerabilityTimer <= 0 && Math.random() < 0.35) {
      this.invulnerabilityTimer = 1600;
      this.shake(150, 3);
      this.createExplosion(this.player.x, this.player.y, '#A855F7');
      soundEngine.playJump();
      return;
    }

    // Deduct HP
    this.hp--;
    this.invulnerabilityTimer = 1600; // 1.6s invulnerable
    this.shake(350, 8);
    soundEngine.playWrong();
    this.createExplosion(this.player.x + this.player.width / 2, this.player.y + this.player.height / 2, '#EF4444');

    if (this.hp <= 0) {
      this.triggerGameOver(false);
    }
  }

  // --- MILESTONES & EVENTS ---

  private checkMilestones() {
    // Climax Boss Chase at 1000m+
    if (this.distance >= 1000 && !this.isBossChasing) {
      this.isBossChasing = true;
      this.shake(800, 10);
      soundEngine.playWrong();
    }

    // Event 1 at ~380m: Spirit Encounter
    if (this.distance >= 380 && !this.triggeredEvents.has(1)) {
      this.triggeredEvents.add(1);
      this.triggerEncounterEvent();
    }

    // Event 2 at ~780m: Ancient Shrine
    if (this.distance >= 780 && !this.triggeredEvents.has(2)) {
      this.triggeredEvents.add(2);
      this.triggerShrineEvent();
    }
  }

  private triggerEncounterEvent() {
    if (!this.onEventTrigger) return;
    this.pause();

    const event: InRunEvent = {
      id: 'spirit_encounter',
      title: 'Linh Thú Huyền Bí Xuất Hiện!',
      subtitle: 'Một sinh linh ánh sáng rực rỡ lướt ngang tiền phương.',
      description: 'Linh thú thần bí đang vẫy gọi bạn chọn lộ trình vượt ải tiếp theo.',
      choices: [
        {
          label: 'Săn Đuổi (Chase)',
          description: 'Tăng tốc độ, mở ra đường hiểm trở nhiều bẫy nhưng xuất hiện Rương Vàng & Linh Thạch!',
          riskType: 'RISK',
          onChoose: () => {
            this.resume();
            this.spawnHighRewardCluster();
            this.baseSpeed += 1.0;
            soundEngine.playVictory();
          }
        },
        {
          label: 'Bỏ Qua (Ignore)',
          description: 'Tiếp tục lộ trình an toàn, ban thưởng 1 Lá Chắn Linh Lực bảo vệ.',
          riskType: 'SAFE',
          onChoose: () => {
            this.resume();
            this.shield = Math.min(this.shield + 1, 2);
            soundEngine.playCoin();
          }
        }
      ]
    };

    this.onEventTrigger(event);
  }

  private triggerShrineEvent() {
    if (!this.onEventTrigger) return;
    this.pause();

    const event: InRunEvent = {
      id: 'ancient_shrine',
      title: 'Cổ Miếu Thần Bí',
      subtitle: 'Đền thờ linh thiêng ngàn năm phủ đầy cổ tự phát quang.',
      description: 'Bạn muốn bước vào tìm kiếm bí mật hay vội vã lướt qua để tiết kiệm sức lực?',
      choices: [
        {
          label: 'Vào Khám Phá (Enter Shrine)',
          description: 'Hấp thu cổ năng: Nhận ngay 1 Mảnh Ẩn Số (Mystery Clue) & 40 Linh Lực!',
          riskType: 'RISK',
          onChoose: () => {
            this.resume();
            if (this.cluesFound < this.maxClues) this.cluesFound++;
            this.addEnergy(40);
            soundEngine.playCorrect();
          }
        },
        {
          label: 'Rời Đi Nhanh (Leave)',
          description: 'Không mạo hiểm, nhận bùa bứt tốc độ và hồi phục 1 Máu.',
          riskType: 'SAFE',
          onChoose: () => {
            this.resume();
            if (this.hp < this.maxHp) this.hp++;
            this.addEnergy(15);
            soundEngine.playCoin();
          }
        }
      ]
    };

    this.onEventTrigger(event);
  }

  private spawnHighRewardCluster() {
    const startX = this.canvas.width + 100;
    // Spawn chest
    this.collectibles.push({
      id: Math.random().toString(),
      x: startX + 300,
      y: this.groundY - 140,
      width: 34,
      height: 34,
      type: 'CHEST',
      collected: false,
      value: 100,
      floatOffset: 0,
      routeType: 'RISKY'
    });

    // Spawn 5 dense coins
    for (let i = 0; i < 5; i++) {
      this.collectibles.push({
        id: Math.random().toString(),
        x: startX + 100 + i * 40,
        y: this.groundY - 100 - (i % 2) * 30,
        width: 22,
        height: 22,
        type: 'COIN',
        collected: false,
        value: 10,
        floatOffset: i,
        routeType: 'RISKY'
      });
    }
  }

  // --- PROCEDURAL TERRAIN GENERATOR ---

  private generateInitialTerrain() {
    // Generate initial platforms
    this.platforms.push({
      x: 350,
      y: this.groundY - 90,
      width: 260,
      height: 18,
      routeType: 'SAFE',
      color: this.realmConfig.safeRouteColor
    });

    this.platforms.push({
      x: 680,
      y: this.groundY - 150,
      width: 220,
      height: 18,
      routeType: 'SAFE',
      color: this.realmConfig.safeRouteColor
    });

    // Secret platform
    this.platforms.push({
      x: 950,
      y: this.groundY - 210,
      width: 180,
      height: 18,
      routeType: 'SECRET',
      color: this.realmConfig.secretRouteColor
    });
  }

  private spawnNextChunk() {
    const spawnX = this.canvas.width + 40;
    const rand = Math.random();

    // 1. Branching Platforms
    if (rand < 0.65) {
      const isSecret = rand < 0.18 || (this.spiritConfig.id === 'shadow_cat' && rand < 0.32);
      const platY = isSecret ? this.groundY - 180 - Math.random() * 40 : this.groundY - 80 - Math.random() * 70;
      const platWidth = 160 + Math.random() * 120;
      const routeType: RouteType = isSecret ? 'SECRET' : 'SAFE';

      this.platforms.push({
        x: spawnX,
        y: platY,
        width: platWidth,
        height: 18,
        routeType,
        color: isSecret ? this.realmConfig.secretRouteColor : this.realmConfig.safeRouteColor
      });

      // Spawn reward on elevated platform
      if (isSecret) {
        // Secret platforms often hold Mystery Clues or Spirit Gems
        const hasClue = this.cluesFound < this.maxClues && Math.random() < 0.45;
        this.collectibles.push({
          id: Math.random().toString(),
          x: spawnX + platWidth / 2 - 12,
          y: platY - 40,
          width: 24,
          height: 24,
          type: hasClue ? 'MYSTERY_FRAGMENT' : 'SPIRIT_GEM',
          collected: false,
          value: 50,
          floatOffset: Math.random() * 5,
          routeType: 'SECRET'
        });
      } else {
        // Safe platform has coins
        for (let i = 0; i < 3; i++) {
          this.collectibles.push({
            id: Math.random().toString(),
            x: spawnX + 30 + i * 40,
            y: platY - 32,
            width: 20,
            height: 20,
            type: 'COIN',
            collected: false,
            value: 10,
            floatOffset: i,
            routeType: 'SAFE'
          });
        }
      }
    }

    // 2. Obstacles on Risky ground
    if (Math.random() < this.realmConfig.obstacleSpawnRate) {
      const obsTypes: ObstacleEntity['type'][] = ['SPIKE', 'TOTEM', 'FIRE_TRAP', 'FALLING_ROCK'];
      const obsType = obsTypes[Math.floor(Math.random() * obsTypes.length)];
      const obsHeight = obsType === 'TOTEM' ? 52 : 36;
      const obsWidth = obsType === 'SPIKE' ? 32 : 38;

      this.obstacles.push({
        id: Math.random().toString(),
        x: spawnX + 120,
        y: this.groundY - obsHeight,
        width: obsWidth,
        height: obsHeight,
        type: obsType,
        isFrozen: false,
        isBroken: false,
        routeType: 'RISKY'
      });
    }

    // 3. Collectibles on ground (Risky route)
    if (Math.random() < 0.7) {
      const isGem = Math.random() < 0.28;
      this.collectibles.push({
        id: Math.random().toString(),
        x: spawnX + 60,
        y: this.groundY - 32,
        width: 20,
        height: 20,
        type: isGem ? 'SPIRIT_GEM' : 'COIN',
        collected: false,
        value: isGem ? 30 : 10,
        floatOffset: 0,
        routeType: 'RISKY'
      });
    }
  }

  // --- PARTICLES & FX ---

  private spawnJumpPuff() {
    for (let i = 0; i < 6; i++) {
      this.particles.push({
        x: this.player.x + this.player.width / 2 + (Math.random() - 0.5) * 20,
        y: this.player.y + this.player.height,
        vx: (Math.random() - 0.5) * 2 - 1,
        vy: -Math.random() * 2,
        size: 3 + Math.random() * 3,
        alpha: 0.8,
        color: '#E2E8F0',
        life: 0,
        maxLife: 200 + Math.random() * 150
      });
    }
  }

  private spawnDashBlast() {
    for (let i = 0; i < 14; i++) {
      this.particles.push({
        x: this.player.x,
        y: this.player.y + Math.random() * this.player.height,
        vx: -3 - Math.random() * 4,
        vy: (Math.random() - 0.5) * 3,
        size: 4 + Math.random() * 4,
        alpha: 1,
        color: this.spiritConfig.color,
        life: 0,
        maxLife: 300
      });
    }
  }

  private createExplosion(x: number, y: number, color: string) {
    for (let i = 0; i < 16; i++) {
      const angle = (Math.PI * 2 * i) / 16;
      const spd = 2 + Math.random() * 3.5;
      this.particles.push({
        x,
        y,
        vx: Math.cos(angle) * spd,
        vy: Math.sin(angle) * spd,
        size: 3 + Math.random() * 4,
        alpha: 1,
        color,
        life: 0,
        maxLife: 350 + Math.random() * 150
      });
    }
  }

  private createSparks(x: number, y: number, color: string, count: number) {
    for (let i = 0; i < count; i++) {
      this.particles.push({
        x,
        y,
        vx: (Math.random() - 0.5) * 3,
        vy: -1 - Math.random() * 3,
        size: 2 + Math.random() * 3,
        alpha: 0.9,
        color,
        life: 0,
        maxLife: 250
      });
    }
  }

  private shake(duration: number, intensity: number) {
    this.shakeTimer = duration;
    this.shakeIntensity = intensity;
  }

  private updateParticles(deltaTime: number) {
    // Ambient Realm Particles
    if (this.particles.length < 40 && Math.random() < 0.3) {
      this.particles.push({
        x: this.canvas.width + 10,
        y: Math.random() * (this.groundY - 40),
        vx: -1.5 - Math.random() * 2,
        vy: (Math.random() - 0.5) * 1.2,
        size: 2 + Math.random() * 3,
        alpha: 0.6,
        color: this.realmConfig.accentColor,
        life: 0,
        maxLife: 3000
      });
    }

    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.x += p.vx;
      p.y += p.vy;
      p.life += deltaTime;
      p.alpha = Math.max(0, 1 - p.life / p.maxLife);

      if (p.life >= p.maxLife) {
        this.particles.splice(i, 1);
      }
    }
  }

  private updateMotionTrail() {
    this.trailPositions.unshift({
      x: this.player.x,
      y: this.player.y,
      alpha: this.isAwakened ? 0.7 : this.isDashing ? 0.5 : 0.2,
      color: this.isAwakened ? '#FBBF24' : this.spiritConfig.color
    });

    if (this.trailPositions.length > 8) {
      this.trailPositions.pop();
    }
  }

  // --- FINISH & GAME OVER ---

  private triggerFinishVictory() {
    this.stop();
    soundEngine.playVictory();
    if (this.onGameOver) {
      this.onGameOver(this.score, this.cluesFound, this.coins, true);
    }
  }

  private triggerGameOver(victory: boolean) {
    this.stop();
    soundEngine.playWrong();
    if (this.onGameOver) {
      this.onGameOver(this.score, this.cluesFound, this.coins, victory);
    }
  }

  // --- RENDERING ---

  private draw() {
    this.ctx.save();

    // Screen Shake
    if (this.shakeTimer > 0) {
      const ox = (Math.random() - 0.5) * this.shakeIntensity;
      const oy = (Math.random() - 0.5) * this.shakeIntensity;
      this.ctx.translate(ox, oy);
    }

    // 1. Sky Gradient Background
    const skyGrad = this.ctx.createLinearGradient(0, 0, 0, this.canvas.height);
    skyGrad.addColorStop(0, this.realmConfig.skyColors[0]);
    skyGrad.addColorStop(1, this.realmConfig.skyColors[1]);
    this.ctx.fillStyle = skyGrad;
    this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

    // 2. Parallax Mountain / Canopy Silhouettes
    this.drawParallaxBackdrop();

    // 3. Boss Silhouette during Climax
    if (this.isBossChasing) {
      this.drawBossSilhouette();
    }

    // 4. Ground Layer
    this.drawGround();

    // 5. Elevated Platforms (Safe & Secret routes)
    this.drawPlatforms();

    // 6. Obstacles
    this.drawObstacles();

    // 7. Collectibles (Coins, Gems, Clues, Chests)
    this.drawCollectibles();

    // 8. Player Motion Trail
    this.drawMotionTrail();

    // 9. Player Spirit Avatar
    this.drawPlayer();

    // 10. Particles
    this.drawParticles();

    // 11. Finish Line / Ancient Seal Gate
    this.drawFinishGate();

    // 12. Damage Blink Overlay
    if (this.invulnerabilityTimer > 0 && Math.floor(Date.now() / 80) % 2 === 0) {
      this.ctx.fillStyle = 'rgba(239, 68, 68, 0.15)';
      this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
    }

    this.ctx.restore();
  }

  private drawParallaxBackdrop() {
    const time = Date.now() * 0.001;
    // Parallax stars/moons/elements
    this.ctx.fillStyle = 'rgba(255, 255, 255, 0.05)';
    for (let i = 0; i < 5; i++) {
      const px = ((i * 180) - (this.distance * 0.2)) % this.canvas.width;
      const drawX = px < 0 ? px + this.canvas.width : px;
      this.ctx.beginPath();
      this.ctx.arc(drawX, 70 + (i % 3) * 30, 24, 0, Math.PI * 2);
      this.ctx.fill();
    }

    // Distant mountain ridges
    this.ctx.fillStyle = 'rgba(0, 0, 0, 0.25)';
    this.ctx.beginPath();
    this.ctx.moveTo(0, this.groundY);
    for (let x = 0; x <= this.canvas.width; x += 60) {
      const mountainY = this.groundY - 110 - Math.sin((x + this.distance * 0.5) * 0.015) * 45;
      this.ctx.lineTo(x, mountainY);
    }
    this.ctx.lineTo(this.canvas.width, this.groundY);
    this.ctx.closePath();
    this.ctx.fill();
  }

  private drawBossSilhouette() {
    this.ctx.save();
    this.ctx.fillStyle = 'rgba(15, 7, 26, 0.85)';
    this.ctx.shadowColor = '#DC2626';
    this.ctx.shadowBlur = 25;

    // Dark clawing titan in background
    const bx = this.bossX;
    const by = this.groundY - 180;
    this.ctx.beginPath();
    this.ctx.arc(bx + 60, by + 40, 70, 0, Math.PI * 2);
    this.ctx.rect(bx - 20, by + 40, 160, 140);
    this.ctx.fill();

    // Glowing menacing eyes
    this.ctx.fillStyle = '#EF4444';
    this.ctx.beginPath();
    this.ctx.arc(bx + 85, by + 30, 7, 0, Math.PI * 2);
    this.ctx.arc(bx + 115, by + 30, 7, 0, Math.PI * 2);
    this.ctx.fill();

    this.ctx.restore();
  }

  private drawGround() {
    // Ground Base
    this.ctx.fillStyle = this.realmConfig.groundColor;
    this.ctx.fillRect(0, this.groundY, this.canvas.width, this.canvas.height - this.groundY);

    // Glowing Grass/Lava Top Edge
    this.ctx.fillStyle = this.realmConfig.accentColor;
    this.ctx.fillRect(0, this.groundY, this.canvas.width, 5);

    // Ground Texture lines
    this.ctx.strokeStyle = 'rgba(0, 0, 0, 0.3)';
    this.ctx.lineWidth = 2;
    for (let i = 0; i < 8; i++) {
      const gx = ((i * 120) - (this.distance * 3)) % this.canvas.width;
      const x = gx < 0 ? gx + this.canvas.width : gx;
      this.ctx.beginPath();
      this.ctx.moveTo(x, this.groundY + 8);
      this.ctx.lineTo(x + 40, this.groundY + 8);
      this.ctx.stroke();
    }
  }

  private drawPlatforms() {
    for (const plat of this.platforms) {
      this.ctx.save();

      // Platform Glow
      if (plat.routeType === 'SECRET') {
        this.ctx.shadowColor = '#A855F7';
        this.ctx.shadowBlur = 12;
      }

      // Platform Surface
      this.ctx.fillStyle = plat.color || this.realmConfig.safeRouteColor;
      this.ctx.beginPath();
      this.ctx.roundRect(plat.x, plat.y, plat.width, plat.height, [6, 6, 2, 2]);
      this.ctx.fill();

      // Top glowing line
      this.ctx.fillStyle = 'rgba(255, 255, 255, 0.6)';
      this.ctx.fillRect(plat.x + 4, plat.y, plat.width - 8, 3);

      // Route badge indicator on platform edge
      if (plat.routeType === 'SECRET') {
        this.ctx.fillStyle = '#F43F5E';
        this.ctx.font = 'bold 9px monospace';
        this.ctx.fillText('SECRET', plat.x + 8, plat.y + 13);
      }

      this.ctx.restore();
    }
  }

  private drawObstacles() {
    for (const obs of this.obstacles) {
      this.ctx.save();

      if (obs.isFrozen) {
        // Frozen hazard block
        this.ctx.fillStyle = '#06B6D4';
        this.ctx.strokeStyle = '#E0F2FE';
        this.ctx.lineWidth = 2;
        this.ctx.fillRect(obs.x, obs.y, obs.width, obs.height);
        this.ctx.strokeRect(obs.x, obs.y, obs.width, obs.height);
      } else {
        // Normal dangerous hazard
        this.ctx.fillStyle = this.realmConfig.hazardColor;
        this.ctx.shadowColor = '#DC2626';
        this.ctx.shadowBlur = 8;

        if (obs.type === 'SPIKE') {
          // Sharp Triangles
          this.ctx.beginPath();
          this.ctx.moveTo(obs.x, obs.y + obs.height);
          this.ctx.lineTo(obs.x + obs.width / 2, obs.y);
          this.ctx.lineTo(obs.x + obs.width, obs.y + obs.height);
          this.ctx.closePath();
          this.ctx.fill();
        } else {
          // Ancient Totem / Barrier
          this.ctx.beginPath();
          this.ctx.roundRect(obs.x, obs.y, obs.width, obs.height, 4);
          this.ctx.fill();

          // Hazard eyes / runes
          this.ctx.fillStyle = '#EF4444';
          this.ctx.fillRect(obs.x + 8, obs.y + 10, obs.width - 16, 4);
        }
      }

      this.ctx.restore();
    }
  }

  private drawCollectibles() {
    const time = Date.now() * 0.005;

    for (const item of this.collectibles) {
      if (item.collected) continue;

      this.ctx.save();
      const floatY = Math.sin(time + item.floatOffset) * 4;
      const cy = item.y + floatY;

      switch (item.type) {
        case 'COIN': {
          this.ctx.fillStyle = '#FBBF24';
          this.ctx.shadowColor = '#F59E0B';
          this.ctx.shadowBlur = 10;
          this.ctx.beginPath();
          this.ctx.arc(item.x + item.width / 2, cy + item.height / 2, item.width / 2, 0, Math.PI * 2);
          this.ctx.fill();

          // Coin Inner Ring
          this.ctx.strokeStyle = '#D97706';
          this.ctx.lineWidth = 2;
          this.ctx.stroke();
          break;
        }
        case 'SPIRIT_GEM': {
          // Diamond Gem
          this.ctx.fillStyle = this.spiritConfig.color;
          this.ctx.shadowColor = this.spiritConfig.glowColor;
          this.ctx.shadowBlur = 14;

          const cx = item.x + item.width / 2;
          const cyCenter = cy + item.height / 2;
          this.ctx.beginPath();
          this.ctx.moveTo(cx, cyCenter - item.height / 2);
          this.ctx.lineTo(cx + item.width / 2, cyCenter);
          this.ctx.lineTo(cx, cyCenter + item.height / 2);
          this.ctx.lineTo(cx - item.width / 2, cyCenter);
          this.ctx.closePath();
          this.ctx.fill();
          break;
        }
        case 'MYSTERY_FRAGMENT': {
          // Shimmering Hexagon Fragment
          this.ctx.fillStyle = '#EC4899';
          this.ctx.shadowColor = '#F43F5E';
          this.ctx.shadowBlur = 18;

          this.ctx.beginPath();
          this.ctx.arc(item.x + item.width / 2, cy + item.height / 2, item.width / 1.8, 0, Math.PI * 2);
          this.ctx.fill();

          // Center '?' mark
          this.ctx.fillStyle = '#FFFFFF';
          this.ctx.font = 'bold 12px sans-serif';
          this.ctx.textAlign = 'center';
          this.ctx.textBaseline = 'middle';
          this.ctx.fillText('?', item.x + item.width / 2, cy + item.height / 2);
          break;
        }
        case 'CHEST': {
          // Golden Treasure Chest
          this.ctx.fillStyle = '#D97706';
          this.ctx.fillRect(item.x, cy + 6, item.width, item.height - 6);
          this.ctx.fillStyle = '#FBBF24';
          this.ctx.fillRect(item.x, cy, item.width, 8);
          // Keyhole
          this.ctx.fillStyle = '#1E293B';
          this.ctx.fillRect(item.x + item.width / 2 - 2, cy + 12, 4, 6);
          break;
        }
      }

      this.ctx.restore();
    }
  }

  private drawMotionTrail() {
    for (let i = 0; i < this.trailPositions.length; i++) {
      const t = this.trailPositions[i];
      const factor = (1 - i / this.trailPositions.length) * t.alpha;

      this.ctx.save();
      this.ctx.globalAlpha = factor;
      this.ctx.fillStyle = t.color;
      this.ctx.beginPath();
      this.ctx.roundRect(t.x + 4, t.y + 4, this.player.width - 8, this.player.height - 8, 12);
      this.ctx.fill();
      this.ctx.restore();
    }
  }

  private drawPlayer() {
    this.ctx.save();

    const px = this.player.x;
    const py = this.player.y;
    const pw = this.player.width;
    const ph = this.player.height;

    // 1. Awakening Aura
    if (this.isAwakened) {
      this.ctx.shadowColor = this.spiritConfig.color;
      this.ctx.shadowBlur = 30;
      this.ctx.strokeStyle = '#FBBF24';
      this.ctx.lineWidth = 4;
      this.ctx.beginPath();
      this.ctx.arc(px + pw / 2, py + ph / 2, ph * 0.75, 0, Math.PI * 2);
      this.ctx.stroke();
    }

    // 2. Shield Bubble
    if (this.shield > 0) {
      this.ctx.strokeStyle = '#10B981';
      this.ctx.lineWidth = 2.5;
      this.ctx.beginPath();
      this.ctx.arc(px + pw / 2, py + ph / 2, ph * 0.65, 0, Math.PI * 2);
      this.ctx.stroke();
    }

    // 3. Spirit Body
    const bodyGrad = this.ctx.createLinearGradient(px, py, px, py + ph);
    bodyGrad.addColorStop(0, this.spiritConfig.color);
    bodyGrad.addColorStop(1, this.spiritConfig.secondaryColor);
    this.ctx.fillStyle = bodyGrad;

    this.ctx.beginPath();
    this.ctx.roundRect(px, py, pw, ph, 14);
    this.ctx.fill();

    // 4. Spirit Elemental Core / Emblem
    this.ctx.fillStyle = '#FFFFFF';
    this.ctx.beginPath();
    this.ctx.arc(px + pw / 2, py + ph * 0.4, 7, 0, Math.PI * 2);
    this.ctx.fill();

    // 5. Eyes
    this.ctx.fillStyle = '#0F172A';
    this.ctx.beginPath();
    this.ctx.arc(px + pw * 0.7, py + ph * 0.32, 3.5, 0, Math.PI * 2);
    this.ctx.fill();

    // 6. Phoenix Wings / Wolf Sparks
    if (this.spiritConfig.id === 'phoenix' && this.player.isGliding) {
      // Fire Wings
      this.ctx.fillStyle = '#F59E0B';
      this.ctx.beginPath();
      this.ctx.moveTo(px, py + ph * 0.4);
      this.ctx.lineTo(px - 26, py + ph * 0.2);
      this.ctx.lineTo(px - 6, py + ph * 0.6);
      this.ctx.closePath();
      this.ctx.fill();
    }

    this.ctx.restore();
  }

  private drawParticles() {
    for (const p of this.particles) {
      this.ctx.save();
      this.ctx.globalAlpha = p.alpha;
      this.ctx.fillStyle = p.color;
      this.ctx.beginPath();
      this.ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
      this.ctx.fill();
      this.ctx.restore();
    }
  }

  private drawFinishGate() {
    const finishRemaining = this.maxDistance - this.distance;
    if (finishRemaining < 180) {
      // Ancient Seal Gate coming into view!
      const gateX = this.canvas.width - finishRemaining * 4;
      this.ctx.save();
      this.ctx.shadowColor = '#38BDF8';
      this.ctx.shadowBlur = 35;

      // Glowing Archway Pillars
      this.ctx.fillStyle = '#F8FAFC';
      this.ctx.fillRect(gateX, this.groundY - 220, 24, 220);
      this.ctx.fillRect(gateX + 100, this.groundY - 220, 24, 220);

      // Arch Portal
      this.ctx.fillStyle = 'rgba(56, 189, 248, 0.4)';
      this.ctx.beginPath();
      this.ctx.arc(gateX + 62, this.groundY - 110, 50, 0, Math.PI * 2);
      this.ctx.fill();

      // Radiant text
      this.ctx.fillStyle = '#FFFFFF';
      this.ctx.font = 'bold 13px sans-serif';
      this.ctx.textAlign = 'center';
      this.ctx.fillText('ANCIENT SEAL', gateX + 62, this.groundY - 180);

      this.ctx.restore();
    }
  }
}
