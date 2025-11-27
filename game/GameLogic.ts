
import { GameState, ActivePowerup, GameMode, PowerupType } from '../types';
import { GAME_CONSTANTS, COLORS, BATTLE_CONSTANTS } from '../constants';
import { audioService } from '../services/audioService';
import { pointToSegmentDistance } from '../utils/collision';

import { BirdController } from './controllers/BirdController';
import { PipeController } from './controllers/PipeController';
import { PowerupController } from './controllers/PowerupController';
import { BattleController } from './controllers/BattleController';
import { ProjectileController } from './controllers/ProjectileController';
import { ParticleController } from './controllers/ParticleController';

interface GameLogicCallbacks {
  setGameState: (state: GameState) => void;
  setScore: (score: number) => void;
  triggerEffect: () => void;
  setActivePowerup: (powerup: ActivePowerup | null) => void;
  setBossActive: (active: boolean, hp: number, maxHp: number) => void;
}

export class GameLogic {
  public gameState: GameState = GameState.START;
  public score: number = 0;
  public speed: number = GAME_CONSTANTS.BASE_PIPE_SPEED;
  public frameCount: number = 0;
  public isRoundActive: boolean = false;

  public timeScale: number = 1.0;
  public targetTimeScale: number = 1.0;
  public activePowerup: ActivePowerup | null = null;
  public nextBossScore: number = BATTLE_CONSTANTS.BOSS_INTERVAL;

  private callbacks: GameLogicCallbacks;
  private gameMode: GameMode = 'standard';
  private initialPowerup: PowerupType | null = null;
  private currentSkinTrail: string = 'none';
  private currentSkinColors: any = {};

  // Controllers
  public birdCtrl: BirdController;
  public pipeCtrl: PipeController;
  public powerupCtrl: PowerupController;
  public battleCtrl: BattleController;
  public projectileCtrl: ProjectileController;
  public particleCtrl: ParticleController;

  constructor(callbacks: GameLogicCallbacks) {
    this.callbacks = callbacks;
    this.birdCtrl = new BirdController();
    this.pipeCtrl = new PipeController();
    this.powerupCtrl = new PowerupController();
    this.battleCtrl = new BattleController();
    this.projectileCtrl = new ProjectileController();
    this.particleCtrl = new ParticleController();
  }

  // Getters for Renderer compatibility
  get bird() { return this.birdCtrl.bird; }
  get pipes() { return this.pipeCtrl.pipes; }
  get powerups() { return this.powerupCtrl.powerups; }
  get particles() { return this.particleCtrl.particles; }
  get projectiles() { return this.projectileCtrl.projectiles; }
  get bossProjectiles() { return this.battleCtrl.bossProjectiles; }
  get enemies() { return this.battleCtrl.enemies; }
  get boss() { return this.battleCtrl.boss; }

  public updateProps(gameState: GameState, gameMode: GameMode, initialPowerup: PowerupType | null, skin: any) {
    this.gameState = gameState;
    this.gameMode = gameMode;
    this.initialPowerup = initialPowerup;
    this.currentSkinTrail = skin.trail;
    this.currentSkinColors = skin.colors;
  }

  public reset(spawnEntities: boolean = false, width: number, height: number) {
    this.isRoundActive = false;
    this.score = 0;
    this.speed = GAME_CONSTANTS.BASE_PIPE_SPEED;
    this.frameCount = 0;
    this.nextBossScore = BATTLE_CONSTANTS.BOSS_INTERVAL;
    this.timeScale = 1.0;
    this.targetTimeScale = 1.0;
    this.activePowerup = null;

    this.callbacks.setActivePowerup(null);
    this.callbacks.setScore(0);
    this.callbacks.setBossActive(false, 0, 0);

    // Reset Controllers
    this.birdCtrl.reset(height);
    this.pipeCtrl.reset();
    this.powerupCtrl.reset();
    this.battleCtrl.reset(width, height);
    this.projectileCtrl.reset();
    this.particleCtrl.reset();

    if (spawnEntities) {
        if (this.gameMode !== 'battle') {
            this.pipeCtrl.addInitialPipe(width, height);
        }

        if (this.gameMode === 'battle') {
            const weaponType = (this.initialPowerup && this.initialPowerup.startsWith('gun')) 
                ? this.initialPowerup 
                : 'gun';
            this.activatePowerup(weaponType, 9999999);
            audioService.playShieldUp();
        } else if (this.initialPowerup) {
            let type = this.initialPowerup;
            if (type === 'random') {
                const types: PowerupType[] = ['shrink', 'grow', 'slowmo', 'fast', 'shield', 'ghost', 'gun'];
                type = types[Math.floor(Math.random() * types.length)];
            }
            this.activatePowerup(type, 999999);
        }
    }
  }

