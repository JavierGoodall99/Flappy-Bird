
import React, { useRef, useEffect, useCallback } from 'react';
import * as THREE from 'three';
import { GameState, Bird, Pipe, ReplayFrame, Powerup } from '../types';
import { GAME_CONSTANTS, COLORS } from '../constants';
import { audioService } from '../services/audioService';

interface GameEngineProps {
  gameState: GameState;
  setGameState: (state: GameState) => void;
  setScore: (score: number) => void;
  triggerEffect: () => void;
  highScore: number;
}

export const GameEngine: React.FC<GameEngineProps> = ({ 
  gameState, 
  setGameState, 
  setScore,
  triggerEffect,
  highScore
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const requestRef = useRef<number>();
  const frameCountRef = useRef<number>(0);
  
  // Game State Refs (Mutable for performance)
  const birdRef = useRef<Bird>({ 
    y: 0, 
    velocity: 0, 
    rotation: 0,
    scale: 1,
    targetScale: 1,
    effectTimer: 0
  });
  const pipesRef = useRef<Pipe[]>([]);
  const powerupsRef = useRef<Powerup[]>([]);
  const scoreRef = useRef<number>(0);
  const speedRef = useRef<number>(GAME_CONSTANTS.BASE_PIPE_SPEED);
  const prevGameStateRef = useRef<GameState>(gameState);
  
  // Ghost / Replay Refs
  const currentRecordingRef = useRef<ReplayFrame[]>([]);
  const bestRecordingRef = useRef<ReplayFrame[]>([]);

  // Three.js Refs
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const birdMeshRef = useRef<THREE.Group | null>(null);
  const ghostMeshRef = useRef<THREE.Group | null>(null);
  const pipeMeshesRef = useRef<Map<Pipe, THREE.Group>>(new Map());
  const powerupMeshesRef = useRef<Map<Powerup, THREE.Mesh>>(new Map());
  
  // Static Geometries & Materials (Initialized in useEffect)
  const geometryRef = useRef<{
    pipe: THREE.CylinderGeometry;
    pipeCap: THREE.CylinderGeometry;
    powerupShrink: THREE.IcosahedronGeometry;
    powerupGrow: THREE.OctahedronGeometry;
  } | null>(null);
  
  const materialRef = useRef<{
    pipe: THREE.MeshStandardMaterial;
    pipeCap: THREE.MeshStandardMaterial;
    glassPipe: THREE.MeshPhysicalMaterial;
    glassCap: THREE.MeshPhysicalMaterial;
    powerupShrink: THREE.MeshStandardMaterial;
    powerupGrow: THREE.MeshStandardMaterial;
  } | null>(null);

  // Initialize Game State
  const initGame = useCallback(() => {
    const height = window.innerHeight;
    
    birdRef.current = { 
      y: height / 2, 
      velocity: 0, 
      rotation: 0,
      scale: GAME_CONSTANTS.SCALE_NORMAL,
      targetScale: GAME_CONSTANTS.SCALE_NORMAL,
      effectTimer: 0
    };
    pipesRef.current = [];
    powerupsRef.current = [];
    scoreRef.current = 0;
    speedRef.current = GAME_CONSTANTS.BASE_PIPE_SPEED;
    frameCountRef.current = 0;
    
    // Reset Recording
    currentRecordingRef.current = [];
    
    setScore(0);

    // Clear 3D objects
    if (sceneRef.current) {
      pipeMeshesRef.current.forEach((group) => {
        sceneRef.current?.remove(group);
      });
      pipeMeshesRef.current.clear();
      
      powerupMeshesRef.current.forEach((mesh) => {
        sceneRef.current?.remove(mesh);
      });
      powerupMeshesRef.current.clear();
    }
  }, [setScore]);

  // Load High Score Ghost on Mount
  useEffect(() => {
    const savedGhost = localStorage.getItem('flapai-ghost-data');
    if (savedGhost) {
      try {
        bestRecordingRef.current = JSON.parse(savedGhost);
      } catch (e) {
        console.error("Failed to load ghost data", e);
      }
    }
  }, []);

  // Handle Jump
  const handleJump = useCallback(() => {
    if (gameState !== GameState.PLAYING) return;
    birdRef.current.velocity = GAME_CONSTANTS.JUMP_STRENGTH;
    audioService.playJump();
  }, [gameState]);

  // Helper: Convert Screen Coordinates to World Coordinates at Z=0
  const toWorldY = (screenY: number, screenHeight: number) => {
    return (screenHeight / 2) - screenY;
  };
  
  const toWorldX = (screenX: number, screenWidth: number) => {
    return screenX - (screenWidth / 2);
  };

  // Main Game Loop
  const loop = useCallback(() => {
    if (!sceneRef.current || !cameraRef.current || !rendererRef.current) return;

    const width = window.innerWidth;
    const height = window.innerHeight;

    // --- PHYSICS & LOGIC ---
    if (gameState === GameState.PLAYING) {
      // 0. Record Frame for Ghost
      currentRecordingRef.current.push({
        y: birdRef.current.y,
        rotation: birdRef.current.rotation,
        scale: birdRef.current.scale
      });

      frameCountRef.current++;

      // Physics
      birdRef.current.velocity += GAME_CONSTANTS.GRAVITY;
      birdRef.current.y += birdRef.current.velocity;

      // Rotation
      birdRef.current.rotation = Math.min(Math.PI / 4, Math.max(-Math.PI / 4, (birdRef.current.velocity * 0.1)));

      // Scale Logic (Lerp & Timer)
      if (birdRef.current.effectTimer > 0) {
        birdRef.current.effectTimer--;
        if (birdRef.current.effectTimer <= 0) {
          birdRef.current.targetScale = GAME_CONSTANTS.SCALE_NORMAL;
        }
      }
      // Lerp current scale to target scale
      birdRef.current.scale += (birdRef.current.targetScale - birdRef.current.scale) * 0.1;

      // Difficulty
      speedRef.current += GAME_CONSTANTS.SPEED_INCREMENT;

      // Spawn Pipes
      if (frameCountRef.current % Math.floor(GAME_CONSTANTS.PIPE_SPAWN_RATE * (3 / speedRef.current)) === 0) {
        const minPipeHeight = 50;
        const maxTopPipeHeight = Math.max(
          minPipeHeight, 
          height - GAME_CONSTANTS.PIPE_GAP - minPipeHeight
        );
        
        const topHeight = Math.floor(Math.random() * (maxTopPipeHeight - minPipeHeight + 1)) + minPipeHeight;
        const isGlass = Math.random() < GAME_CONSTANTS.GLASS_PIPE_CHANCE;

        pipesRef.current.push({
          x: width,
          topHeight,
          passed: false,
          type: isGlass ? 'glass' : 'normal',
          brokenTop: false,
          brokenBottom: false
        });
      }

      // Spawn Powerups
      if (frameCountRef.current % GAME_CONSTANTS.POWERUP_SPAWN_RATE === 0) {
         const type = Math.random() > 0.5 ? 'shrink' : 'grow';
         
         // Smart Spawn Logic: Avoid placing powerups where they cause death
         let spawnMinY = height * 0.25; // Default safe central channel
         let spawnMaxY = height * 0.75;

         // Check if a pipe is nearby to align with the gap
         if (pipesRef.current.length > 0) {
            const lastPipe = pipesRef.current[pipesRef.current.length - 1];
            // Calculate distance from the pipe's current position to the spawn point (width)
            const distFromPipe = Math.abs(width - lastPipe.x);
            
            // If within a reasonable distance (approx pipe influence zone ~350px), align to gap
            if (distFromPipe < 350) {
                const padding = 45; // Keep slightly away from the pipe edges
                spawnMinY = lastPipe.topHeight + padding;
                spawnMaxY = lastPipe.topHeight + GAME_CONSTANTS.PIPE_GAP - padding;
            }
         }
         
         // Ensure bounds are valid and on screen
         spawnMinY = Math.max(50, spawnMinY);
         spawnMaxY = Math.min(height - 50, spawnMaxY);

         if (spawnMinY > spawnMaxY) {
             const mid = (spawnMinY + spawnMaxY) / 2;
             spawnMinY = mid;
             spawnMaxY = mid;
         }

         const y = spawnMinY + Math.random() * (spawnMaxY - spawnMinY);

         powerupsRef.current.push({
           x: width,
           y: y,
           type,
           active: true
         });
      }

      const birdX = width * GAME_CONSTANTS.BIRD_X_POSITION;
      // Hitbox radius scales with bird
      const birdRadius = (GAME_CONSTANTS.BIRD_RADIUS * birdRef.current.scale) - 2; 

      // Update Powerups
      for (let i = powerupsRef.current.length - 1; i >= 0; i--) {
        const p = powerupsRef.current[i];
        p.x -= speedRef.current;
        
        // Collision with Bird
        if (p.active) {
          const dx = p.x - birdX;
          const dy = p.y - birdRef.current.y;
          const dist = Math.sqrt(dx*dx + dy*dy);
          if (dist < birdRadius + GAME_CONSTANTS.POWERUP_SIZE) {
            // Collected
            p.active = false;
            if (p.type === 'shrink') {
              birdRef.current.targetScale = GAME_CONSTANTS.SCALE_SHRINK;
              birdRef.current.effectTimer = GAME_CONSTANTS.POWERUP_DURATION;
              audioService.playShrink();
            } else {
              birdRef.current.targetScale = GAME_CONSTANTS.SCALE_GROW;
              birdRef.current.effectTimer = GAME_CONSTANTS.POWERUP_DURATION;
              audioService.playGrow();
            }
          }
        }

        if (p.x + GAME_CONSTANTS.POWERUP_SIZE < 0 || !p.active) {
          powerupsRef.current.splice(i, 1);
        }
      }

      // Move Pipes & Check Collision
      for (let i = pipesRef.current.length - 1; i >= 0; i--) {
        const pipe = pipesRef.current[i];
        pipe.x -= speedRef.current;

        if (pipe.x + GAME_CONSTANTS.PIPE_WIDTH < 0) {
          pipesRef.current.splice(i, 1);
          continue;
        }

        // Horizontal Collision Check
        if (
          birdX + birdRadius > pipe.x && 
          birdX - birdRadius < pipe.x + GAME_CONSTANTS.PIPE_WIDTH
        ) {
          // Check Verticals
          const hitTop = birdRef.current.y - birdRadius < pipe.topHeight;
          const hitBottom = birdRef.current.y + birdRadius > pipe.topHeight + GAME_CONSTANTS.PIPE_GAP;

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
               audioService.playCrash();
               triggerEffect();
               setGameState(GameState.GAME_OVER);
               
               if (scoreRef.current > highScore) {
                 bestRecordingRef.current = [...currentRecordingRef.current];
                 localStorage.setItem('flapai-ghost-data', JSON.stringify(bestRecordingRef.current));
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

      // Ground/Ceiling Collision
      if (birdRef.current.y + birdRadius >= height || birdRef.current.y - birdRadius <= 0) {
         audioService.playCrash();
         triggerEffect();
         setGameState(GameState.GAME_OVER);

         if (scoreRef.current > highScore) {
           bestRecordingRef.current = [...currentRecordingRef.current];
           localStorage.setItem('flapai-ghost-data', JSON.stringify(bestRecordingRef.current));
         }
      }
    }

    // --- 3D RENDERING SYNC ---

    // 1. Update Bird
    if (birdMeshRef.current) {
      const birdX = width * GAME_CONSTANTS.BIRD_X_POSITION;
      birdMeshRef.current.position.x = toWorldX(birdX, width);
      birdMeshRef.current.position.y = toWorldY(birdRef.current.y, height);
      
      birdMeshRef.current.rotation.z = birdRef.current.rotation;
      birdMeshRef.current.rotation.y = 0;
      birdMeshRef.current.rotation.x = 0;
      
      // Apply Scale
      const s = birdRef.current.scale;
      birdMeshRef.current.scale.set(s, s, s);
    }

    // 2. Update Ghost Bird
    if (ghostMeshRef.current) {
      if (gameState === GameState.PLAYING || gameState === GameState.GAME_OVER) {
         const ghostFrame = bestRecordingRef.current[frameCountRef.current];
         if (ghostFrame) {
            const birdX = width * GAME_CONSTANTS.BIRD_X_POSITION;
            ghostMeshRef.current.visible = true;
            ghostMeshRef.current.position.x = toWorldX(birdX, width);
            ghostMeshRef.current.position.y = toWorldY(ghostFrame.y, height);
            ghostMeshRef.current.rotation.z = ghostFrame.rotation;
            
            // Apply Ghost Scale (fallback to 1 if old data)
            const gs = ghostFrame.scale || 1;
            ghostMeshRef.current.scale.set(gs, gs, gs);
         } else {
            ghostMeshRef.current.visible = false;
         }
      } else {
        ghostMeshRef.current.visible = false;
      }
    }

    // 3. Sync Pipes
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
            topMesh.castShadow = !isGlass;
            topMesh.receiveShadow = true;
            topMesh.name = 'top';
            group.add(topMesh);

            const topCap = new THREE.Mesh(geometryRef.current.pipeCap, capMat);
            topCap.name = 'topCap';
            topCap.castShadow = !isGlass;
            group.add(topCap);

            const bottomMesh = new THREE.Mesh(geometryRef.current.pipe, bodyMat);
            bottomMesh.castShadow = !isGlass;
            bottomMesh.receiveShadow = true;
            bottomMesh.name = 'bottom';
            group.add(bottomMesh);

            const bottomCap = new THREE.Mesh(geometryRef.current.pipeCap, capMat);
            bottomCap.name = 'bottomCap';
            bottomCap.castShadow = !isGlass;
            group.add(bottomCap);
        }
        sceneRef.current?.add(group);
        pipeMeshesRef.current.set(pipe, group);
      }

      group.position.x = toWorldX(pipe.x + GAME_CONSTANTS.PIPE_WIDTH / 2, width);
      group.position.z = 0;

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

    // 4. Sync Powerups
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
          const geo = p.type === 'shrink' ? geometryRef.current.powerupShrink : geometryRef.current.powerupGrow;
          const mat = p.type === 'shrink' ? materialRef.current.powerupShrink : materialRef.current.powerupGrow;
          mesh = new THREE.Mesh(geo, mat);
          mesh.scale.set(GAME_CONSTANTS.POWERUP_SIZE/2, GAME_CONSTANTS.POWERUP_SIZE/2, GAME_CONSTANTS.POWERUP_SIZE/2); // Approximate size
          sceneRef.current?.add(mesh);
          powerupMeshesRef.current.set(p, mesh);
        }
      }
      if (mesh) {
        mesh.position.x = toWorldX(p.x, width);
        mesh.position.y = toWorldY(p.y, height);
        mesh.rotation.y += 0.05;
        mesh.rotation.z += 0.02;
      }
    });

    rendererRef.current.render(sceneRef.current, cameraRef.current);
    requestRef.current = requestAnimationFrame(loop);
  }, [gameState, setGameState, setScore, triggerEffect, highScore]);

  // Initialize Three.js
  useEffect(() => {
    if (!containerRef.current) return;

    const width = window.innerWidth;
    const height = window.innerHeight;

    // Scene
    const scene = new THREE.Scene();
    const canvas = document.createElement('canvas');
    canvas.width = 2;
    canvas.height = 512;
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

    // Camera
    const fov = 40;
    const camera = new THREE.PerspectiveCamera(fov, width / height, 0.1, 2000);
    const dist = height / (2 * Math.tan((fov * Math.PI) / 360));
    camera.position.set(0, 0, dist);
    camera.lookAt(0, 0, 0);

    // Renderer
    const renderer = new THREE.WebGLRenderer({ 
        antialias: true, 
        powerPreference: 'high-performance' 
    });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    containerRef.current.appendChild(renderer.domElement);

    // Lighting
    const ambient = new THREE.AmbientLight(0xffffff, 0.7);
    scene.add(ambient);

    const dirLight = new THREE.DirectionalLight(0xffffff, 0.8);
    dirLight.position.set(100, 200, 200);
    dirLight.castShadow = true;
    dirLight.shadow.mapSize.width = 2048;
    dirLight.shadow.mapSize.height = 2048;
    const d = 1000;
    dirLight.shadow.camera.left = -d;
    dirLight.shadow.camera.right = d;
    dirLight.shadow.camera.top = d;
    dirLight.shadow.camera.bottom = -d;
    dirLight.shadow.bias = -0.0005;
    scene.add(dirLight);

    const fillLight = new THREE.DirectionalLight(0xffffff, 0.4);
    fillLight.position.set(-50, 50, 100);
    scene.add(fillLight);

    // Geometries
    const pipeRadius = GAME_CONSTANTS.PIPE_WIDTH / 2;
    geometryRef.current = {
        pipe: new THREE.CylinderGeometry(pipeRadius, pipeRadius, 1, 32),
        pipeCap: new THREE.CylinderGeometry(pipeRadius + 4, pipeRadius + 4, 10, 32),
        powerupShrink: new THREE.IcosahedronGeometry(1, 0),
        powerupGrow: new THREE.OctahedronGeometry(1, 0)
    };
    
    // Materials
    materialRef.current = {
        pipe: new THREE.MeshStandardMaterial({ 
            color: COLORS.PIPE_FILL, 
            roughness: 0.3,
            metalness: 0.1 
        }),
        pipeCap: new THREE.MeshStandardMaterial({
            color: COLORS.PIPE_STROKE,
            roughness: 0.3
        }),
        glassPipe: new THREE.MeshPhysicalMaterial({
            color: COLORS.PIPE_GLASS,
            roughness: 0,
            metalness: 0.1,
            transmission: 0, 
            transparent: true,
            opacity: 0.4,
            side: THREE.DoubleSide
        }),
        glassCap: new THREE.MeshPhysicalMaterial({
            color: COLORS.PIPE_GLASS_STROKE,
            roughness: 0.1,
            metalness: 0.3,
            transparent: true,
            opacity: 0.6
        }),
        powerupShrink: new THREE.MeshStandardMaterial({
            color: COLORS.POWERUP_SHRINK,
            roughness: 0.2,
            metalness: 0.5,
            emissive: COLORS.POWERUP_SHRINK,
            emissiveIntensity: 0.6
        }),
        powerupGrow: new THREE.MeshStandardMaterial({
            color: COLORS.POWERUP_GROW,
            roughness: 0.2,
            metalness: 0.5,
            emissive: COLORS.POWERUP_GROW,
            emissiveIntensity: 0.6
        })
    };

    // --- Helper to Build Bird ---
    const createBirdMesh = (isGhost: boolean) => {
        const group = new THREE.Group();
        const opacity = isGhost ? 0.35 : 1.0;
        const transparent = isGhost;
        const ghostColor = 0x40E0D0;

        const bodyMat = new THREE.MeshStandardMaterial({ 
            color: isGhost ? ghostColor : COLORS.BIRD_FILL, 
            roughness: 0.4, 
            metalness: 0.1,
            flatShading: false,
            emissive: isGhost ? ghostColor : COLORS.BIRD_FILL,
            emissiveIntensity: 0.2,
            transparent, opacity
        });
        const whiteMat = new THREE.MeshStandardMaterial({ 
            color: isGhost ? ghostColor : 0xffffff, 
            roughness: 0.2, 
            metalness: 0.1,
            transparent, opacity 
        });
        const blackMat = new THREE.MeshBasicMaterial({ 
            color: isGhost ? 0x000000 : 0x000000,
            transparent, opacity 
        }); 
        const beakMat = new THREE.MeshStandardMaterial({ 
            color: isGhost ? ghostColor : COLORS.BIRD_STROKE,
            roughness: 0.5, 
            metalness: 0.1,
            transparent, opacity 
        });
        const cheekMat = new THREE.MeshStandardMaterial({
            color: isGhost ? ghostColor : 0xFF8A80,
            roughness: 0.5,
            flatShading: true,
            transparent, opacity
        });

        const bodyGeo = new THREE.CylinderGeometry(15, 15, 2, 32);
        const body = new THREE.Mesh(bodyGeo, bodyMat);
        body.rotation.x = Math.PI / 2;
        if (!isGhost) body.castShadow = true;
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

        const cheekGeo = new THREE.CylinderGeometry(3.5, 3.5, 2.2, 32);
        const cheek = new THREE.Mesh(cheekGeo, cheekMat);
        cheek.rotation.x = Math.PI / 2;
        cheek.position.set(5, -4, 0.5);
        group.add(cheek);

        const wingGeo = new THREE.CylinderGeometry(5, 5, 2.2, 32);
        const wing = new THREE.Mesh(wingGeo, whiteMat);
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

        return group;
    };

    const birdGroup = createBirdMesh(false);
    scene.add(birdGroup);
    birdMeshRef.current = birdGroup;

    const ghostGroup = createBirdMesh(true);
    ghostGroup.position.z = -10;
    ghostGroup.visible = false;
    scene.add(ghostGroup);
    ghostMeshRef.current = ghostGroup;

    sceneRef.current = scene;
    cameraRef.current = camera;
    rendererRef.current = renderer;

    return () => {
        if (containerRef.current && renderer.domElement) {
            containerRef.current.removeChild(renderer.domElement);
        }
        renderer.dispose();
        geometryRef.current?.pipe.dispose();
        geometryRef.current?.pipeCap.dispose();
        geometryRef.current?.powerupShrink.dispose();
        geometryRef.current?.powerupGrow.dispose();

        materialRef.current?.pipe.dispose();
        materialRef.current?.pipeCap.dispose();
        materialRef.current?.glassPipe.dispose();
        materialRef.current?.glassCap.dispose();
        materialRef.current?.powerupShrink.dispose();
        materialRef.current?.powerupGrow.dispose();
        
        birdGroup.traverse((obj) => {
            if (obj instanceof THREE.Mesh) {
                obj.geometry.dispose();
                if (Array.isArray(obj.material)) obj.material.forEach(m => m.dispose());
                else obj.material.dispose();
            }
        });
        ghostGroup.traverse((obj) => {
             if (obj instanceof THREE.Mesh) {
                obj.geometry.dispose();
                if (Array.isArray(obj.material)) obj.material.forEach(m => m.dispose());
                else obj.material.dispose();
            }
        });
    };
  }, []);

  // Handle Resizing
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
          powerupsRef.current = [];
          if (birdRef.current.y > h) {
              birdRef.current.y = h/2;
              birdRef.current.velocity = 0;
          }
      };
      window.addEventListener('resize', handleResize);
      return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Start Loop
  useEffect(() => {
    requestRef.current = requestAnimationFrame(loop);
    return () => {
      if (requestRef.current) cancelAnimationFrame(requestRef.current);
    };
  }, [loop]);

  // State Management
  useEffect(() => {
    if (gameState === GameState.START) {
      initGame();
    } else if (gameState === GameState.PLAYING && prevGameStateRef.current === GameState.GAME_OVER) {
      initGame();
    }
    prevGameStateRef.current = gameState;
  }, [gameState, initGame]);

  // Input Listeners
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'Space') {
        e.preventDefault();
        handleJump();
      }
    };
    const handleTouchOrClick = (e: Event) => {
      if (e.type === 'touchstart') {
          // e.preventDefault();
      }
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
