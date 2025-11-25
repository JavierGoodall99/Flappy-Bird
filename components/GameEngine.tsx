
import React, { useRef, useEffect, useCallback } from 'react';
import * as THREE from 'three';
import { GameState, Bird, Pipe, Powerup, PowerupType, ActivePowerup, Skin, Particle, Projectile } from '../types';
import { GAME_CONSTANTS, COLORS, PARTICLE_CONFIG, SKINS } from '../constants';
import { audioService } from '../services/audioService';

interface GameEngineProps {
  gameState: GameState;
  setGameState: (state: GameState) => void;
  setScore: (score: number) => void;
  triggerEffect: () => void;
  highScore: number;
  setActivePowerup: (powerup: ActivePowerup | null) => void;
  currentSkin: Skin;
}

export const GameEngine: React.FC<GameEngineProps> = ({ 
  gameState, 
  setGameState, 
  setScore,
  triggerEffect,
  highScore,
  setActivePowerup,
  currentSkin
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const requestRef = useRef<number>(0);
  const frameCountRef = useRef<number>(0);
  
  // Game State Refs
  const isRoundActiveRef = useRef<boolean>(false); // Waits for first input
  const birdRef = useRef<Bird>({ 
    y: 0, 
    velocity: 0, 
    rotation: 0,
    scale: 1,
    targetScale: 1,
    effectTimer: 0
  });
  
  const timeScaleRef = useRef<number>(1.0);
  const targetTimeScaleRef = useRef<number>(1.0);
  const activePowerupRef = useRef<ActivePowerup | null>(null);
  const bgTextureRef = useRef<THREE.Texture | null>(null);

  const pipesRef = useRef<Pipe[]>([]);
  const powerupsRef = useRef<Powerup[]>([]);
  const particlesRef = useRef<Particle[]>([]);
  const projectilesRef = useRef<Projectile[]>([]);
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

  const particleMeshesRef = useRef<THREE.Mesh[]>([]); // Pool of particle meshes
  const sceneReady = useRef<boolean>(false);

  // Geometry/Material Cache
  const geometryRef = useRef<{
    pipe: THREE.CylinderGeometry;
    pipeCap: THREE.CylinderGeometry;
    orb: THREE.IcosahedronGeometry;
    shield: THREE.SphereGeometry;
    particleBox: THREE.BoxGeometry;
    particleSphere: THREE.SphereGeometry;
    particleTetra: THREE.TetrahedronGeometry;
    voxel: THREE.BoxGeometry;
    hairSpikeLarge: THREE.ConeGeometry;
    hairSpikeMedium: THREE.ConeGeometry;
    hairSpikeSmall: THREE.ConeGeometry;
    strawHatBrim: THREE.CylinderGeometry;
    strawHatTop: THREE.CylinderGeometry;
    headbandPlate: THREE.BoxGeometry;
    gunBarrel: THREE.CylinderGeometry;
  } | null>(null);
  
  const materialRef = useRef<{
    pipe: THREE.MeshStandardMaterial;
    pipeCap: THREE.MeshStandardMaterial;
    glassPipe: THREE.MeshPhysicalMaterial;
    glassCap: THREE.MeshPhysicalMaterial;
    pShrink: THREE.MeshStandardMaterial;
    pGrow: THREE.MeshStandardMaterial;
    pSlow: THREE.MeshStandardMaterial;
    pShield: THREE.MeshStandardMaterial;
    pGhost: THREE.MeshStandardMaterial;
    pGun: THREE.MeshStandardMaterial;
    shieldEffect: THREE.MeshPhysicalMaterial;
    projectile: THREE.MeshStandardMaterial;
    particleMat: THREE.MeshBasicMaterial;
    gunMat: THREE.MeshStandardMaterial;
  } | null>(null);

  // Initialize Game State
  const initGame = useCallback(() => {
    const height = window.innerHeight;
    
    isRoundActiveRef.current = false;

    birdRef.current = { 
      y: height / 2, 
      velocity: 0, // Paused start
      rotation: 0,
      scale: GAME_CONSTANTS.SCALE_NORMAL,
      targetScale: GAME_CONSTANTS.SCALE_NORMAL,
      effectTimer: 0
    };
    pipesRef.current = [];
    powerupsRef.current = [];
    particlesRef.current = [];
    projectilesRef.current = [];
    scoreRef.current = 0;
    speedRef.current = GAME_CONSTANTS.BASE_PIPE_SPEED;
    frameCountRef.current = 0;
    
    timeScaleRef.current = 1.0;
    targetTimeScaleRef.current = 1.0;
    activePowerupRef.current = null;
    setActivePowerup(null);
    
    setScore(0);

    // Restore BG
    if (sceneRef.current && bgTextureRef.current) {
        sceneRef.current.background = bgTextureRef.current;
    }
    if (cameraRef.current) {
        cameraRef.current.fov = 40;
        cameraRef.current.updateProjectionMatrix();
    }

    // Clear 3D objects
    if (sceneRef.current) {
      pipeMeshesRef.current.forEach((group) => sceneRef.current?.remove(group));
      pipeMeshesRef.current.clear();
      powerupMeshesRef.current.forEach((mesh) => sceneRef.current?.remove(mesh));
      powerupMeshesRef.current.clear();
      projectileMeshesRef.current.forEach(mesh => { mesh.visible = false; });
      
      // Hide all particles
      particleMeshesRef.current.forEach(mesh => mesh.visible = false);
    }
  }, [setScore, setActivePowerup]);

  // Handle Jump
  const handleJump = useCallback(() => {
    if (gameState !== GameState.PLAYING) return;
    
    // First interaction starts the round
    if (!isRoundActiveRef.current) {
        isRoundActiveRef.current = true;
    }

    birdRef.current.velocity = GAME_CONSTANTS.JUMP_STRENGTH;
    audioService.playJump();
  }, [gameState]);

  const toWorldY = (screenY: number, screenHeight: number) => (screenHeight / 2) - screenY;
  const toWorldX = (screenX: number, screenWidth: number) => screenX - (screenWidth / 2);

  // --- SKIN RENDERER ---
  const createBirdMesh = useCallback(() => {
    if (!geometryRef.current) return new THREE.Group();

    const group = new THREE.Group();
    const opacity = 1.0;
    const transparent = true;
    const skin = currentSkin;

    // Common Geometries
    const bodyRadius = 15;
    
    // --- STANDARD / NEON MODEL ---
    if (skin.modelType === 'standard' || skin.modelType === 'neon') {
        const isNeon = skin.modelType === 'neon';
        const bodyColor = skin.colors.body;
        const wingColor = skin.colors.wing;
        
        const bodyMat = new THREE.MeshStandardMaterial({ 
            color: bodyColor, 
            roughness: isNeon ? 0.2 : 0.1, 
            metalness: isNeon ? 0.8 : 0.1,
            emissive: isNeon ? (skin.colors.glow || bodyColor) : bodyColor,
            emissiveIntensity: isNeon ? 1.0 : 0.25,
            transparent, opacity
        });
        const whiteMat = new THREE.MeshStandardMaterial({ color: skin.colors.eye, roughness: 0.2, metalness: 0.1, transparent, opacity });
        const blackMat = new THREE.MeshBasicMaterial({ color: 0x000000, transparent, opacity }); 
        const beakMat = new THREE.MeshStandardMaterial({ 
            color: skin.colors.beak, 
            roughness: 0.5, 
            metalness: 0.1,
            emissive: isNeon ? skin.colors.beak : 0x000000,
            emissiveIntensity: isNeon ? 0.8 : 0,
            transparent, opacity 
        });
        const wingMat = new THREE.MeshStandardMaterial({ 
            color: wingColor, 
            roughness: 0.2, 
            metalness: 0.1,
            emissive: isNeon ? (skin.colors.glow || wingColor) : 0x000000,
            emissiveIntensity: isNeon ? 0.5 : 0,
            transparent, opacity 
        });

        const bodyGeo = new THREE.CylinderGeometry(bodyRadius, bodyRadius, 2, 32);
        const body = new THREE.Mesh(bodyGeo, bodyMat);
        body.rotation.x = Math.PI / 2;
        body.castShadow = !isNeon;
        group.add(body);

        const eyeGeo = new THREE.CylinderGeometry(7.5, 7.5, 2.2, 32);
        const eye = new THREE.Mesh(eyeGeo, whiteMat);
        eye.rotation.x = Math.PI / 2;
        eye.position.set(6, 5, 0.5);
        group.add(eye);

        const pupilGeo = new THREE.CircleGeometry(3.5, 32);
        const pupil = new THREE.Mesh(pupilGeo, blackMat);
        pupil.position.set(8, 5, 1.7);
        group.add(pupil);

        if (!isNeon) {
            const cheekMat = new THREE.MeshStandardMaterial({ color: 0xFF8A80, roughness: 0.5, flatShading: true, transparent, opacity });
            const cheekGeo = new THREE.CylinderGeometry(3.5, 3.5, 2.2, 32);
            const cheek = new THREE.Mesh(cheekGeo, cheekMat);
            cheek.rotation.x = Math.PI / 2;
            cheek.position.set(5, -4, 0.5);
            group.add(cheek);
        }

        const wingGeo = new THREE.CylinderGeometry(5, 5, 2.2, 32);
        const wing = new THREE.Mesh(wingGeo, wingMat);
        wing.rotation.x = Math.PI / 2;
        wing.position.set(-6, -3, 0.5);
        wing.scale.set(1.5, 1.1, 1);
        group.add(wing);

        const beakShape = new THREE.Shape();
        beakShape.moveTo(0, 4);
        beakShape.lineTo(10, 0);
        beakShape.lineTo(0, -4);
        beakShape.lineTo(0, 4);
        const beakGeo = new THREE.ExtrudeGeometry(beakShape, { depth: 2, bevelEnabled: false });
        const beak = new THREE.Mesh(beakGeo, beakMat);
        beak.position.set(13, -2, -1); 
        beak.scale.set(0.8, 0.8, 1);
        group.add(beak);

        // --- SUPER SAIYAN HAIR ---
        if (skin.id === 'saiyan') {
            const hairMat = new THREE.MeshStandardMaterial({
                color: 0xFFFF00,
                roughness: 0.1,
                emissive: 0xFFD700,
                emissiveIntensity: 0.5,
                transparent, opacity
            });
            
            const largeSpike = geometryRef.current.hairSpikeLarge || new THREE.ConeGeometry(4, 16, 8);
            const mediumSpike = geometryRef.current.hairSpikeMedium || new THREE.ConeGeometry(3, 12, 8);
            const smallSpike = geometryRef.current.hairSpikeSmall || new THREE.ConeGeometry(2, 8, 8);

            const s1 = new THREE.Mesh(largeSpike, hairMat);
            s1.position.set(0, 16, -2); s1.rotation.x = -0.3; s1.scale.set(1.2, 1.2, 0.4); group.add(s1);
            const s2 = new THREE.Mesh(largeSpike, hairMat);
            s2.position.set(-4, 15, -1); s2.rotation.z = 0.5; s2.rotation.x = -0.3; group.add(s2);
            const s3 = new THREE.Mesh(largeSpike, hairMat);
            s3.position.set(4, 15, -1); s3.rotation.z = -0.5; s3.rotation.x = -0.3; group.add(s3);
            const s4 = new THREE.Mesh(mediumSpike, hairMat);
            s4.position.set(-8, 11, -1); s4.rotation.z = 1.0; s4.rotation.x = -0.2; group.add(s4);
            const s5 = new THREE.Mesh(mediumSpike, hairMat);
            s5.position.set(8, 11, -1); s5.rotation.z = -1.0; s5.rotation.x = -0.2; group.add(s5);
            const b1 = new THREE.Mesh(smallSpike, hairMat);
            b1.position.set(0, 10, 5); b1.rotation.x = 0.8; b1.scale.set(0.8, 0.8, 0.4); group.add(b1);
            const b2 = new THREE.Mesh(smallSpike, hairMat);
            b2.position.set(-3, 11, 4); b2.rotation.x = 0.6; b2.rotation.z = 0.3; b2.scale.set(0.8, 0.8, 0.4); group.add(b2);
            const v1 = new THREE.Mesh(mediumSpike, hairMat);
            v1.position.set(0, 12, -4); v1.rotation.x = -0.8; v1.scale.set(1.5, 0.8, 0.4); group.add(v1);
        }

        // --- NINJA SAGE (NARUTO) ---
        if (skin.id === 'ninja_sage') {
          const yellowHairMat = new THREE.MeshStandardMaterial({ color: 0xFFD700, roughness: 0.3, transparent, opacity });
          const metalMat = new THREE.MeshStandardMaterial({ color: 0xCCCCCC, roughness: 0.1, metalness: 0.8, transparent, opacity });
          
          const plateGeo = geometryRef.current.headbandPlate || new THREE.BoxGeometry(10, 3, 1);
          const plate = new THREE.Mesh(plateGeo, metalMat);
          plate.position.set(2, 8, 11); // Closer to head
          plate.rotation.x = -0.1;
          group.add(plate);

          // Band cylinder removed to fix artifact

          const spikeGeo = geometryRef.current.hairSpikeMedium || new THREE.ConeGeometry(3, 12, 8);
          for(let i=-2; i<=2; i++) {
             const spike = new THREE.Mesh(spikeGeo, yellowHairMat);
             spike.position.set(i*5, 16, 0);
             spike.rotation.z = -i * 0.2;
             group.add(spike);
          }
        }

        // --- PIRATE KING (LUFFY) ---
        if (skin.id === 'pirate_king') {
           const strawMat = new THREE.MeshStandardMaterial({ color: 0xFFD54F, roughness: 0.8, flatShading: false, transparent, opacity }); 
           const redBandMat = new THREE.MeshStandardMaterial({ color: 0xD32F2F, roughness: 0.6, transparent, opacity });
           const hairMat = new THREE.MeshStandardMaterial({ color: 0x111111, roughness: 0.9, transparent, opacity });
           
           const hairGeo = geometryRef.current.hairSpikeSmall || new THREE.ConeGeometry(2, 8, 8);
           const hairPositions = [
             {x: 6, y: 7, z: 4, rz: -0.5, rx: 0.5}, {x: 6, y: 7, z: -4, rz: -0.5, rx: -0.5},
             {x: -6, y: 6, z: 6, rz: 0.5, rx: 0.5}, {x: -6, y: 6, z: -6, rz: 0.5, rx: -0.5},
             {x: 0, y: 8, z: 7, rz: 0, rx: 0.8}, {x: 0, y: 8, z: -7, rz: 0, rx: -0.8},
           ];
           hairPositions.forEach(pos => {
             const spike = new THREE.Mesh(hairGeo, hairMat);
             spike.position.set(pos.x, pos.y, pos.z);
             spike.rotation.z = pos.rz; spike.rotation.x = pos.rx; spike.scale.set(1.5, 1, 1);
             group.add(spike);
           });

           const brimGeo = geometryRef.current.strawHatBrim || new THREE.CylinderGeometry(24, 24, 1, 32);
           const brim = new THREE.Mesh(brimGeo, strawMat);
           brim.rotation.x = Math.PI/2; brim.position.set(0, 10, 0); brim.scale.set(1, 0.05, 0.9);
           group.add(brim);

           const domeGeo = new THREE.SphereGeometry(9, 32, 16, 0, Math.PI * 2, 0, Math.PI / 2);
           const dome = new THREE.Mesh(domeGeo, strawMat);
           dome.rotation.x = -Math.PI/2; dome.position.set(0, 10, 0); dome.scale.set(1, 0.7, 1);
           group.add(dome);

           const bandGeo = new THREE.CylinderGeometry(9.2, 9.2, 2, 32, 1, true);
           const band = new THREE.Mesh(bandGeo, redBandMat);
           band.rotation.x = Math.PI/2; band.position.set(0, 11, 0);
           group.add(band);
           
           const scarGeo = new THREE.BoxGeometry(3, 0.3, 0.2);
           const scarMat = new THREE.MeshBasicMaterial({ color: 0x3E2723, transparent, opacity: 0.7 });
           const scar = new THREE.Mesh(scarGeo, scarMat);
           scar.position.set(6, 2, 2.5); scar.rotation.z = -0.2;
           group.add(scar);
        }
    } 
    // --- PIXEL / VOXEL MODEL ---
    else if (skin.modelType === 'pixel') {
        const size = 3;
        const geo = geometryRef.current?.voxel || new THREE.BoxGeometry(size, size, size);
        if (!geometryRef.current?.voxel) geometryRef.current!.voxel = geo;

        const mat = new THREE.MeshStandardMaterial({ color: skin.colors.body, roughness: 0.5, transparent, opacity });
        const beakMat = new THREE.MeshStandardMaterial({ color: skin.colors.beak, roughness: 0.5, transparent, opacity });
        const eyeMat = new THREE.MeshBasicMaterial({ color: skin.colors.eye, transparent, opacity });
        const wingMat = new THREE.MeshStandardMaterial({ color: skin.colors.wing || 0xffffff, roughness: 0.5, transparent, opacity });

        for(let x=-2; x<=2; x++) {
            for(let y=-2; y<=2; y++) {
                const mesh = new THREE.Mesh(geo, mat);
                mesh.position.set(x*size, y*size, 0);
                mesh.castShadow = true;
                group.add(mesh);
            }
        }
        const beak = new THREE.Mesh(geo, beakMat); beak.position.set(3*size, 0, 0); group.add(beak);
        const beak2 = new THREE.Mesh(geo, beakMat); beak2.position.set(3*size, -1*size, 0); group.add(beak2);
        const eye = new THREE.Mesh(geo, eyeMat); eye.position.set(1*size, 1*size, size); group.add(eye);
        const wing = new THREE.Mesh(geo, wingMat); wing.position.set(-1*size, -1*size, size); group.add(wing);
    }

    // --- Shield Sphere (Hidden by default) ---
    if (geometryRef.current && materialRef.current) {
        const shieldMesh = new THREE.Mesh(geometryRef.current.shield, materialRef.current.shieldEffect);
        shieldMesh.name = 'shield';
        shieldMesh.visible = false;
        shieldMesh.scale.set(1.4, 1.4, 1.4);
        group.add(shieldMesh);
    }

    // --- Gun Attachment (Hidden by default) ---
    if (geometryRef.current && materialRef.current) {
        const gunGeo = geometryRef.current.gunBarrel || new THREE.CylinderGeometry(2, 2, 8, 16);
        const gunMesh = new THREE.Mesh(gunGeo, materialRef.current.gunMat);
        gunMesh.name = 'gun';
        gunMesh.visible = false;
        gunMesh.rotation.z = -Math.PI / 2;
        gunMesh.position.set(5, -5, 10); // Side mounted
        group.add(gunMesh);
    }

    return group;
  }, [currentSkin]);

  // Re-create bird when skin changes or scene is ready
  useEffect(() => {
    if (!sceneReady.current || !sceneRef.current) return;
    if (birdMeshRef.current) {
        sceneRef.current.remove(birdMeshRef.current);
    }
    const newBird = createBirdMesh();
    // Preserve position/rotation
    const width = window.innerWidth;
    const height = window.innerHeight;
    const birdX = width * GAME_CONSTANTS.BIRD_X_POSITION;
    newBird.position.x = toWorldX(birdX, width);
    newBird.position.y = toWorldY(birdRef.current.y, height);
    newBird.rotation.z = birdRef.current.rotation;
    sceneRef.current.add(newBird);
    birdMeshRef.current = newBird;
  }, [currentSkin, createBirdMesh]);

  // --- Main Loop ---
  const loop = useCallback(() => {
    if (!sceneRef.current || !cameraRef.current || !rendererRef.current) return;

    const width = window.innerWidth;
    const height = window.innerHeight;
    
    timeScaleRef.current += (targetTimeScaleRef.current - timeScaleRef.current) * 0.1;
    const dt = timeScaleRef.current; 

    // --- START HOVER ANIMATION ---
    if (gameState === GameState.START) {
        const time = Date.now() * 0.005;
        birdRef.current.y = (height / 2) + Math.sin(time) * 15;
        birdRef.current.rotation = 0;
    } 
    // --- PHYSICS & LOGIC ---
    else if (gameState === GameState.PLAYING) {
      // Get Ready Phase (Hover until input)
      if (!isRoundActiveRef.current) {
          const time = Date.now() * 0.005;
          birdRef.current.y = (height / 2) + Math.sin(time) * 15;
          birdRef.current.rotation = 0;
      } else {
          frameCountRef.current++;

          birdRef.current.velocity += GAME_CONSTANTS.GRAVITY * dt;
          birdRef.current.y += birdRef.current.velocity * dt;
          birdRef.current.rotation = Math.min(Math.PI / 4, Math.max(-Math.PI / 4, (birdRef.current.velocity * 0.1)));

          if (birdRef.current.effectTimer > 0) {
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
          
          birdRef.current.scale += (birdRef.current.targetScale - birdRef.current.scale) * 0.1;
          speedRef.current += GAME_CONSTANTS.SPEED_INCREMENT * dt;
          const moveSpeed = (speedRef.current) * dt;

          // --- GUN LOGIC ---
          if (activePowerupRef.current?.type === 'gun') {
              if (frameCountRef.current - lastShotFrameRef.current >= GAME_CONSTANTS.GUN_FIRE_RATE) {
                  lastShotFrameRef.current = frameCountRef.current;
                  // Fire
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

          // Move Projectiles & Check Collision
          for (let i = projectilesRef.current.length - 1; i >= 0; i--) {
              const proj = projectilesRef.current[i];
              proj.x += proj.vx * dt;
              
              let hit = false;
              // Pipe Hit
              for (let j = 0; j < pipesRef.current.length; j++) {
                  const pipe = pipesRef.current[j];
                  if (proj.x > pipe.x && proj.x < pipe.x + GAME_CONSTANTS.PIPE_WIDTH) {
                      // Hit check Top
                      if (!pipe.brokenTop && proj.y < pipe.topHeight) {
                          pipe.brokenTop = true;
                          hit = true;
                      }
                      // Hit check Bottom
                      else if (!pipe.brokenBottom && proj.y > pipe.topHeight + GAME_CONSTANTS.PIPE_GAP) {
                          pipe.brokenBottom = true;
                          hit = true;
                      }
                      if (hit) {
                          scoreRef.current += 2;
                          setScore(scoreRef.current);
                          audioService.playExplosion();
                          triggerEffect();
                          // Spawn particles at impact
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
              if (hit || proj.x > width + 100) {
                  projectilesRef.current.splice(i, 1);
              }
          }

          // Spawn Pipes
          const spawnInterval = Math.floor(GAME_CONSTANTS.PIPE_SPAWN_RATE * (GAME_CONSTANTS.BASE_PIPE_SPEED / speedRef.current));
          if (frameCountRef.current % Math.floor(Math.max(30, spawnInterval / timeScaleRef.current)) === 0) {
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

          // Spawn Powerups
          if (frameCountRef.current % Math.floor(GAME_CONSTANTS.POWERUP_SPAWN_RATE / timeScaleRef.current) === 0) {
              const rand = Math.random();
              let type: PowerupType = 'shrink'; 
              if (rand < 0.2) type = 'shrink';
              else if (rand < 0.4) type = 'grow';
              else if (rand < 0.55) type = 'shield';
              else if (rand < 0.7) type = 'slowmo';
              else if (rand < 0.85) type = 'gun';
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

          const birdX = width * GAME_CONSTANTS.BIRD_X_POSITION;
          const birdRadius = (GAME_CONSTANTS.BIRD_RADIUS * birdRef.current.scale) - 2; 

          // Update Powerups
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
                    case 'shield': duration = GAME_CONSTANTS.DURATION_SHIELD; audioService.playShieldUp(); break;
                    case 'ghost': duration = GAME_CONSTANTS.DURATION_GHOST; audioService.playGhost(); break;
                    case 'gun': duration = GAME_CONSTANTS.DURATION_GUN; audioService.playShieldUp(); break; // Reuse charge sound
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

          // Update Particles
          if (currentSkin.trail !== 'none' && (frameCountRef.current % PARTICLE_CONFIG.TRAIL_SPAWN_RATE === 0)) {
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

          // Bullet Trail
          if (frameCountRef.current % 2 === 0) {
              projectilesRef.current.forEach(proj => {
                  particlesRef.current.push({
                      x: proj.x, y: proj.y,
                      vx: -2, vy: 0,
                      life: 10, maxLife: 10, scale: 2,
                      color: 0xFFFF00, // Yellow trail
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

          // Move Pipes & Collision
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
              let pts = 1;
              scoreRef.current += pts;
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

    // --- 3D RENDERING SYNC ---
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

      birdMeshRef.current.traverse((child) => {
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
              const pulse = 1.4 + Math.sin(Date.now() * 0.01) * 0.1;
              shield.scale.set(pulse, pulse, pulse);
              shield.rotation.y += 0.05;
          }
      }

      const gun = birdMeshRef.current.getObjectByName('gun');
      if (gun) {
          gun.visible = isGunActive;
      }
    }

    // Sync Particles
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

    // Sync Projectiles (Gun)
    projectileMeshesRef.current.forEach(m => m.visible = false);
    while (projectileMeshesRef.current.length < projectilesRef.current.length) {
        const mesh = new THREE.Mesh(geometryRef.current!.particleSphere, materialRef.current!.projectile);
        // Add glow mesh
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

    // Sync Pipes
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

    // Sync Powerups
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
  }, [gameState, setGameState, setScore, triggerEffect, highScore, createBirdMesh, setActivePowerup, currentSkin]);

  // Initialize Three.js
  useEffect(() => {
    if (!containerRef.current) return;
    const width = window.innerWidth;
    const height = window.innerHeight;

    const scene = new THREE.Scene();
    scene.fog = new THREE.FogExp2(0x6366F1, 0.0002); 

    const canvas = document.createElement('canvas');
    canvas.width = 2; canvas.height = 512;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      const grad = ctx.createLinearGradient(0, 0, 0, 512);
      grad.addColorStop(0, COLORS.SKY_TOP);
      grad.addColorStop(1, COLORS.SKY_BOTTOM);
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, 2, 512);
    }
    const bgTexture = new THREE.CanvasTexture(canvas);
    scene.background = bgTexture;
    bgTextureRef.current = bgTexture;

    const fov = 40;
    const camera = new THREE.PerspectiveCamera(fov, width / height, 0.1, 5000);
    const dist = height / (2 * Math.tan((fov * Math.PI) / 360));
    camera.position.set(0, 0, dist);
    camera.lookAt(0, 0, 0);

    const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    containerRef.current.appendChild(renderer.domElement);

    const ambient = new THREE.AmbientLight(0xffffff, 0.7);
    scene.add(ambient);
    const dirLight = new THREE.DirectionalLight(0xffffff, 0.8);
    dirLight.position.set(100, 200, 200);
    dirLight.castShadow = true;
    dirLight.shadow.mapSize.width = 2048; dirLight.shadow.mapSize.height = 2048;
    const d = 1000;
    dirLight.shadow.camera.left = -d; dirLight.shadow.camera.right = d; dirLight.shadow.camera.top = d; dirLight.shadow.camera.bottom = -d;
    dirLight.shadow.bias = -0.0005;
    scene.add(dirLight);
    const fillLight = new THREE.DirectionalLight(0xffffff, 0.4);
    fillLight.position.set(-50, 50, 100);
    scene.add(fillLight);

    const pipeRadius = GAME_CONSTANTS.PIPE_WIDTH / 2;
    geometryRef.current = {
        pipe: new THREE.CylinderGeometry(pipeRadius, pipeRadius, 1, 32),
        pipeCap: new THREE.CylinderGeometry(pipeRadius + 4, pipeRadius + 4, 10, 32),
        orb: new THREE.IcosahedronGeometry(1, 0),
        shield: new THREE.SphereGeometry(15, 32, 32),
        particleBox: new THREE.BoxGeometry(1, 1, 1),
        particleSphere: new THREE.SphereGeometry(1, 8, 8),
        particleTetra: new THREE.TetrahedronGeometry(1),
        voxel: new THREE.BoxGeometry(1, 1, 1),
        hairSpikeLarge: new THREE.ConeGeometry(4, 16, 8),
        hairSpikeMedium: new THREE.ConeGeometry(3, 12, 8),
        hairSpikeSmall: new THREE.ConeGeometry(2, 8, 8),
        strawHatBrim: new THREE.CylinderGeometry(24, 24, 1, 32),
        strawHatTop: new THREE.CylinderGeometry(10, 12, 8, 32),
        headbandPlate: new THREE.BoxGeometry(10, 3, 1),
        gunBarrel: new THREE.CylinderGeometry(2, 2, 8, 16)
    };
    materialRef.current = {
        pipe: new THREE.MeshStandardMaterial({ color: COLORS.PIPE_FILL, roughness: 0.3, metalness: 0.1 }),
        pipeCap: new THREE.MeshStandardMaterial({ color: COLORS.PIPE_STROKE, roughness: 0.3 }),
        glassPipe: new THREE.MeshPhysicalMaterial({ color: COLORS.PIPE_GLASS, roughness: 0, metalness: 0.1, transmission: 0, transparent: true, opacity: 0.4, side: THREE.DoubleSide }),
        glassCap: new THREE.MeshPhysicalMaterial({ color: COLORS.PIPE_GLASS_STROKE, roughness: 0.1, metalness: 0.3, transparent: true, opacity: 0.6 }),
        pShrink: new THREE.MeshStandardMaterial({ color: COLORS.POWERUP_SHRINK, roughness: 0.2, metalness: 0.5, emissive: COLORS.POWERUP_SHRINK, emissiveIntensity: 0.6 }),
        pGrow: new THREE.MeshStandardMaterial({ color: COLORS.POWERUP_GROW, roughness: 0.2, metalness: 0.5, emissive: COLORS.POWERUP_GROW, emissiveIntensity: 0.6 }),
        pSlow: new THREE.MeshStandardMaterial({ color: COLORS.POWERUP_SLOWMO, roughness: 0.2, metalness: 0.5, emissive: COLORS.POWERUP_SLOWMO, emissiveIntensity: 0.6 }),
        pShield: new THREE.MeshStandardMaterial({ color: COLORS.POWERUP_SHIELD, roughness: 0.2, metalness: 0.5, emissive: COLORS.POWERUP_SHIELD, emissiveIntensity: 0.6 }),
        pGhost: new THREE.MeshStandardMaterial({ color: COLORS.POWERUP_GHOST, roughness: 0.2, metalness: 0.5, emissive: COLORS.POWERUP_GHOST, emissiveIntensity: 0.6 }),
        pGun: new THREE.MeshStandardMaterial({ color: COLORS.POWERUP_GUN, roughness: 0.2, metalness: 0.5, emissive: COLORS.POWERUP_GUN, emissiveIntensity: 0.6 }),
        shieldEffect: new THREE.MeshPhysicalMaterial({ color: COLORS.SHIELD_GLOW, transmission: 0.5, opacity: 0.4, transparent: true, roughness: 0, metalness: 0.1, emissive: COLORS.SHIELD_GLOW, emissiveIntensity: 0.2 }),
        projectile: new THREE.MeshStandardMaterial({ color: 0xFFFFFF, emissive: 0xFFFF00, emissiveIntensity: 2.0 }),
        particleMat: new THREE.MeshBasicMaterial({ color: 0xffffff }),
        gunMat: new THREE.MeshStandardMaterial({ color: 0x333333, roughness: 0.3, metalness: 0.8 })
    };

    // Pre-create particle pool
    for(let i=0; i<PARTICLE_CONFIG.MAX_PARTICLES; i++) {
        const mesh = new THREE.Mesh(geometryRef.current.particleSphere, new THREE.MeshBasicMaterial({color: 0xffffff, transparent: true}));
        mesh.visible = false;
        scene.add(mesh);
        particleMeshesRef.current.push(mesh);
    }
    
    sceneRef.current = scene;
    cameraRef.current = camera;
    rendererRef.current = renderer;
    sceneReady.current = true;

    // Create initial bird
    const birdGroup = createBirdMesh();
    // Correct initial position
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
  }, [createBirdMesh]);

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
    } else if (gameState === GameState.PLAYING && prevGameStateRef.current === GameState.GAME_OVER) {
      initGame();
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