  public jump() {
    if (this.gameState !== GameState.PLAYING) return;
    if (!this.isRoundActive) {
        this.isRoundActive = true;
    }
    this.birdCtrl.jump();
  }

  public update(dtRaw: number, width: number, height: number) {
    if (this.gameState === GameState.PAUSED) return;
    
    // Time scaling logic
    this.timeScale += (this.targetTimeScale - this.timeScale) * (0.1 * dtRaw);
    const dt = dtRaw * this.timeScale;
    
    const isPlaying = this.gameState === GameState.PLAYING;
    const birdX = width * GAME_CONSTANTS.BIRD_X_POSITION; 
    
    // 1. UPDATE CONTROLLERS
    this.birdCtrl.update(dt, height, this.isRoundActive, this.gameState);
    
    // Always update visuals even if Game Over (for particles/explosions)
    this.particleCtrl.spawnTrail(this.frameCount, birdX, this.bird.y, this.currentSkinTrail, this.currentSkinColors);
    this.particleCtrl.spawnBulletTrails(this.frameCount, this.projectiles);
    this.particleCtrl.update(dt);
    
    this.projectileCtrl.update(dt, width);
    this.battleCtrl.updateBossProjectiles(dt, height);

    if (!isPlaying) return;
    if (!this.isRoundActive) return;

    this.frameCount += dt;
    this.speed += GAME_CONSTANTS.SPEED_INCREMENT * dt;
    const moveSpeed = (this.speed) * dt;

    // Powerup Timer Logic
    if (this.gameMode !== 'battle') {
       if (this.activePowerup) {
           this.activePowerup.timeLeft = this.bird.effectTimer;
           this.callbacks.setActivePowerup({ ...this.activePowerup });
           
           if (this.bird.effectTimer <= 0) {
               this.clearPowerup();
           }
       }
    }

    // Battle Mode Logic
    if (this.gameMode === 'battle') {
        const now = performance.now();
        // Spawning
        if (!this.boss.active && this.score >= this.nextBossScore && this.enemies.length === 0) {
             const boss = this.battleCtrl.activateBoss(this.score, width, height);
             this.callbacks.setBossActive(true, boss.hp, boss.maxHp);
        }
        if (!this.boss.active && this.score < this.nextBossScore) {
             this.battleCtrl.spawnEnemy(this.score, this.frameCount, width, height);
        }
        
        // Updates
        this.battleCtrl.updateEnemies(dt, this.score, this.frameCount, this.bird.y, width);
        this.battleCtrl.updateBoss(dt, this.score, width, height, this.bird.y, birdX, now);
        
        // Shoot boss projectiles (handled in updateBoss logic internally for timing, spawned into list)
    } else {
        // Standard Mode Spawning
        this.pipeCtrl.spawn(this.frameCount, this.speed, this.timeScale, width, height);
        
        // Prevent powerup spawning in playground mode
        if (this.gameMode !== 'playground') {
            this.powerupCtrl.spawn(this.frameCount, this.timeScale, width, height, this.pipes);
        }
    }
    
    // Weapon Firing
    if (this.activePowerup?.type.startsWith('gun')) {
        this.projectileCtrl.tryShoot(this.frameCount, this.activePowerup.type, birdX, this.bird.y, this.gameMode, this.score);
    }

    // Entity Movement
    this.pipeCtrl.update(dt, this.speed);
    this.powerupCtrl.update(dt, this.speed);

    // 2. CHECK COLLISIONS & INTERACTIONS
    const birdCollideRadius = (GAME_CONSTANTS.BIRD_RADIUS * this.bird.scale) - 2;
    
    this.checkPowerupCollisions(birdX, birdCollideRadius);
    this.checkPipeCollisions(birdX, birdCollideRadius);
    this.checkBattleCollisions(birdX, birdCollideRadius, dt);
    this.checkProjectileCollisions(width, dt);

    // Ground/Ceiling
    if (this.bird.y + birdCollideRadius >= height || this.bird.y - birdCollideRadius <= 0) {
       this.handleCrash();
    }
  }

