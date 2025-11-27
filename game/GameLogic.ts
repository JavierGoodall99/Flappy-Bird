
import { GameState, Bird, Pipe, Powerup, ActivePowerup, Particle, Projectile, BossProjectile, Enemy, Boss, GameMode, PowerupType } from '../types';
import { GAME_CONSTANTS, COLORS, PARTICLE_CONFIG, BATTLE_CONSTANTS } from '../constants';
import { audioService } from '../services/audioService';
import { pointToSegmentDistance } from '../utils/collision';

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

  public bird: Bird;
  public pipes: Pipe[] = [];
  public powerups: Powerup[] = [];
  public particles: Particle[] = [];
  public projectiles: Projectile[] = [];
  public bossProjectiles: BossProjectile[] = [];
  public enemies: Enemy[] = [];
  public boss: Boss;

  // Timing refs
  public lastPipeSpawnFrame: number = 0;
  public lastPowerupSpawnFrame: number = 0;
  public lastParticleFrame: number = 0;
  public lastBulletTrailFrame: number = 0;
  public lastEnemySpawnFrame: number = 0;
  public lastShotFrame: number = -100;

  public timeScale: number = 1.0;
  public targetTimeScale: number = 1.0;
  public activePowerup: ActivePowerup | null = null;
  public nextBossScore: number = BATTLE_CONSTANTS.BOSS_INTERVAL;

  private callbacks: GameLogicCallbacks;
  private gameMode: GameMode = 'standard';
  private initialPowerup: PowerupType | null = null;
  private currentSkinTrail: string = 'none';
  private currentSkinColors: any = {};

  constructor(callbacks: GameLogicCallbacks) {
    this.callbacks = callbacks;
    this.bird = { y: 0, velocity: 0, rotation: 0, scale: 1, targetScale: 1, effectTimer: 0 };
    this.boss = { active: false, x: 0, y: 0, hp: 0, maxHp: 0, phase: 0, targetY: 0, attackTimer: 0 };
  }

  public updateProps(gameState: GameState, gameMode: GameMode, initialPowerup: PowerupType | null, skin: any) {
    this.gameState = gameState;
    this.gameMode = gameMode;
    this.initialPowerup = initialPowerup;
    this.currentSkinTrail = skin.trail;
    this.currentSkinColors = skin.colors;
  }

  public reset(spawnEntities: boolean = false, width: number, height: number) {
    this.isRoundActive = false;
    this.bird = { 
      y: height / 2, velocity: 0, rotation: 0,
      scale: GAME_CONSTANTS.SCALE_NORMAL, targetScale: GAME_CONSTANTS.SCALE_NORMAL, effectTimer: 0
    };
    
    this.pipes = [];
    this.enemies = [];
    this.powerups = [];
    this.particles = [];
    this.projectiles = [];
    this.bossProjectiles = [];
    this.boss = { active: false, x: width + 200, y: height/2, hp: 0, maxHp: 0, phase: 0, targetY: height/2, attackTimer: 0 };
    this.callbacks.setBossActive(false, 0, 0);

    this.score = 0;
    this.speed = GAME_CONSTANTS.BASE_PIPE_SPEED;
    this.frameCount = 0;
    this.lastShotFrame = -100;
    this.nextBossScore = BATTLE_CONSTANTS.BOSS_INTERVAL;
    
    this.lastPipeSpawnFrame = 0;
    this.lastPowerupSpawnFrame = 0;
    this.lastParticleFrame = 0;
    this.lastBulletTrailFrame = 0;
    this.lastEnemySpawnFrame = 0;
    
    this.timeScale = 1.0;
    this.targetTimeScale = 1.0;
    this.activePowerup = null;
    this.callbacks.setActivePowerup(null);
    this.callbacks.setScore(0);

    if (spawnEntities) {
        if (this.gameMode !== 'battle') {
            const minPipeHeight = 50;
            const maxTopPipeHeight = Math.max(minPipeHeight, height - GAME_CONSTANTS.PIPE_GAP - minPipeHeight);
            const startPipeHeight = Math.floor(minPipeHeight + (maxTopPipeHeight - minPipeHeight) / 2 + (Math.random() * 100 - 50)); 
            this.pipes.push({
                x: width - 100,
                topHeight: startPipeHeight,
                passed: false,
                type: 'normal',
                brokenTop: false,
                brokenBottom: false
            });
        }

        if (this.gameMode === 'battle') {
            this.activePowerup = { type: 'gun', timeLeft: 9999999, totalTime: 9999999 };
            this.callbacks.setActivePowerup(this.activePowerup);
            audioService.playShieldUp();
        } else if (this.initialPowerup) {
            let duration = 999999; 
            switch (this.initialPowerup) {
                case 'shrink': this.bird.targetScale = GAME_CONSTANTS.SCALE_SHRINK; audioService.playShrink(); break;
                case 'grow': this.bird.targetScale = GAME_CONSTANTS.SCALE_GROW; audioService.playGrow(); break;
                case 'slowmo': this.targetTimeScale = GAME_CONSTANTS.TIME_SCALE_SLOW; audioService.playSlowMo(); break;
                case 'fast': this.targetTimeScale = GAME_CONSTANTS.TIME_SCALE_FAST; audioService.playFastForward(); break;
                case 'shield': audioService.playShieldUp(); break;
                case 'ghost': audioService.playGhost(); break;
                case 'gun': audioService.playShieldUp(); break; 
            }
            this.bird.effectTimer = duration;
            this.activePowerup = { type: this.initialPowerup, timeLeft: duration, totalTime: duration };
            this.callbacks.setActivePowerup(this.activePowerup);
        }
    }
  }

  public jump() {
    if (this.gameState !== GameState.PLAYING) return;
    if (!this.isRoundActive) {
        this.isRoundActive = true;
    }
    this.bird.velocity = GAME_CONSTANTS.JUMP_STRENGTH;
    audioService.playJump();
  }

  public update(dtRaw: number, width: number, height: number) {
    if (this.gameState === GameState.START) {
        const time = Date.now() * 0.005;
        this.bird.y = (height / 2) + Math.sin(time) * 15;
        this.bird.rotation = 0;
        return;
    } 
    
    if (this.gameState === GameState.PAUSED) return;

    this.timeScale += (this.targetTimeScale - this.timeScale) * (0.1 * dtRaw);
    const dt = dtRaw * this.timeScale;

    // --- VISUAL UPDATES (Run in PLAYING and GAME_OVER) ---
    // This allows explosions and projectiles to finish their animations instead of freezing
    const birdX = width * GAME_CONSTANTS.BIRD_X_POSITION; 
    const birdRadius = GAME_CONSTANTS.BIRD_RADIUS * this.bird.scale;
    const isPlaying = this.gameState === GameState.PLAYING;

    this.updateParticles(dt, birdX, isPlaying);
    this.updateProjectiles(dt, width, birdX, isPlaying);
    this.updateBossProjectiles(dt, width, height, birdX, birdRadius, isPlaying);

    if (!isPlaying) return;

    if (!this.isRoundActive) {
        const time = Date.now() * 0.005;
        this.bird.y = (height / 2) + Math.sin(time) * 15;
        this.bird.rotation = 0;
        return;
    }

    this.frameCount += dt;
    const now = performance.now();
    
    // Physics
    this.bird.velocity += GAME_CONSTANTS.GRAVITY * dt;
    this.bird.y += this.bird.velocity * dt;
    this.bird.rotation = Math.min(Math.PI / 4, Math.max(-Math.PI / 4, (this.bird.velocity * 0.1)));
    
    // Powerup Timer Logic
    if (this.gameMode !== 'battle' && this.bird.effectTimer > 0) {
      this.bird.effectTimer -= 1 * dt; 
      if (this.activePowerup) {
           this.activePowerup.timeLeft = this.bird.effectTimer;
           this.callbacks.setActivePowerup({ ...this.activePowerup });
      }
      if (this.bird.effectTimer <= 0) {
        this.bird.targetScale = GAME_CONSTANTS.SCALE_NORMAL;
        this.targetTimeScale = GAME_CONSTANTS.TIME_SCALE_NORMAL;
        this.activePowerup = null;
        this.callbacks.setActivePowerup(null);
      }
    }
    
    const scaleLerp = 0.1 * dtRaw;
    this.bird.scale += (this.bird.targetScale - this.bird.scale) * scaleLerp;
    
    this.speed += GAME_CONSTANTS.SPEED_INCREMENT * dt;
    const moveSpeed = (this.speed) * dt;

    // --- BATTLE MODE LOGIC ---
    if (this.gameMode === 'battle') {
        this.updateBattleMode(dt, width, height, birdX, birdRadius, now);
    }

    // --- WEAPONS SYSTEM ---
    if (this.activePowerup?.type === 'gun') {
        this.spawnWeapons(dt, width, birdX);
    }

    // --- PIPE SPAWNING (STANDARD MODE) ---
    if (this.gameMode !== 'battle') {
        this.spawnPipes(dt, width, height);
    }

    // --- POWERUP SPAWNING ---
    if (this.gameMode !== 'battle') {
        this.spawnPowerups(dt, width, height);
    }

    // Powerup Collision & Updates
    const birdCollideRadius = (GAME_CONSTANTS.BIRD_RADIUS * this.bird.scale) - 2; 
    this.updatePowerups(moveSpeed, birdX, birdCollideRadius);

    // Pipe Updates & Collisions
    this.updatePipes(moveSpeed, birdX, birdCollideRadius, height);

    // Ground/Ceiling Collision
    if (this.bird.y + birdCollideRadius >= height || this.bird.y - birdCollideRadius <= 0) {
       audioService.playCrash();
       this.callbacks.triggerEffect();
       this.callbacks.setGameState(GameState.GAME_OVER);
    }
  }

  private updateBattleMode(dt: number, width: number, height: number, birdX: number, birdRadius: number, now: number) {
        // BOSS SPAWN CHECK
        if (!this.boss.active && this.score >= this.nextBossScore && this.enemies.length === 0) {
             this.boss.active = true;
             this.boss.x = width + 200;
             this.boss.y = height / 2;
             const difficultyMultiplier = Math.floor(this.score / BATTLE_CONSTANTS.BOSS_INTERVAL);
             this.boss.maxHp = BATTLE_CONSTANTS.BOSS_BASE_HP * difficultyMultiplier;
             this.boss.hp = this.boss.maxHp;
             this.boss.targetY = height / 2;
             this.boss.attackTimer = BATTLE_CONSTANTS.BOSS_ATTACK_RATE;
             
             audioService.playDangerSurge();
             this.callbacks.setBossActive(true, this.boss.hp, this.boss.maxHp);
        }

        // Reduced spawn interval as score increases, clamped to minimum 15 frames
        const spawnRateReduction = Math.min(15, Math.floor(this.score / 50)); 
        const currentSpawnRate = Math.max(15, BATTLE_CONSTANTS.ENEMY_SPAWN_RATE - spawnRateReduction);

        if (!this.boss.active && this.score < this.nextBossScore && this.frameCount - this.lastEnemySpawnFrame >= currentSpawnRate) {
            this.lastEnemySpawnFrame = this.frameCount;
            const padding = 50;
            const spawnY = padding + Math.random() * (height - padding * 2);
            const scaleBonus = Math.min(0.8, Math.floor(this.score / 100) * 0.1);

            this.enemies.push({
                id: Math.random(),
                x: width + 50,
                y: spawnY,
                velocity: BATTLE_CONSTANTS.ENEMY_SPEED + (Math.random() * 2), 
                targetY: spawnY,
                hp: BATTLE_CONSTANTS.ENEMY_HP,
                scale: 1.0 + scaleBonus
            });
        }

        if (this.boss.active) {
            this.updateBoss(dt, width, height, birdX, birdRadius, now);
        }

        // Note: Boss Projectiles now updated in main update loop

        // Update Enemies
        for (let i = this.enemies.length - 1; i >= 0; i--) {
            const enemy = this.enemies[i];
            const globalSpeedBonus = Math.min(4, (this.score / 50) * 0.5); 
            enemy.x -= (enemy.velocity + globalSpeedBonus) * dt;
            
            const weaveIntensity = 50 + Math.min(50, this.score / 10);
            enemy.y = enemy.targetY + Math.sin(this.frameCount * 0.05 + enemy.id * 10) * weaveIntensity;
            
            if (enemy.x < -100) {
                this.enemies.splice(i, 1);
                continue;
            }

            const dx = enemy.x - birdX;
            const dy = enemy.y - this.bird.y;
            const dist = Math.sqrt(dx*dx + dy*dy);
            const enemyRadius = BATTLE_CONSTANTS.ENEMY_SIZE * enemy.scale;
            
            if (dist < birdRadius + enemyRadius) {
                audioService.playCrash();
                this.callbacks.triggerEffect();
                this.callbacks.setGameState(GameState.GAME_OVER);
            }
        }
  }

  private updateBoss(dt: number, width: number, height: number, birdX: number, birdRadius: number, now: number) {
      const boss = this.boss;
      
      if (boss.x > width * 0.8) {
          boss.x -= 3 * dt;
          boss.y += (this.bird.y - boss.y) * 0.05 * dt; 
      } else {
          const targetY = this.bird.y;
          boss.y += (targetY - boss.y) * 0.04 * dt; 
          boss.y += Math.sin(now * 0.002) * 1 * dt;
          const targetX = width * 0.8;
          boss.x += (targetX - boss.x) * 0.05 * dt;
          boss.y = Math.max(100, Math.min(height - 100, boss.y));

          boss.attackTimer -= 1 * dt;
          if (boss.attackTimer <= 0) {
              boss.attackTimer = Math.max(30, BATTLE_CONSTANTS.BOSS_ATTACK_RATE - (Math.floor(this.score/200)*10));
              const isLowHp = boss.hp < boss.maxHp * 0.5;
              
              const spawnProjectile = (vy: number) => {
                  this.bossProjectiles.push({
                      id: Math.random(),
                      x: boss.x - 60,
                      y: boss.y,
                      vx: -BATTLE_CONSTANTS.BOSS_PROJECTILE_SPEED,
                      vy: vy
                  });
              };

              if (isLowHp) {
                   spawnProjectile(0);
                   spawnProjectile(1.5);
                   spawnProjectile(-1.5);
              } else {
                   const dy = this.bird.y - boss.y;
                   const dx = birdX - boss.x;
                   const angle = Math.atan2(dy, dx);
                   const speed = BATTLE_CONSTANTS.BOSS_PROJECTILE_SPEED;
                   this.bossProjectiles.push({
                      id: Math.random(),
                      x: boss.x - 60,
                      y: boss.y,
                      vx: Math.cos(angle) * speed,
                      vy: Math.sin(angle) * speed
                   });
              }
              audioService.playBossShoot();
          }
      }

      const dx = boss.x - birdX;
      const dy = boss.y - this.bird.y;
      const dist = Math.sqrt(dx*dx + dy*dy);
      if (dist < birdRadius + BATTLE_CONSTANTS.BOSS_SIZE) {
          audioService.playCrash();
          this.callbacks.triggerEffect();
          this.callbacks.setGameState(GameState.GAME_OVER);
      }
  }

  private updateBossProjectiles(dt: number, width: number, height: number, birdX: number, birdRadius: number, checkCollision: boolean) {
    for (let i = this.bossProjectiles.length - 1; i >= 0; i--) {
        const proj = this.bossProjectiles[i];
        proj.x += proj.vx * dt;
        proj.y += proj.vy * dt;

        if (checkCollision) {
            const dx = proj.x - birdX;
            const dy = proj.y - this.bird.y;
            const dist = Math.sqrt(dx*dx + dy*dy);
            
            if (dist < birdRadius + 10) {
                if (this.activePowerup?.type === 'shield') {
                    const recoveryTime = 60; 
                    this.activePowerup = { type: 'ghost', timeLeft: recoveryTime, totalTime: recoveryTime };
                    this.bird.effectTimer = recoveryTime;
                    this.callbacks.setActivePowerup({ ...this.activePowerup });
                    audioService.playShieldBreak();
                    this.callbacks.triggerEffect();
                    this.bossProjectiles.splice(i, 1);
                    continue;
                } else {
                    audioService.playCrash();
                    this.callbacks.triggerEffect();
                    this.callbacks.setGameState(GameState.GAME_OVER);
                }
            }
        }

        if (proj.x < -100 || proj.y < -100 || proj.y > height + 100) {
            this.bossProjectiles.splice(i, 1);
        }
    }
  }

  private spawnWeapons(dt: number, width: number, birdX: number) {
      let fireRate = GAME_CONSTANTS.GUN_FIRE_RATE;
      if (this.gameMode === 'battle') {
          // Changed to max 30 to prevent it becoming a laser beam too fast, starting at base 45
          fireRate = Math.max(30, GAME_CONSTANTS.GUN_FIRE_RATE - Math.floor(this.score / 500));
      }

      if (this.frameCount - this.lastShotFrame >= fireRate) {
          this.lastShotFrame = this.frameCount;
          const speedBonus = Math.min(10, Math.floor(this.score / 50)); 
          const pSpeed = GAME_CONSTANTS.PROJECTILE_SPEED + speedBonus;
          this.projectiles.push({
              id: Math.random(),
              x: birdX + 20,
              y: this.bird.y - 5,
              vx: pSpeed,
              vy: 0
          });
          audioService.playShoot();
      }
  }

  private updateProjectiles(dt: number, width: number, birdX: number, checkCollision: boolean) {
      for (let i = this.projectiles.length - 1; i >= 0; i--) {
          const proj = this.projectiles[i];
          const prevProjX = proj.x;
          const prevProjY = proj.y;
          
          proj.x += proj.vx * dt;
          proj.y += proj.vy * dt;
          let hit = false;
          
          if (checkCollision) {
              if (this.gameMode !== 'battle') {
                  for (let j = 0; j < this.pipes.length; j++) {
                      const pipe = this.pipes[j];
                      if (proj.x > pipe.x && proj.x < pipe.x + GAME_CONSTANTS.PIPE_WIDTH) {
                          if (!pipe.brokenTop && proj.y < pipe.topHeight) {
                              pipe.brokenTop = true; hit = true;
                          } else if (!pipe.brokenBottom && proj.y > pipe.topHeight + GAME_CONSTANTS.PIPE_GAP) {
                              pipe.brokenBottom = true; hit = true;
                          }
                          if (hit) {
                              this.score += 2;
                              this.callbacks.setScore(this.score);
                              audioService.playExplosion();
                              this.callbacks.triggerEffect();
                              for(let k=0; k<10; k++) {
                                  this.particles.push({
                                      x: proj.x, y: proj.y,
                                      vx: (Math.random()-0.5)*5, vy: (Math.random()-0.5)*5,
                                      life: 20, maxLife: 20, scale: 3, color: 0xFF0000, rotation: 0
                                  });
                              }
                              break; 
                          }
                      }
                  }
              } else {
                  if (this.boss.active) {
                      const relStartX = prevProjX - this.boss.x; // Simplified relative (assuming boss static this frame for hit test)
                      const relStartY = prevProjY - this.boss.y;
                      const relEndX = proj.x - this.boss.x;
                      const relEndY = proj.y - this.boss.y;
                      const dist = pointToSegmentDistance(0, 0, relStartX, relStartY, relEndX, relEndY);
                        
                      if (dist < BATTLE_CONSTANTS.BOSS_SIZE + 20) {
                            hit = true;
                            this.boss.hp--;
                            this.callbacks.setBossActive(true, this.boss.hp, this.boss.maxHp);
                            for(let k=0; k<2; k++) {
                                this.particles.push({
                                    x: proj.x, y: proj.y,
                                    vx: (Math.random()-0.5)*8, vy: (Math.random()-0.5)*8,
                                    life: 15, maxLife: 15, scale: 3, color: 0xFF0000, rotation: 0
                                });
                            }

                            if (this.boss.hp <= 0) {
                                this.boss.active = false;
                                this.callbacks.setBossActive(false, 0, 0);
                                this.score += 50; 
                                this.callbacks.setScore(this.score);
                                this.nextBossScore = this.score + BATTLE_CONSTANTS.BOSS_INTERVAL;
                                audioService.playExplosion();
                                this.callbacks.triggerEffect();
                                this.bossProjectiles = []; 
                                for(let k=0; k<40; k++) {
                                    this.particles.push({
                                        x: this.boss.x + (Math.random()-0.5)*50, y: this.boss.y + (Math.random()-0.5)*50,
                                        vx: (Math.random()-0.5)*15, vy: (Math.random()-0.5)*15,
                                        life: 40, maxLife: 40, scale: 6, color: 0xFFA500, rotation: 0
                                    });
                                }
                            }
                      }
                  }

                  if (!hit) {
                      const globalSpeedBonus = Math.min(4, (this.score / 50) * 0.5);
                      const weaveIntensity = 50 + Math.min(50, this.score / 10);
                      
                      for (let j = this.enemies.length - 1; j >= 0; j--) {
                          const enemy = this.enemies[j];
                          if (enemy.x > width) continue; 
                          const enemyHitRadius = (BATTLE_CONSTANTS.ENEMY_SIZE * enemy.scale) + 35;
                          const enemySpeedPerFrame = (enemy.velocity + globalSpeedBonus) * dt;
                          const prevEnemyX = enemy.x + enemySpeedPerFrame;
                          const prevEnemyY = enemy.targetY + Math.sin((this.frameCount - dt) * 0.05 + enemy.id * 10) * weaveIntensity;

                          const relStartX = prevProjX - prevEnemyX;
                          const relStartY = prevProjY - prevEnemyY;
                          const relEndX = proj.x - enemy.x;
                          const relEndY = proj.y - enemy.y;

                          const sweptDist = pointToSegmentDistance(0, 0, relStartX, relStartY, relEndX, relEndY);
                          const simpleDist = Math.sqrt(Math.pow(proj.x - enemy.x, 2) + Math.pow(proj.y - enemy.y, 2));

                          if (sweptDist < enemyHitRadius || simpleDist < enemyHitRadius) {
                              hit = true;
                              enemy.hp--;
                              for(let k=0; k<3; k++) {
                                  this.particles.push({
                                      x: proj.x, y: proj.y,
                                      vx: (Math.random()-0.5)*5, vy: (Math.random()-0.5)*5,
                                      life: 10, maxLife: 10, scale: 2, color: 0xFFFFFF, rotation: 0
                                  });
                              }

                              if (enemy.hp <= 0) {
                                  this.score += BATTLE_CONSTANTS.ENEMY_SCORE;
                                  this.callbacks.setScore(this.score);
                                  this.enemies.splice(j, 1);
                                  audioService.playExplosion();
                                  this.callbacks.triggerEffect();
                                  for(let k=0; k<15; k++) {
                                      this.particles.push({
                                          x: enemy.x, y: enemy.y,
                                          vx: (Math.random()-0.5)*8, vy: (Math.random()-0.5)*8,
                                          life: 25, maxLife: 25, scale: 4, color: 0xFF4400, rotation: 0
                                      });
                                  }
                              }
                              break;
                          }
                      }
                  }
              }
          }

          if (hit || proj.x > width + 100) {
              this.projectiles.splice(i, 1);
          }
      }
  }

  private spawnPipes(dt: number, width: number, height: number) {
      const spawnInterval = Math.floor(GAME_CONSTANTS.PIPE_SPAWN_RATE * (GAME_CONSTANTS.BASE_PIPE_SPEED / this.speed));
      const spawnRate = Math.floor(Math.max(30, spawnInterval / this.timeScale));
      
      if (this.frameCount - this.lastPipeSpawnFrame >= spawnRate) {
          this.lastPipeSpawnFrame = this.frameCount;
          const minPipeHeight = 50;
          const maxTopPipeHeight = Math.max(minPipeHeight, height - GAME_CONSTANTS.PIPE_GAP - minPipeHeight);
          let minBound = minPipeHeight;
          let maxBound = maxTopPipeHeight;
          if (this.pipes.length > 0) {
              const lastPipe = this.pipes[this.pipes.length - 1];
              const timeFactor = (GAME_CONSTANTS.BASE_PIPE_SPEED / this.speed);
              const maxJump = Math.max(80, (height * 0.4) * timeFactor);
              minBound = Math.max(minPipeHeight, lastPipe.topHeight - maxJump);
              maxBound = Math.min(maxTopPipeHeight, lastPipe.topHeight + maxJump);
          } else {
              minBound = height / 3;
              maxBound = height / 1.5;
          }
          const topHeight = Math.floor(minBound + Math.random() * (maxBound - minBound));
          const isGlass = Math.random() < GAME_CONSTANTS.GLASS_PIPE_CHANCE;
          this.pipes.push({
              x: width, topHeight, passed: false, type: isGlass ? 'glass' : 'normal', brokenTop: false, brokenBottom: false
          });
      }
  }

  private spawnPowerups(dt: number, width: number, height: number) {
      const powerupRate = Math.floor(GAME_CONSTANTS.POWERUP_SPAWN_RATE / this.timeScale);
      if (!this.initialPowerup && this.frameCount - this.lastPowerupSpawnFrame >= powerupRate) {
          this.lastPowerupSpawnFrame = this.frameCount;
          const rand = Math.random();
          let type: PowerupType = 'shrink'; 
          if (rand < 0.2) type = 'shrink';
          else if (rand < 0.4) type = 'grow';
          else if (rand < 0.55) type = 'shield';
          else if (rand < 0.7) type = 'slowmo';
          else if (rand < 0.8) type = 'gun';
          else if (rand < 0.9) type = 'fast';
          else type = 'ghost';

          let spawnMinY = height * 0.25;
          let spawnMaxY = height * 0.75;
          if (this.pipes.length > 0) {
              const lastPipe = this.pipes[this.pipes.length - 1];
              const distFromPipe = Math.abs(width - lastPipe.x);
              if (distFromPipe < 350) {
                  const padding = 45;
                  spawnMinY = lastPipe.topHeight + padding;
                  spawnMaxY = lastPipe.topHeight + GAME_CONSTANTS.PIPE_GAP - padding;
              }
          }
          const y = spawnMinY + Math.random() * (spawnMaxY - spawnMinY);
          this.powerups.push({ x: width, y, type, active: true });
      }
  }

  private updatePowerups(moveSpeed: number, birdX: number, birdCollideRadius: number) {
      for (let i = this.powerups.length - 1; i >= 0; i--) {
        const p = this.powerups[i];
        p.x -= moveSpeed;
        if (p.active) {
          const dx = p.x - birdX;
          const dy = p.y - this.bird.y;
          const dist = Math.sqrt(dx*dx + dy*dy);
          if (dist < birdCollideRadius + GAME_CONSTANTS.POWERUP_SIZE) {
            p.active = false;
            let duration = GAME_CONSTANTS.DURATION_SIZE;
            this.bird.targetScale = GAME_CONSTANTS.SCALE_NORMAL;
            this.targetTimeScale = GAME_CONSTANTS.TIME_SCALE_NORMAL;
            switch (p.type) {
                case 'shrink': this.bird.targetScale = GAME_CONSTANTS.SCALE_SHRINK; audioService.playShrink(); break;
                case 'grow': this.bird.targetScale = GAME_CONSTANTS.SCALE_GROW; audioService.playGrow(); break;
                case 'slowmo': this.targetTimeScale = GAME_CONSTANTS.TIME_SCALE_SLOW; duration = GAME_CONSTANTS.DURATION_SLOWMO; audioService.playSlowMo(); break;
                case 'fast': this.targetTimeScale = GAME_CONSTANTS.TIME_SCALE_FAST; duration = GAME_CONSTANTS.DURATION_FAST; audioService.playFastForward(); break;
                case 'shield': duration = GAME_CONSTANTS.DURATION_SHIELD; audioService.playShieldUp(); break;
                case 'ghost': duration = GAME_CONSTANTS.DURATION_GHOST; audioService.playGhost(); break;
                case 'gun': duration = GAME_CONSTANTS.DURATION_GUN; audioService.playShieldUp(); break;
            }
            this.bird.effectTimer = duration;
            this.activePowerup = { type: p.type, timeLeft: duration, totalTime: duration };
            this.callbacks.setActivePowerup(this.activePowerup);
          }
        }
        if (p.x + GAME_CONSTANTS.POWERUP_SIZE < 0 || !p.active) {
          this.powerups.splice(i, 1);
        }
      }
  }

  private updateParticles(dt: number, birdX: number, isPlaying: boolean) {
      // Only spawn new trail particles if game is active
      if (isPlaying && this.currentSkinTrail !== 'none' && (this.frameCount - this.lastParticleFrame >= PARTICLE_CONFIG.TRAIL_SPAWN_RATE)) {
          this.lastParticleFrame = this.frameCount;
          const pScale = this.currentSkinTrail === 'pixel_dust' ? 4 : 2;
          const pLife = 40;
          let color = this.currentSkinTrail === 'sparkle' ? 0xFFFF00 : 
                     this.currentSkinTrail === 'neon_line' ? (this.currentSkinColors.glow || 0x00FFFF) : 0xFFFFFF;

          this.particles.push({
              x: birdX - 10,
              y: this.bird.y + (Math.random() * 10 - 5),
              vx: -2 - Math.random(),
              vy: (Math.random() - 0.5) * 2,
              life: pLife,
              maxLife: pLife,
              scale: pScale,
              color: color,
              rotation: Math.random() * Math.PI
          });
      }

      if (this.frameCount - this.lastBulletTrailFrame >= 2) {
          this.lastBulletTrailFrame = this.frameCount;
          this.projectiles.forEach(proj => {
              this.particles.push({
                  x: proj.x, y: proj.y,
                  vx: -2, vy: 0,
                  life: 10, maxLife: 10, scale: 2,
                  color: 0xFFFF00,
                  rotation: 0
              });
          });
      }

      for (let i = this.particles.length - 1; i >= 0; i--) {
          const p = this.particles[i];
          p.x += p.vx * dt;
          p.y += p.vy * dt;
          p.life -= 1 * dt;
          if (p.life <= 0) {
              this.particles.splice(i, 1);
          }
      }
  }

  private updatePipes(moveSpeed: number, birdX: number, birdCollideRadius: number, height: number) {
      for (let i = this.pipes.length - 1; i >= 0; i--) {
        const pipe = this.pipes[i];
        pipe.x -= moveSpeed;
        if (pipe.x + GAME_CONSTANTS.PIPE_WIDTH < 0) {
          this.pipes.splice(i, 1);
          continue;
        }
        const isGhost = this.activePowerup?.type === 'ghost';
        if (!isGhost) {
            if (birdX + birdCollideRadius > pipe.x && birdX - birdCollideRadius < pipe.x + GAME_CONSTANTS.PIPE_WIDTH) {
              const hitTop = !pipe.brokenTop && this.bird.y - birdCollideRadius < pipe.topHeight;
              const hitBottom = !pipe.brokenBottom && this.bird.y + birdCollideRadius > pipe.topHeight + GAME_CONSTANTS.PIPE_GAP;
              if (hitTop || hitBottom) {
                 if (pipe.type === 'glass') {
                   const isFreshBreak = (hitTop && !pipe.brokenTop) || (hitBottom && !pipe.brokenBottom);
                   if (isFreshBreak) {
                     if (hitTop) pipe.brokenTop = true;
                     if (hitBottom) pipe.brokenBottom = true;
                     this.score += GAME_CONSTANTS.GLASS_BREAK_SCORE;
                     this.callbacks.setScore(this.score);
                     audioService.playGlassBreak();
                     this.callbacks.triggerEffect();
                     this.bird.velocity = Math.max(this.bird.velocity + GAME_CONSTANTS.GLASS_BREAK_PENALTY, GAME_CONSTANTS.GLASS_BREAK_PENALTY / 2);
                   }
                 } else {
                   const hasShield = this.activePowerup?.type === 'shield';
                   if (hasShield) {
                       const recoveryTime = 60; 
                       this.activePowerup = { type: 'ghost', timeLeft: recoveryTime, totalTime: recoveryTime };
                       this.bird.effectTimer = recoveryTime;
                       this.callbacks.setActivePowerup({ ...this.activePowerup });
                       audioService.playShieldBreak();
                       this.callbacks.triggerEffect();
                       
                       for(let k=0; k<20; k++) {
                           const angle = Math.random() * Math.PI * 2;
                           const speed = 4 + Math.random() * 4;
                           this.particles.push({
                              x: birdX, y: this.bird.y,
                              vx: Math.cos(angle) * speed,
                              vy: Math.sin(angle) * speed,
                              life: 30, maxLife: 30, scale: 3, 
                              color: parseInt(COLORS.SHIELD_GLOW.replace('#','0x')), 
                              rotation: Math.random() * Math.PI
                           });
                       }
                   } else {
                       audioService.playCrash();
                       this.callbacks.triggerEffect();
                       this.callbacks.setGameState(GameState.GAME_OVER);
                   }
                 }
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
}
