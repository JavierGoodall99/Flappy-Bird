
import React, { useRef, useEffect, useCallback } from 'react';
import * as THREE from 'three';
import { GameState, Bird, Pipe, Powerup, PowerupType, ActivePowerup, Skin, Particle, Projectile, GameMode, Enemy } from '../types';
import { GAME_CONSTANTS, COLORS, PARTICLE_CONFIG, BATTLE_CONSTANTS, ENEMY_SKIN } from '../constants';
import { audioService } from '../services/audioService';
import { setupThreeScene } from '../utils/threeSetup';
import { createGeometries, createMaterials } from '../utils/assetManager';
import { createBirdMesh } from '../utils/birdFactory';

interface GameEngineProps {
  gameState: GameState;
  setGameState: (state: GameState) => void;
  setScore: (score: number) => void;
  triggerEffect: () => void;
  highScore: number;
  setActivePowerup: (powerup: ActivePowerup | null) => void;
  currentSkin: Skin;
  initialPowerup?: PowerupType | null; 
  gameMode: GameMode;
}

export const GameEngine: React.FC<GameEngineProps> = ({ 
  gameState, 
  setGameState, 
  setScore,
  triggerEffect,
  highScore,
  setActivePowerup,
  currentSkin,
  initialPowerup,
  gameMode
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const requestRef = useRef<number>(0);
  const frameCountRef = useRef<number>(0);
  const lastTimeRef = useRef<number>(0);
  
  // Spawn Timing Refs
  const lastPipeSpawnFrameRef = useRef<number>(0);
  const lastPowerupSpawnFrameRef = useRef<number>(0);
  const lastParticleFrameRef = useRef<number>(0);
  const lastBulletTrailFrameRef = useRef<number>(0);
  const lastEnemySpawnFrameRef = useRef<number>(0);
  
  const isRoundActiveRef = useRef<boolean>(false); 
  const birdRef = useRef<Bird>({ 
    y: 0, velocity: 0, rotation: 0, scale: 1, targetScale: 1, effectTimer: 0
  });
  
  const timeScaleRef = useRef<number>(1.0);
  const targetTimeScaleRef = useRef<number>(1.0);
  const activePowerupRef = useRef<ActivePowerup | null>(null);
  const bgTextureRef = useRef<THREE.Texture | null>(null);

  const pipesRef = useRef<Pipe[]>([]);
  const powerupsRef = useRef<Powerup[]>([]);
  const particlesRef = useRef<Particle[]>([]);
  const projectilesRef = useRef<Projectile[]>([]);
  const enemiesRef = useRef<Enemy[]>([]);
  const lastShotFrameRef = useRef<number>(0);

  const scoreRef = useRef<number>(0);
  const speedRef = useRef<number>(GAME_CONSTANTS.BASE_PIPE_SPEED);
  const prevGameStateRef = useRef<GameState>(gameState);

  // Three.js Refs
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const birdMeshRef = useRef<THREE.Group | null>(null);
  const pipeMeshesRef = useRef<Map<Pipe, THREE.Group>>(new Map());
  const powerupMeshesRef = useRef<Map<Powerup, THREE.Mesh>>(new Map());
  const projectileMeshesRef = useRef<THREE.Mesh[]>([]);
  const enemyMeshesRef = useRef<Map<Enemy, THREE.Group>>(new Map());

  const particleMeshesRef = useRef<THREE.Mesh[]>([]);
  const sceneReady = useRef<boolean>(false);

  // Geometry/Material Cache
  const geometryRef = useRef<any>(null);
  const materialRef = useRef<any>(null);

  const initGame = useCallback(() => {
    const height = window.innerHeight;
    const width = window.innerWidth;
    
    isRoundActiveRef.current = false;
    lastTimeRef.current = performance.now();

    birdRef.current = { 
      y: height / 2, velocity: 0, rotation: 0,
      scale: GAME_CONSTANTS.SCALE_NORMAL, targetScale: GAME_CONSTANTS.SCALE_NORMAL, effectTimer: 0
    };
    
    // Reset entities
    pipesRef.current = [];
    enemiesRef.current = [];
    powerupsRef.current = [];
    particlesRef.current = [];
    projectilesRef.current = [];
    scoreRef.current = 0;
    speedRef.current = GAME_CONSTANTS.BASE_PIPE_SPEED;
    frameCountRef.current = 0;
    lastShotFrameRef.current = -100;
    
    lastPipeSpawnFrameRef.current = 0;
    lastPowerupSpawnFrameRef.current = 0;
    lastParticleFrameRef.current = 0;
    lastBulletTrailFrameRef.current = 0;
    lastEnemySpawnFrameRef.current = 0;
    
    timeScaleRef.current = 1.0;
    targetTimeScaleRef.current = 1.0;
    activePowerupRef.current = null;
    setActivePowerup(null);
    setScore(0);

    // Initial Spawns based on Mode
    if (gameMode !== 'battle') {
        const minPipeHeight = 50;
        const maxTopPipeHeight = Math.max(minPipeHeight, height - GAME_CONSTANTS.PIPE_GAP - minPipeHeight);
        const startPipeHeight = Math.floor(minPipeHeight + (maxTopPipeHeight - minPipeHeight) / 2 + (Math.random() * 100 - 50)); 
        pipesRef.current.push({
            x: width - 100,
            topHeight: startPipeHeight,
            passed: false,
            type: 'normal',
            brokenTop: false,
            brokenBottom: false
        });
    }

    if (gameMode === 'battle') {
        // Force Gun
        activePowerupRef.current = { type: 'gun', timeLeft: 9999999, totalTime: 9999999 };
        setActivePowerup(activePowerupRef.current);
        audioService.playShieldUp();
    } else if (initialPowerup) {
        let duration = 999999; 
        switch (initialPowerup) {
            case 'shrink': birdRef.current.targetScale = GAME_CONSTANTS.SCALE_SHRINK; audioService.playShrink(); break;
            case 'grow': birdRef.current.targetScale = GAME_CONSTANTS.SCALE_GROW; audioService.playGrow(); break;
            case 'slowmo': targetTimeScaleRef.current = GAME_CONSTANTS.TIME_SCALE_SLOW; audioService.playSlowMo(); break;
            case 'fast': targetTimeScaleRef.current = GAME_CONSTANTS.TIME_SCALE_FAST; audioService.playFastForward(); break;
            case 'shield': audioService.playShieldUp(); break;
            case 'ghost': audioService.playGhost(); break;
            case 'gun': audioService.playShieldUp(); break; 
        }
        birdRef.current.effectTimer = duration;
        activePowerupRef.current = { type: initialPowerup, timeLeft: duration, totalTime: duration };
        setActivePowerup(activePowerupRef.current);
    }

    if (sceneRef.current && bgTextureRef.current) {
        sceneRef.current.background = bgTextureRef.current;
    }
    if (cameraRef.current) {
        cameraRef.current.fov = 40;
        cameraRef.current.updateProjectionMatrix();
    }

    if (sceneRef.current) {
      pipeMeshesRef.current.forEach((group) => sceneRef.current?.remove(group));
      pipeMeshesRef.current.clear();
      powerupMeshesRef.current.forEach((mesh) => sceneRef.current?.remove(mesh));
      powerupMeshesRef.current.clear();
      enemyMeshesRef.current.forEach((group) => sceneRef.current?.remove(group));
      enemyMeshesRef.current.clear();
      projectileMeshesRef.current.forEach(mesh => { mesh.visible = false; });
      particleMeshesRef.current.forEach(mesh => mesh.visible = false);
    }
  }, [setScore, setActivePowerup, initialPowerup, gameMode]);

  const handleJump = useCallback(() => {
    if (gameState !== GameState.PLAYING) return;
    if (!isRoundActiveRef.current) {
        isRoundActiveRef.current = true;
    }
    birdRef.current.velocity = GAME_CONSTANTS.JUMP_STRENGTH;
    audioService.playJump();
  }, [gameState]);

  const toWorldY = (screenY: number, screenHeight: number) => (screenHeight / 2) - screenY;
  const toWorldX = (screenX: number, screenWidth: number) => screenX - (screenWidth / 2);

  // --- Main Loop ---
  const loop = useCallback(() => {
    if (!sceneRef.current || !cameraRef.current || !rendererRef.current) return;

    const width = window.innerWidth;
    const height = window.innerHeight;
    
    const now = performance.now();
    if (!lastTimeRef.current) lastTimeRef.current = now;
    const rawDeltaMS = Math.min(now - lastTimeRef.current, 100); 
    lastTimeRef.current = now;
    const rawDeltaFactor = rawDeltaMS / 16.666;
    
    timeScaleRef.current += (targetTimeScaleRef.current - timeScaleRef.current) * (0.1 * rawDeltaFactor);
    const dt = rawDeltaFactor * timeScaleRef.current;

    if (gameState === GameState.START) {
        const time = Date.now() * 0.005;
        birdRef.current.y = (height / 2) + Math.sin(time) * 15;
        birdRef.current.rotation = 0;
    } 
    else if (gameState === GameState.PLAYING) {
      if (!isRoundActiveRef.current) {
          const time = Date.now() * 0.005;
          birdRef.current.y = (height / 2) + Math.sin(time) * 15;
          birdRef.current.rotation = 0;
      } else {
          frameCountRef.current += dt;

          birdRef.current.velocity += GAME_CONSTANTS.GRAVITY * dt;
          birdRef.current.y += birdRef.current.velocity * dt;
          birdRef.current.rotation = Math.min(Math.PI / 4, Math.max(-Math.PI / 4, (birdRef.current.velocity * 0.1)));

          if (gameMode !== 'battle' && birdRef.current.effectTimer > 0) {
            birdRef.current.effectTimer -= 1 * dt; 
            if (activePowerupRef.current) {
                 activePowerupRef.current.timeLeft = birdRef.current.effectTimer;
                 setActivePowerup({ ...activePowerupRef.current });
            }
            if (birdRef.current.effectTimer <= 0) {
              birdRef.current.targetScale = GAME_CONSTANTS.SCALE_NORMAL;
              targetTimeScaleRef.current = GAME_CONSTANTS.TIME_SCALE_NORMAL;
              activePowerupRef.current = null;
              setActivePowerup(null);
            }
          }
          
          const scaleLerp = 0.1 * rawDeltaFactor;
          birdRef.current.scale += (birdRef.current.targetScale - birdRef.current.scale) * scaleLerp;
          
          speedRef.current += GAME_CONSTANTS.SPEED_INCREMENT * dt;
          const moveSpeed = (speedRef.current) * dt;

          // --- WEAPONS SYSTEM ---
          if (activePowerupRef.current?.type === 'gun') {
              if (frameCountRef.current - lastShotFrameRef.current >= GAME_CONSTANTS.GUN_FIRE_RATE) {
                  lastShotFrameRef.current = frameCountRef.current;
                  const birdX = width * GAME_CONSTANTS.BIRD_X_POSITION;
                  projectilesRef.current.push({
                      id: Math.random(),
                      x: birdX + 20,
                      y: birdRef.current.y - 5,
                      vx: GAME_CONSTANTS.PROJECTILE_SPEED
                  });
                  audioService.playShoot();
              }
          }

          for (let i = projectilesRef.current.length - 1; i >= 0; i--) {
              const proj = projectilesRef.current[i];
              proj.x += proj.vx * dt;
              let hit = false;
              
              // Projectile vs Pipe
              if (gameMode !== 'battle') {
                  for (let j = 0; j < pipesRef.current.length; j++) {
                      const pipe = pipesRef.current[j];
                      if (proj.x > pipe.x && proj.x < pipe.x + GAME_CONSTANTS.PIPE_WIDTH) {
                          if (!pipe.brokenTop && proj.y < pipe.topHeight) {
                              pipe.brokenTop = true; hit = true;
                          } else if (!pipe.brokenBottom && proj.y > pipe.topHeight + GAME_CONSTANTS.PIPE_GAP) {
                              pipe.brokenBottom = true; hit = true;
                          }
                          if (hit) {
                              scoreRef.current += 2;
                              setScore(scoreRef.current);
                              audioService.playExplosion();
                              triggerEffect();
                              for(let k=0; k<10; k++) {
                                  particlesRef.current.push({
                                      x: proj.x, y: proj.y,
                                      vx: (Math.random()-0.5)*5, vy: (Math.random()-0.5)*5,
                                      life: 20, maxLife: 20, scale: 3, color: 0xFF0000, rotation: 0
                                  });
                              }
                              break; 
                          }
                      }
                  }
              }

              // Projectile vs Enemy
              if (gameMode === 'battle' && !hit) {
                  for (let j = enemiesRef.current.length - 1; j >= 0; j--) {
                      const enemy = enemiesRef.current[j];
                      const dx = proj.x - enemy.x;
                      const dy = proj.y - enemy.y;
                      const dist = Math.sqrt(dx*dx + dy*dy);
                      if (dist < BATTLE_CONSTANTS.ENEMY_SIZE + 10) {
                          hit = true;
                          enemy.hp--;
                          if (enemy.hp <= 0) {
                              scoreRef.current += BATTLE_CONSTANTS.ENEMY_SCORE;
                              setScore(scoreRef.current);
                              enemiesRef.current.splice(j, 1);
                              audioService.playExplosion();
                              triggerEffect();
                              // Explosion
                              for(let k=0; k<15; k++) {
                                  particlesRef.current.push({
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

              if (hit || proj.x > width + 100) {
                  projectilesRef.current.splice(i, 1);
              }
          }

          // --- ENEMY SPAWNING (BATTLE MODE) ---
          if (gameMode === 'battle') {
              if (frameCountRef.current - lastEnemySpawnFrameRef.current >= BATTLE_CONSTANTS.ENEMY_SPAWN_RATE) {
                  lastEnemySpawnFrameRef.current = frameCountRef.current;
                  const padding = 50;
                  const spawnY = padding + Math.random() * (height - padding * 2);
                  enemiesRef.current.push({
                      id: Math.random(),
                      x: width + 50,
                      y: spawnY,
                      velocity: BATTLE_CONSTANTS.ENEMY_SPEED + (Math.random() * 2),
                      targetY: spawnY,
                      hp: BATTLE_CONSTANTS.ENEMY_HP,
                      scale: 1.0
                  });
              }

              const birdX = width * GAME_CONSTANTS.BIRD_X_POSITION;
              const birdRadius = GAME_CONSTANTS.BIRD_RADIUS * birdRef.current.scale;

              for (let i = enemiesRef.current.length - 1; i >= 0; i--) {
                  const enemy = enemiesRef.current[i];
                  enemy.x -= enemy.velocity * dt;
                  
                  // Sine wave movement
                  enemy.y = enemy.targetY + Math.sin(frameCountRef.current * 0.05 + enemy.id * 10) * 50;
                  
                  if (enemy.x < -100) {
                      enemiesRef.current.splice(i, 1);
                      continue;
                  }

                  // Collision Player vs Enemy
                  const dx = enemy.x - birdX;
                  const dy = enemy.y - birdRef.current.y;
                  const dist = Math.sqrt(dx*dx + dy*dy);
                  if (dist < birdRadius + BATTLE_CONSTANTS.ENEMY_SIZE) {
                      audioService.playCrash();
                      triggerEffect();
                      setGameState(GameState.GAME_OVER);
                  }
              }
          }

          // --- PIPE SPAWNING (STANDARD MODE) ---
          if (gameMode !== 'battle') {
              const spawnInterval = Math.floor(GAME_CONSTANTS.PIPE_SPAWN_RATE * (GAME_CONSTANTS.BASE_PIPE_SPEED / speedRef.current));
              const spawnRate = Math.floor(Math.max(30, spawnInterval / timeScaleRef.current));
              
              if (frameCountRef.current - lastPipeSpawnFrameRef.current >= spawnRate) {
                  lastPipeSpawnFrameRef.current = frameCountRef.current;
                  const minPipeHeight = 50;
                  const maxTopPipeHeight = Math.max(minPipeHeight, height - GAME_CONSTANTS.PIPE_GAP - minPipeHeight);
                  let minBound = minPipeHeight;
                  let maxBound = maxTopPipeHeight;
                  if (pipesRef.current.length > 0) {
                      const lastPipe = pipesRef.current[pipesRef.current.length - 1];
                      const timeFactor = (GAME_CONSTANTS.BASE_PIPE_SPEED / speedRef.current);
                      const maxJump = Math.max(80, (height * 0.4) * timeFactor);
                      minBound = Math.max(minPipeHeight, lastPipe.topHeight - maxJump);
                      maxBound = Math.min(maxTopPipeHeight, lastPipe.topHeight + maxJump);
                  } else {
                      minBound = height / 3;
                      maxBound = height / 1.5;
                  }
                  const topHeight = Math.floor(minBound + Math.random() * (maxBound - minBound));
                  const isGlass = Math.random() < GAME_CONSTANTS.GLASS_PIPE_CHANCE;
                  pipesRef.current.push({
                      x: width, topHeight, passed: false, type: isGlass ? 'glass' : 'normal', brokenTop: false, brokenBottom: false
                  });
              }
          }

          // --- POWERUP SPAWNING ---
          if (gameMode !== 'battle') {
              const powerupRate = Math.floor(GAME_CONSTANTS.POWERUP_SPAWN_RATE / timeScaleRef.current);
              if (!initialPowerup && frameCountRef.current - lastPowerupSpawnFrameRef.current >= powerupRate) {
                  lastPowerupSpawnFrameRef.current = frameCountRef.current;
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
                  if (pipesRef.current.length > 0) {
                      const lastPipe = pipesRef.current[pipesRef.current.length - 1];
                      const distFromPipe = Math.abs(width - lastPipe.x);
                      if (distFromPipe < 350) {
                          const padding = 45;
                          spawnMinY = lastPipe.topHeight + padding;
                          spawnMaxY = lastPipe.topHeight + GAME_CONSTANTS.PIPE_GAP - padding;
                      }
                  }
                  const y = spawnMinY + Math.random() * (spawnMaxY - spawnMinY);
                  powerupsRef.current.push({ x: width, y, type, active: true });
              }
          }

          // Powerup Collision
          const birdX = width * GAME_CONSTANTS.BIRD_X_POSITION;
          const birdRadius = (GAME_CONSTANTS.BIRD_RADIUS * birdRef.current.scale) - 2; 

          for (let i = powerupsRef.current.length - 1; i >= 0; i--) {
            const p = powerupsRef.current[i];
            p.x -= moveSpeed;
            if (p.active) {
              const dx = p.x - birdX;
              const dy = p.y - birdRef.current.y;
              const dist = Math.sqrt(dx*dx + dy*dy);
              if (dist < birdRadius + GAME_CONSTANTS.POWERUP_SIZE) {
                p.active = false;
                let duration = GAME_CONSTANTS.DURATION_SIZE;
                birdRef.current.targetScale = GAME_CONSTANTS.SCALE_NORMAL;
                targetTimeScaleRef.current = GAME_CONSTANTS.TIME_SCALE_NORMAL;
                switch (p.type) {
                    case 'shrink': birdRef.current.targetScale = GAME_CONSTANTS.SCALE_SHRINK; audioService.playShrink(); break;
                    case 'grow': birdRef.current.targetScale = GAME_CONSTANTS.SCALE_GROW; audioService.playGrow(); break;
                    case 'slowmo': targetTimeScaleRef.current = GAME_CONSTANTS.TIME_SCALE_SLOW; duration = GAME_CONSTANTS.DURATION_SLOWMO; audioService.playSlowMo(); break;
                    case 'fast': targetTimeScaleRef.current = GAME_CONSTANTS.TIME_SCALE_FAST; duration = GAME_CONSTANTS.DURATION_FAST; audioService.playFastForward(); break;
                    case 'shield': duration = GAME_CONSTANTS.DURATION_SHIELD; audioService.playShieldUp(); break;
                    case 'ghost': duration = GAME_CONSTANTS.DURATION_GHOST; audioService.playGhost(); break;
                    case 'gun': duration = GAME_CONSTANTS.DURATION_GUN; audioService.playShieldUp(); break;
                }
                birdRef.current.effectTimer = duration;
                activePowerupRef.current = { type: p.type, timeLeft: duration, totalTime: duration };
                setActivePowerup(activePowerupRef.current);
              }
            }
            if (p.x + GAME_CONSTANTS.POWERUP_SIZE < 0 || !p.active) {
              powerupsRef.current.splice(i, 1);
            }
          }

          // Particle Updates
          if (currentSkin.trail !== 'none' && (frameCountRef.current - lastParticleFrameRef.current >= PARTICLE_CONFIG.TRAIL_SPAWN_RATE)) {
              lastParticleFrameRef.current = frameCountRef.current;
              const pScale = currentSkin.trail === 'pixel_dust' ? 4 : 2;
              const pLife = 40;
              let color = currentSkin.trail === 'sparkle' ? 0xFFFF00 : 
                         currentSkin.trail === 'neon_line' ? (currentSkin.colors.glow || 0x00FFFF) : 0xFFFFFF;

              particlesRef.current.push({
                  x: birdX - 10,
                  y: birdRef.current.y + (Math.random() * 10 - 5),
                  vx: -2 - Math.random(),
                  vy: (Math.random() - 0.5) * 2,
                  life: pLife,
                  maxLife: pLife,
                  scale: pScale,
                  color: color,
                  rotation: Math.random() * Math.PI
              });
          }

          if (frameCountRef.current - lastBulletTrailFrameRef.current >= 2) {
              lastBulletTrailFrameRef.current = frameCountRef.current;
              projectilesRef.current.forEach(proj => {
                  particlesRef.current.push({
                      x: proj.x, y: proj.y,
                      vx: -2, vy: 0,
                      life: 10, maxLife: 10, scale: 2,
                      color: 0xFFFF00,
                      rotation: 0
                  });
              });
          }

          for (let i = particlesRef.current.length - 1; i >= 0; i--) {
              const p = particlesRef.current[i];
              p.x += p.vx * dt;
              p.y += p.vy * dt;
              p.life -= 1 * dt;
              if (p.life <= 0) {
                  particlesRef.current.splice(i, 1);
              }
          }

          // Pipe Updates
          for (let i = pipesRef.current.length - 1; i >= 0; i--) {
            const pipe = pipesRef.current[i];
            pipe.x -= moveSpeed;
            if (pipe.x + GAME_CONSTANTS.PIPE_WIDTH < 0) {
              pipesRef.current.splice(i, 1);
              continue;
            }
            const isGhost = activePowerupRef.current?.type === 'ghost';
            if (!isGhost) {
                if (birdX + birdRadius > pipe.x && birdX - birdRadius < pipe.x + GAME_CONSTANTS.PIPE_WIDTH) {
                  const hitTop = !pipe.brokenTop && birdRef.current.y - birdRadius < pipe.topHeight;
                  const hitBottom = !pipe.brokenBottom && birdRef.current.y + birdRadius > pipe.topHeight + GAME_CONSTANTS.PIPE_GAP;
                  if (hitTop || hitBottom) {
                     if (pipe.type === 'glass') {
                       const isFreshBreak = (hitTop && !pipe.brokenTop) || (hitBottom && !pipe.brokenBottom);
                       if (isFreshBreak) {
                         if (hitTop) pipe.brokenTop = true;
                         if (hitBottom) pipe.brokenBottom = true;
                         scoreRef.current += GAME_CONSTANTS.GLASS_BREAK_SCORE;
                         setScore(scoreRef.current);
                         audioService.playGlassBreak();
                         triggerEffect();
                         birdRef.current.velocity = Math.max(birdRef.current.velocity + GAME_CONSTANTS.GLASS_BREAK_PENALTY, GAME_CONSTANTS.GLASS_BREAK_PENALTY / 2);
                       }
                     } else {
                       const hasShield = activePowerupRef.current?.type === 'shield';
                       if (hasShield) {
                           const recoveryTime = 60; 
                           activePowerupRef.current = { type: 'ghost', timeLeft: recoveryTime, totalTime: recoveryTime };
                           birdRef.current.effectTimer = recoveryTime;
                           setActivePowerup({ ...activePowerupRef.current });
                           audioService.playShieldBreak();
                           triggerEffect();
                           
                           for(let k=0; k<20; k++) {
                               const angle = Math.random() * Math.PI * 2;
                               const speed = 4 + Math.random() * 4;
                               particlesRef.current.push({
                                  x: birdX, y: birdRef.current.y,
                                  vx: Math.cos(angle) * speed,
                                  vy: Math.sin(angle) * speed,
                                  life: 30, maxLife: 30, scale: 3, 
                                  color: parseInt(COLORS.SHIELD_GLOW.replace('#','0x')), 
                                  rotation: Math.random() * Math.PI
                               });
                           }
                       } else {
                           audioService.playCrash();
                           triggerEffect();
                           setGameState(GameState.GAME_OVER);
                       }
                     }
                  }
                }
            }
            if (!pipe.passed && birdX > pipe.x + GAME_CONSTANTS.PIPE_WIDTH) {
              pipe.passed = true;
              scoreRef.current += 1;
              setScore(scoreRef.current);
              audioService.playScore();
            }
          }

          if (birdRef.current.y + birdRadius >= height || birdRef.current.y - birdRadius <= 0) {
             audioService.playCrash();
             triggerEffect();
             setGameState(GameState.GAME_OVER);
          }
      }
    }

    // --- RENDER SYNC ---
    const isShieldActive = activePowerupRef.current?.type === 'shield';
    const isGhostActive = activePowerupRef.current?.type === 'ghost';
    const isGunActive = activePowerupRef.current?.type === 'gun';

    if (birdMeshRef.current) {
      const birdX = width * GAME_CONSTANTS.BIRD_X_POSITION;
      birdMeshRef.current.position.x = toWorldX(birdX, width);
      birdMeshRef.current.position.y = toWorldY(birdRef.current.y, height);
      birdMeshRef.current.rotation.z = birdRef.current.rotation;
      const s = birdRef.current.scale;
      birdMeshRef.current.scale.set(s, s, s);
      birdMeshRef.current.visible = true;

      let targetBrowRot = 0; 
      let targetPupilScale = 1;
      
      if (gameState === GameState.GAME_OVER) {
          targetPupilScale = 0.2;
      } else {
          const closePipe = pipesRef.current.find(p => p.x > birdX - 50 && p.x < birdX + 200);
          const isFalling = birdRef.current.velocity > 6;
          const isFast = speedRef.current > GAME_CONSTANTS.BASE_PIPE_SPEED * 1.3;
          const isPowered = !!activePowerupRef.current;

          if (isFast) {
              targetBrowRot = -0.4; 
              targetPupilScale = 0.8 + Math.sin(Date.now() * 0.05) * 0.2; 
          } else if (closePipe) {
              targetBrowRot = 0.4;
          } else if (isFalling) {
              targetBrowRot = -0.2;
              targetPupilScale = 1.25;
          } else if (isPowered) {
              targetBrowRot = -0.3; 
          }
      }

      const browL = birdMeshRef.current.getObjectByName('browL');
      if (browL) browL.rotation.z += (targetBrowRot - browL.rotation.z) * 0.2;
      const browR = birdMeshRef.current.getObjectByName('browR');
      if (browR) browR.rotation.z += (-targetBrowRot - browR.rotation.z) * 0.2;
      
      birdMeshRef.current.traverse((child) => {
          if (child.name === 'pupil') {
              const currentS = child.scale.x;
              const newS = currentS + (targetPupilScale - currentS) * 0.2;
              child.scale.set(newS, newS, 1);
          }
          if (child instanceof THREE.Mesh) {
             const mat = child.material as THREE.MeshStandardMaterial;
             if (mat.name !== 'shield' && mat.name !== 'gun') { 
                 mat.opacity = isGhostActive ? 0.3 : 1.0;
                 mat.transparent = true; 
             }
          }
      });
      
      const shield = birdMeshRef.current.getObjectByName('shield');
      if (shield) {
          shield.visible = isShieldActive;
          if (isShieldActive) {
              shield.scale.set(1.4, 1.4, 1.4);
              shield.rotation.y += 0.02; // Slower rotation
          }
      }

      const gun = birdMeshRef.current.getObjectByName('gun');
      if (gun) gun.visible = isGunActive;
    }

    // Render Enemies
    const currentEnemies = new Set(enemiesRef.current);
    for (const [enemy, group] of enemyMeshesRef.current.entries()) {
        if (!currentEnemies.has(enemy)) {
            sceneRef.current?.remove(group);
            enemyMeshesRef.current.delete(enemy);
        }
    }
    
    enemiesRef.current.forEach(enemy => {
        let group = enemyMeshesRef.current.get(enemy);
        if (!group) {
            group = createBirdMesh(ENEMY_SKIN, geometryRef.current, materialRef.current);
            // Flip enemy to face left
            group.rotation.y = Math.PI;
            sceneRef.current?.add(group);
            enemyMeshesRef.current.set(enemy, group);
        }
        group.position.x = toWorldX(enemy.x, width);
        group.position.y = toWorldY(enemy.y, height);
        // Tilt forward as they fly
        group.rotation.z = 0.2;
        group.scale.set(1.2, 1.2, 1.2);
    });


    particleMeshesRef.current.forEach(m => m.visible = false);
    while (particleMeshesRef.current.length < particlesRef.current.length) {
        const geo = currentSkin.trail === 'pixel_dust' || currentSkin.trail === 'neon_line' ? geometryRef.current!.particleBox : geometryRef.current!.particleSphere;
        const mesh = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true }));
        sceneRef.current?.add(mesh);
        particleMeshesRef.current.push(mesh);
    }
    particlesRef.current.forEach((p, i) => {
        const mesh = particleMeshesRef.current[i];
        mesh.visible = true;
        mesh.position.x = toWorldX(p.x, width);
        mesh.position.y = toWorldY(p.y, height);
        mesh.position.z = -5; 
        const scale = p.scale * (p.life / p.maxLife);
        mesh.scale.set(scale, scale, scale);
        (mesh.material as THREE.MeshBasicMaterial).color.setHex(p.color);
        (mesh.material as THREE.MeshBasicMaterial).opacity = p.life / p.maxLife;
        mesh.rotation.z = p.rotation;
    });

    projectileMeshesRef.current.forEach(m => m.visible = false);
    while (projectileMeshesRef.current.length < projectilesRef.current.length) {
        const mesh = new THREE.Mesh(geometryRef.current!.particleSphere, materialRef.current!.projectile);
        const glow = new THREE.Mesh(geometryRef.current!.particleSphere, new THREE.MeshBasicMaterial({ color: 0xFFFFFF, transparent: true, opacity: 0.5 }));
        glow.scale.set(1.5, 1.5, 1.5);
        mesh.add(glow);
        sceneRef.current?.add(mesh);
        projectileMeshesRef.current.push(mesh);
    }
    projectilesRef.current.forEach((p, i) => {
        const mesh = projectileMeshesRef.current[i];
        mesh.visible = true;
        mesh.position.x = toWorldX(p.x, width);
        mesh.position.y = toWorldY(p.y, height);
        mesh.position.z = 2;
        mesh.scale.set(6, 6, 6);
    });

    const currentPipes = new Set(pipesRef.current);
    for (const [pipe, mesh] of pipeMeshesRef.current.entries()) {
      if (!currentPipes.has(pipe)) {
        sceneRef.current.remove(mesh);
        pipeMeshesRef.current.delete(pipe);
      }
    }
    pipesRef.current.forEach(pipe => {
      let group = pipeMeshesRef.current.get(pipe);
      if (!group) {
        group = new THREE.Group();
        if (geometryRef.current && materialRef.current) {
            const isGlass = pipe.type === 'glass';
            const bodyMat = isGlass ? materialRef.current.glassPipe : materialRef.current.pipe;
            const capMat = isGlass ? materialRef.current.glassCap : materialRef.current.pipeCap;
            const topMesh = new THREE.Mesh(geometryRef.current.pipe, bodyMat);
            topMesh.castShadow = !isGlass; topMesh.receiveShadow = true; topMesh.name = 'top'; group.add(topMesh);
            const topCap = new THREE.Mesh(geometryRef.current.pipeCap, capMat);
            topCap.name = 'topCap'; topCap.castShadow = !isGlass; group.add(topCap);
            const bottomMesh = new THREE.Mesh(geometryRef.current.pipe, bodyMat);
            bottomMesh.castShadow = !isGlass; bottomMesh.receiveShadow = true; bottomMesh.name = 'bottom'; group.add(bottomMesh);
            const bottomCap = new THREE.Mesh(geometryRef.current.pipeCap, capMat);
            bottomCap.name = 'bottomCap'; bottomCap.castShadow = !isGlass; group.add(bottomCap);
        }
        sceneRef.current?.add(group);
        pipeMeshesRef.current.set(pipe, group);
      }
      group.position.x = toWorldX(pipe.x + GAME_CONSTANTS.PIPE_WIDTH / 2, width);
      group.position.z = 0;
      group.traverse((child) => {
          if (child instanceof THREE.Mesh) {
              const isGlass = pipe.type === 'glass';
              if (isGhostActive) {
                  const m = child.material as THREE.Material;
                  m.transparent = true; m.opacity = isGlass ? 0.2 : 0.5;
              } else {
                  const m = child.material as THREE.Material;
                  if (!isGlass) m.opacity = 1.0;
              }
          }
      });
      const topMesh = group.getObjectByName('top') as THREE.Mesh;
      const topCap = group.getObjectByName('topCap') as THREE.Mesh;
      const bottomMesh = group.getObjectByName('bottom') as THREE.Mesh;
      const bottomCap = group.getObjectByName('bottomCap') as THREE.Mesh;
      if (topMesh) topMesh.visible = !pipe.brokenTop;
      if (topCap) topCap.visible = !pipe.brokenTop;
      if (bottomMesh) bottomMesh.visible = !pipe.brokenBottom;
      if (bottomCap) bottomCap.visible = !pipe.brokenBottom;
      if (topMesh && topCap) {
        const topPipeHeight = pipe.topHeight;
        topMesh.scale.set(1, topPipeHeight, 1);
        topMesh.position.y = (height / 2) - (topPipeHeight / 2);
        topCap.position.y = (height / 2) - topPipeHeight - 5; 
      }
      if (bottomMesh && bottomCap) {
        const bottomPipeYStart = pipe.topHeight + GAME_CONSTANTS.PIPE_GAP;
        const bottomPipeHeight = Math.max(1, height - bottomPipeYStart);
        bottomMesh.scale.set(1, bottomPipeHeight, 1);
        bottomMesh.position.y = (height / 2) - bottomPipeYStart - (bottomPipeHeight / 2);
        bottomCap.position.y = (height / 2) - bottomPipeYStart + 5;
      }
    });

    const currentPowerups = new Set(powerupsRef.current);
    for (const [p, mesh] of powerupMeshesRef.current.entries()) {
      if (!currentPowerups.has(p)) {
        sceneRef.current.remove(mesh);
        powerupMeshesRef.current.delete(p);
      }
    }
    powerupsRef.current.forEach(p => {
      let mesh = powerupMeshesRef.current.get(p);
      if (!mesh) {
        if (geometryRef.current && materialRef.current) {
          const geo = geometryRef.current.orb;
          let mat = materialRef.current.pShrink;
          switch (p.type) {
              case 'grow': mat = materialRef.current.pGrow; break;
              case 'slowmo': mat = materialRef.current.pSlow; break;
              case 'fast': mat = materialRef.current.pFast; break;
              case 'shield': mat = materialRef.current.pShield; break;
              case 'ghost': mat = materialRef.current.pGhost; break;
              case 'gun': mat = materialRef.current.pGun; break;
          }
          mesh = new THREE.Mesh(geo, mat);
          mesh.scale.set(GAME_CONSTANTS.POWERUP_SIZE/2, GAME_CONSTANTS.POWERUP_SIZE/2, GAME_CONSTANTS.POWERUP_SIZE/2); 
          sceneRef.current?.add(mesh);
          powerupMeshesRef.current.set(p, mesh);
        }
      }
      if (mesh) {
        mesh.position.x = toWorldX(p.x, width);
        mesh.position.y = toWorldY(p.y, height);
        mesh.rotation.y += 0.05; mesh.rotation.z += 0.02;
      }
    });

    rendererRef.current.render(sceneRef.current, cameraRef.current);
    requestRef.current = requestAnimationFrame(loop);
  }, [gameState, setGameState, setScore, triggerEffect, highScore, setActivePowerup, currentSkin, initialPowerup, gameMode]);

  useEffect(() => {
    if (!containerRef.current) return;
    const width = window.innerWidth;
    const height = window.innerHeight;

    const { scene, camera, renderer, bgTexture } = setupThreeScene(containerRef.current, width, height);
    
    sceneRef.current = scene;
    cameraRef.current = camera;
    rendererRef.current = renderer;
    bgTextureRef.current = bgTexture;

    // Load assets
    geometryRef.current = createGeometries();
    materialRef.current = createMaterials();
    
    // Create particle pool
    for(let i=0; i<PARTICLE_CONFIG.MAX_PARTICLES; i++) {
        const mesh = new THREE.Mesh(geometryRef.current.particleSphere, new THREE.MeshBasicMaterial({color: 0xffffff, transparent: true}));
        mesh.visible = false;
        scene.add(mesh);
        particleMeshesRef.current.push(mesh);
    }
    
    sceneReady.current = true;

    // Create initial bird
    const birdGroup = createBirdMesh(currentSkin, geometryRef.current, materialRef.current);
    const birdX = width * GAME_CONSTANTS.BIRD_X_POSITION;
    birdGroup.position.x = toWorldX(birdX, width);
    birdGroup.position.y = toWorldY(birdRef.current.y, height);
    scene.add(birdGroup);
    birdMeshRef.current = birdGroup;

    return () => {
        if (containerRef.current && renderer.domElement) containerRef.current.removeChild(renderer.domElement);
        renderer.dispose();
        geometryRef.current?.pipe.dispose();
        materialRef.current?.pipe.dispose();
        sceneReady.current = false;
    };
  }, []); // Replaced createBirdMesh dependency with empty array as it's now imported

  // Sync bird when skin changes
  useEffect(() => {
    if (!sceneReady.current || !sceneRef.current) return;
    if (birdMeshRef.current) {
        sceneRef.current.remove(birdMeshRef.current);
    }
    const newBird = createBirdMesh(currentSkin, geometryRef.current, materialRef.current);
    const width = window.innerWidth;
    const height = window.innerHeight;
    const birdX = width * GAME_CONSTANTS.BIRD_X_POSITION;
    newBird.position.x = toWorldX(birdX, width);
    newBird.position.y = toWorldY(birdRef.current.y, height);
    newBird.rotation.z = birdRef.current.rotation;
    sceneRef.current.add(newBird);
    birdMeshRef.current = newBird;
  }, [currentSkin]);

  useEffect(() => {
      const handleResize = () => {
          if (!cameraRef.current || !rendererRef.current) return;
          const w = window.innerWidth;
          const h = window.innerHeight;
          cameraRef.current.aspect = w / h;
          const fov = cameraRef.current.fov;
          const dist = h / (2 * Math.tan((fov * Math.PI) / 360));
          cameraRef.current.position.z = dist;
          cameraRef.current.updateProjectionMatrix();
          rendererRef.current.setSize(w, h);
          pipesRef.current = [];
          if (birdRef.current.y > h) birdRef.current.y = h / 2;
      };
      window.addEventListener('resize', handleResize);
      return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    requestRef.current = requestAnimationFrame(loop);
    return () => {
      if (requestRef.current) cancelAnimationFrame(requestRef.current);
    };
  }, [loop]);

  useEffect(() => {
    if (gameState === GameState.START) {
      initGame();
    } 
    else if (gameState === GameState.PLAYING) {
       if (prevGameStateRef.current === GameState.START || prevGameStateRef.current === GameState.GAME_OVER) {
         initGame();
       }
    }
    prevGameStateRef.current = gameState;
  }, [gameState, initGame]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'Space') {
        e.preventDefault();
        handleJump();
      }
    };
    const handleTouchOrClick = (e: Event) => {
      handleJump();
    };
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('mousedown', handleTouchOrClick);
    window.addEventListener('touchstart', handleTouchOrClick, { passive: false });
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('mousedown', handleTouchOrClick);
      window.removeEventListener('touchstart', handleTouchOrClick);
    };
  }, [handleJump]);

  return (
    <div ref={containerRef} className="w-full h-full cursor-pointer" />
  );
};