  // --- INTERACTION LOGIC ---

  private activatePowerup(type: PowerupType, duration: number) {
      switch (type) {
          case 'shrink': this.birdCtrl.setEffect(GAME_CONSTANTS.SCALE_SHRINK, duration); audioService.playShrink(); break;
          case 'grow': this.birdCtrl.setEffect(GAME_CONSTANTS.SCALE_GROW, duration); audioService.playGrow(); break;
          case 'slowmo': this.targetTimeScale = GAME_CONSTANTS.TIME_SCALE_SLOW; this.birdCtrl.setEffect(GAME_CONSTANTS.SCALE_NORMAL, duration); audioService.playSlowMo(); break;
          case 'fast': this.targetTimeScale = GAME_CONSTANTS.TIME_SCALE_FAST; this.birdCtrl.setEffect(GAME_CONSTANTS.SCALE_NORMAL, duration); audioService.playFastForward(); break;
          case 'shield': this.birdCtrl.setEffect(GAME_CONSTANTS.SCALE_NORMAL, duration); audioService.playShieldUp(); break;
          case 'ghost': this.birdCtrl.setEffect(GAME_CONSTANTS.SCALE_NORMAL, duration); audioService.playGhost(); break;
          case 'gun': 
          case 'gun_spread':
          case 'gun_rapid':
          case 'gun_double':
          case 'gun_wave':
          case 'gun_pulse':
             this.birdCtrl.setEffect(GAME_CONSTANTS.SCALE_NORMAL, duration); audioService.playShieldUp(); break;
      }
      this.activePowerup = { type, timeLeft: duration, totalTime: duration };
      this.callbacks.setActivePowerup(this.activePowerup);
  }

  private clearPowerup() {
      this.birdCtrl.clearEffect();
      this.targetTimeScale = GAME_CONSTANTS.TIME_SCALE_NORMAL;
      this.activePowerup = null;
      this.callbacks.setActivePowerup(null);

      // Playground Logic: Restore initial powerup if lost (e.g. Shield broke -> Ghost -> End)
      if (this.gameMode === 'playground' && this.initialPowerup) {
           let type = this.initialPowerup;
           if (type === 'random') {
                const types: PowerupType[] = ['shrink', 'grow', 'slowmo', 'fast', 'shield', 'ghost', 'gun'];
                type = types[Math.floor(Math.random() * types.length)];
           }
           this.activatePowerup(type, 999999);
      }
  }

  private handleCrash() {
     audioService.playCrash();
     this.callbacks.triggerEffect();
     this.callbacks.setGameState(GameState.GAME_OVER);
  }
  
  private handleShieldBreak(birdX: number) {
     const recoveryTime = 60;
     this.activatePowerup('ghost', recoveryTime); // Activates ghost temporarily
     audioService.playShieldBreak();
     this.callbacks.triggerEffect();
     this.particleCtrl.spawnExplosion(birdX, this.birdCtrl.bird.y, parseInt(COLORS.SHIELD_GLOW.replace('#','0x')), 20, 3);
  }

  private checkPowerupCollisions(birdX: number, radius: number) {
      const powerups = this.powerupCtrl.powerups;
      for (let i = powerups.length - 1; i >= 0; i--) {
        const p = powerups[i];
        if (!p.active) continue;
        const dx = p.x - birdX;
        const dy = p.y - this.bird.y;
        if (Math.sqrt(dx*dx + dy*dy) < radius + GAME_CONSTANTS.POWERUP_SIZE) {
            p.active = false;
            let effectiveType = p.type;
            if (effectiveType === 'random') {
                const types: PowerupType[] = ['shrink', 'grow', 'slowmo', 'fast', 'shield', 'ghost', 'gun'];
                effectiveType = types[Math.floor(Math.random() * types.length)];
            }
            let duration = GAME_CONSTANTS.DURATION_SIZE;
            switch (effectiveType) {
                case 'slowmo': duration = GAME_CONSTANTS.DURATION_SLOWMO; break;
                case 'fast': duration = GAME_CONSTANTS.DURATION_FAST; break;
                case 'shield': duration = GAME_CONSTANTS.DURATION_SHIELD; break;
                case 'ghost': duration = GAME_CONSTANTS.DURATION_GHOST; break;
                case 'gun': duration = GAME_CONSTANTS.DURATION_GUN; break;
            }
            this.activatePowerup(effectiveType, duration);
        }
      }
  }

  private checkPipeCollisions(birdX: number, radius: number) {
      const isGhost = this.activePowerup?.type === 'ghost';
      if (isGhost) return; // No collision

      const pipes = this.pipeCtrl.pipes;
      for (const pipe of pipes) {
         if (birdX + radius > pipe.x && birdX - radius < pipe.x + GAME_CONSTANTS.PIPE_WIDTH) {
              const hitTop = !pipe.brokenTop && this.bird.y - radius < pipe.topHeight;
              const hitBottom = !pipe.brokenBottom && this.bird.y + radius > pipe.topHeight + GAME_CONSTANTS.PIPE_GAP;
              
              if (hitTop || hitBottom) {
                 if (pipe.type === 'glass') {
                     if ((hitTop && !pipe.brokenTop) || (hitBottom && !pipe.brokenBottom)) {
                         if (hitTop) pipe.brokenTop = true;
                         if (hitBottom) pipe.brokenBottom = true;
                         this.score += GAME_CONSTANTS.GLASS_BREAK_SCORE;
                         this.callbacks.setScore(this.score);
                         audioService.playGlassBreak();
                         this.callbacks.triggerEffect();
                         this.bird.velocity = Math.max(this.bird.velocity + GAME_CONSTANTS.GLASS_BREAK_PENALTY, GAME_CONSTANTS.GLASS_BREAK_PENALTY / 2);
                     }
                 } else if (this.activePowerup?.type === 'shield') {
                     this.handleShieldBreak(birdX);
                 } else {
                     this.handleCrash();
                 }
              }
         }
         
         if (!pipe.passed && birdX > pipe.x + GAME_CONSTANTS.PIPE_WIDTH) {
             pipe.passed = true;
             this.score += 1;
             this.callbacks.setScore(this.score);
             audioService.playScore();
         }
      }
  }

  private checkBattleCollisions(birdX: number, radius: number, dt: number) {
      if (this.gameMode !== 'battle') return;

      // Enemy Collision
      const enemies = this.battleCtrl.enemies;
      for (const enemy of enemies) {
          const dx = enemy.x - birdX;
          const dy = enemy.y - this.bird.y;
          const dist = Math.sqrt(dx*dx + dy*dy);
          const enemyRadius = BATTLE_CONSTANTS.ENEMY_SIZE * enemy.scale;
          if (dist < radius + enemyRadius) {
               this.handleCrash();
          }
      }

      // Boss Body Collision
      const boss = this.boss;
      if (boss.active) {
          const dx = boss.x - birdX;
          const dy = boss.y - this.bird.y;
          if (Math.sqrt(dx*dx + dy*dy) < radius + BATTLE_CONSTANTS.BOSS_SIZE) {
              this.handleCrash();
          }
      }

      // Boss Projectile Collision
      const bossProjs = this.battleCtrl.bossProjectiles;
      for (let i = bossProjs.length - 1; i >= 0; i--) {
          const proj = bossProjs[i];
          const dx = proj.x - birdX;
          const dy = proj.y - this.bird.y;
          if (Math.sqrt(dx*dx + dy*dy) < radius + 10) {
              if (this.activePowerup?.type === 'shield') {
                  this.handleShieldBreak(birdX);
                  bossProjs.splice(i, 1);
              } else {
                  this.handleCrash();
              }
          }
      }
  }

  private checkProjectileCollisions(width: number, dt: number) {
      const projectiles = this.projectileCtrl.projectiles;
      const pipes = this.pipeCtrl.pipes;
      const enemies = this.battleCtrl.enemies;
      const boss = this.boss;

      for (let i = projectiles.length - 1; i >= 0; i--) {
          const proj = projectiles[i];
          let destroyed = false;
          // Initialize pierce to 1 if undefined (standard behavior)
          if (proj.pierce === undefined) proj.pierce = 1;
          
          if (this.gameMode !== 'battle') {
               // Pipe Collision
               for (const pipe of pipes) {
                    if (proj.x > pipe.x && proj.x < pipe.x + GAME_CONSTANTS.PIPE_WIDTH) {
                        if ((!pipe.brokenTop && proj.y < pipe.topHeight) || (!pipe.brokenBottom && proj.y > pipe.topHeight + GAME_CONSTANTS.PIPE_GAP)) {
                             // Determine which part hits
                             const hitTop = !pipe.brokenTop && proj.y < pipe.topHeight;
                             
                             if (hitTop) pipe.brokenTop = true;
                             else pipe.brokenBottom = true;
                             
                             this.score += 2;
                             this.callbacks.setScore(this.score);
                             audioService.playExplosion();
                             this.callbacks.triggerEffect();
                             this.particleCtrl.spawnExplosion(proj.x, proj.y, 0xFF0000, 10, 3);
                             
                             proj.pierce--;
                             if (proj.pierce <= 0) {
                                 destroyed = true;
                             }
                             break;
                        }
                    }
               }
          } else {
               // Battle Mode Collision
               
               // Boss Check
               if (boss.active) {
                   const dist = Math.sqrt(Math.pow(proj.x - boss.x, 2) + Math.pow(proj.y - boss.y, 2));
                   if (dist < BATTLE_CONSTANTS.BOSS_SIZE + (proj.scale ? proj.scale * 4 : 20)) {
                       boss.hp -= (proj.damage || 1);
                       this.callbacks.setBossActive(true, boss.hp, boss.maxHp);
                       this.particleCtrl.spawnExplosion(proj.x, proj.y, 0xFF0000, 2, 3);
                       
                       // Projectiles explode on Boss unless they have extremely high pierce (like a laser), 
                       // but for now let's say boss consumes projectile or massive damage tick logic.
                       // For Pulse, we want it to feel like it hits hard. 
                       // If we let it pierce, it melts boss in 1 sec. 
                       // Let's make boss effectively have infinite armor against pierce, consuming the shot.
                       destroyed = true; 
                       
                       if (boss.hp <= 0) {
                           this.boss.active = false;
                           this.callbacks.setBossActive(false, 0, 0);
                           this.score += 50; 
                           this.callbacks.setScore(this.score);
                           this.nextBossScore = this.score + BATTLE_CONSTANTS.BOSS_INTERVAL;
                           audioService.playExplosion();
                           this.callbacks.triggerEffect();
                           this.battleCtrl.bossProjectiles = [];
                           this.particleCtrl.spawnExplosion(boss.x, boss.y, 0xFFA500, 40, 6);
                       }
                   }
               }
               
               // Enemies Check
               if (!destroyed) {
                   for (let j = enemies.length - 1; j >= 0; j--) {
                       const enemy = enemies[j];
                       if (enemy.x > width) continue;
                       const hitRad = (BATTLE_CONSTANTS.ENEMY_SIZE * enemy.scale) + (proj.scale ? proj.scale * 4 : 35);
                       const dist = Math.sqrt(Math.pow(proj.x - enemy.x, 2) + Math.pow(proj.y - enemy.y, 2));
                       
                       if (dist < hitRad) {
                           enemy.hp -= (proj.damage || 1);
                           this.particleCtrl.spawnExplosion(proj.x, proj.y, 0xFFFFFF, 3, 2);
                           
                           if (enemy.hp <= 0) {
                               this.score += BATTLE_CONSTANTS.ENEMY_SCORE;
                               this.callbacks.setScore(this.score);
                               enemies.splice(j, 1);
                               audioService.playExplosion();
                               this.callbacks.triggerEffect();
                               this.particleCtrl.spawnExplosion(enemy.x, enemy.y, 0xFF4400, 15, 4);
                           }
                           
                           proj.pierce--;
                           if (proj.pierce <= 0) {
                               destroyed = true;
                               break;
                           }
                           // NOTE: Removed 'break' here to allow high-pierce projectiles 
                           // to hit multiple unique enemies in a single frame.
                       }
                   }
               }
          }

          if (destroyed) {
              projectiles.splice(i, 1);
          }
      }
  }
}
