
import React, { useRef, useEffect, useCallback } from 'react';
import * as THREE from 'three';
import { GameState, Bird, Pipe } from '../types';
import { GAME_CONSTANTS, COLORS } from '../constants';
import { audioService } from '../services/audioService';

interface GameEngineProps {
  gameState: GameState;
  setGameState: (state: GameState) => void;
  setScore: (score: number) => void;
  triggerEffect: () => void;
}

export const GameEngine: React.FC<GameEngineProps> = ({ 
  gameState, 
  setGameState, 
  setScore,
  triggerEffect
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const requestRef = useRef<number>();
  const frameCountRef = useRef<number>(0);
  
  // Game State Refs (Mutable for performance)
  const birdRef = useRef<Bird>({ y: 0, velocity: 0, rotation: 0 });
  const pipesRef = useRef<Pipe[]>([]);
  const scoreRef = useRef<number>(0);
  const speedRef = useRef<number>(GAME_CONSTANTS.BASE_PIPE_SPEED);
  const prevGameStateRef = useRef<GameState>(gameState);

  // Three.js Refs
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const birdMeshRef = useRef<THREE.Group | null>(null);
  const pipeMeshesRef = useRef<Map<Pipe, THREE.Group>>(new Map());
  
  // Static Geometries & Materials (Initialized in useEffect)
  const geometryRef = useRef<{
    pipe: THREE.CylinderGeometry;
    pipeCap: THREE.CylinderGeometry;
  } | null>(null);
  
  const materialRef = useRef<{
    pipe: THREE.MeshStandardMaterial;
    pipeCap: THREE.MeshStandardMaterial;
  } | null>(null);

  // Initialize Game State
  const initGame = useCallback(() => {
    const height = window.innerHeight;
    
    birdRef.current = { 
      y: height / 2, 
      velocity: 0,
      rotation: 0
    };
    pipesRef.current = [];
    scoreRef.current = 0;
    speedRef.current = GAME_CONSTANTS.BASE_PIPE_SPEED;
    frameCountRef.current = 0;
    setScore(0);

    // Clear 3D pipes
    if (sceneRef.current) {
      pipeMeshesRef.current.forEach((group) => {
        sceneRef.current?.remove(group);
      });
      pipeMeshesRef.current.clear();
    }
  }, [setScore]);

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

    // --- PHYSICS & LOGIC (Identical to original) ---
    if (gameState === GameState.PLAYING) {
      frameCountRef.current++;

      // Physics
      birdRef.current.velocity += GAME_CONSTANTS.GRAVITY;
      birdRef.current.y += birdRef.current.velocity;

      // Rotation
      birdRef.current.rotation = Math.min(Math.PI / 4, Math.max(-Math.PI / 4, (birdRef.current.velocity * 0.1)));

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
        
        pipesRef.current.push({
          x: width,
          topHeight,
          passed: false
        });
      }

      // Move Pipes & Check Collision
      for (let i = pipesRef.current.length - 1; i >= 0; i--) {
        const pipe = pipesRef.current[i];
        pipe.x -= speedRef.current;

        // Remove off-screen
        if (pipe.x + GAME_CONSTANTS.PIPE_WIDTH < 0) {
          pipesRef.current.splice(i, 1);
          continue;
        }

        // Collision
        const birdX = width * GAME_CONSTANTS.BIRD_X_POSITION;
        const birdRadius = GAME_CONSTANTS.BIRD_RADIUS - 2; 
        
        if (
          birdX + birdRadius > pipe.x && 
          birdX - birdRadius < pipe.x + GAME_CONSTANTS.PIPE_WIDTH
        ) {
          if (
            birdRef.current.y - birdRadius < pipe.topHeight || 
            birdRef.current.y + birdRadius > pipe.topHeight + GAME_CONSTANTS.PIPE_GAP
          ) {
            audioService.playCrash();
            triggerEffect();
            setGameState(GameState.GAME_OVER);
          }
        }

        // Scoring
        if (!pipe.passed && birdX > pipe.x + GAME_CONSTANTS.PIPE_WIDTH) {
          pipe.passed = true;
          scoreRef.current += 1;
          setScore(scoreRef.current);
          audioService.playScore();
        }
      }

      // Ground/Ceiling Collision
      if (birdRef.current.y + GAME_CONSTANTS.BIRD_RADIUS >= height || birdRef.current.y - GAME_CONSTANTS.BIRD_RADIUS <= 0) {
         audioService.playCrash();
         triggerEffect();
         setGameState(GameState.GAME_OVER);
      }
    }

    // --- 3D RENDERING SYNC ---

    // 1. Update Bird
    if (birdMeshRef.current) {
      const birdX = width * GAME_CONSTANTS.BIRD_X_POSITION;
      birdMeshRef.current.position.x = toWorldX(birdX, width);
      birdMeshRef.current.position.y = toWorldY(birdRef.current.y, height);
      
      // Smooth rotation
      birdMeshRef.current.rotation.z = birdRef.current.rotation;
      // Keep flat for 2D look
      birdMeshRef.current.rotation.y = 0;
      birdMeshRef.current.rotation.x = 0;
    }

    // 2. Sync Pipes
    const currentPipes = new Set(pipesRef.current);
    
    // Remove old pipes
    for (const [pipe, mesh] of pipeMeshesRef.current.entries()) {
      if (!currentPipes.has(pipe)) {
        sceneRef.current.remove(mesh);
        pipeMeshesRef.current.delete(pipe);
      }
    }

    // Add/Update pipes
    pipesRef.current.forEach(pipe => {
      let group = pipeMeshesRef.current.get(pipe);
      
      if (!group) {
        // Create new Pipe Mesh Group
        group = new THREE.Group();
        
        if (geometryRef.current && materialRef.current) {
            const pipeRadius = GAME_CONSTANTS.PIPE_WIDTH / 2;
            
            // Top Pipe
            const topMesh = new THREE.Mesh(geometryRef.current.pipe, materialRef.current.pipe);
            topMesh.castShadow = true;
            topMesh.receiveShadow = true;
            topMesh.name = 'top';
            group.add(topMesh);

            // Top Cap
            const topCap = new THREE.Mesh(geometryRef.current.pipeCap, materialRef.current.pipeCap);
            topCap.name = 'topCap';
            topCap.castShadow = true;
            group.add(topCap);

            // Bottom Pipe
            const bottomMesh = new THREE.Mesh(geometryRef.current.pipe, materialRef.current.pipe);
            bottomMesh.castShadow = true;
            bottomMesh.receiveShadow = true;
            bottomMesh.name = 'bottom';
            group.add(bottomMesh);

            // Bottom Cap
            const bottomCap = new THREE.Mesh(geometryRef.current.pipeCap, materialRef.current.pipeCap);
            bottomCap.name = 'bottomCap';
            bottomCap.castShadow = true;
            group.add(bottomCap);
        }

        sceneRef.current?.add(group);
        pipeMeshesRef.current.set(pipe, group);
      }

      // Position the Group at the horizontal center of the pipe
      group.position.x = toWorldX(pipe.x + GAME_CONSTANTS.PIPE_WIDTH / 2, width);
      group.position.z = 0;

      // Update Heights (Scaling)
      const topMesh = group.getObjectByName('top') as THREE.Mesh;
      const topCap = group.getObjectByName('topCap') as THREE.Mesh;
      
      if (topMesh && topCap) {
        const topPipeHeight = pipe.topHeight;
        topMesh.scale.set(1, topPipeHeight, 1);
        topMesh.position.y = (height / 2) - (topPipeHeight / 2);
        topCap.position.y = (height / 2) - topPipeHeight - 5; 
      }

      const bottomMesh = group.getObjectByName('bottom') as THREE.Mesh;
      const bottomCap = group.getObjectByName('bottomCap') as THREE.Mesh;
      
      if (bottomMesh && bottomCap) {
        const bottomPipeYStart = pipe.topHeight + GAME_CONSTANTS.PIPE_GAP;
        const bottomPipeHeight = Math.max(1, height - bottomPipeYStart);
        
        bottomMesh.scale.set(1, bottomPipeHeight, 1);
        bottomMesh.position.y = (height / 2) - bottomPipeYStart - (bottomPipeHeight / 2);
        bottomCap.position.y = (height / 2) - bottomPipeYStart + 5;
      }
    });

    rendererRef.current.render(sceneRef.current, cameraRef.current);
    requestRef.current = requestAnimationFrame(loop);
  }, [gameState, setGameState, setScore, triggerEffect]);

  // Initialize Three.js
  useEffect(() => {
    if (!containerRef.current) return;

    const width = window.innerWidth;
    const height = window.innerHeight;

    // Scene
    const scene = new THREE.Scene();
    // Gradient Background
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

    // Shared Geometries for Pipes
    const pipeRadius = GAME_CONSTANTS.PIPE_WIDTH / 2;
    geometryRef.current = {
        pipe: new THREE.CylinderGeometry(pipeRadius, pipeRadius, 1, 32),
        pipeCap: new THREE.CylinderGeometry(pipeRadius + 4, pipeRadius + 4, 10, 32)
    };
    
    materialRef.current = {
        pipe: new THREE.MeshStandardMaterial({ 
            color: COLORS.PIPE_FILL, 
            roughness: 0.3,
            metalness: 0.1 
        }),
        pipeCap: new THREE.MeshStandardMaterial({
            color: COLORS.PIPE_STROKE,
            roughness: 0.3
        })
    };

    // --- 2D "Cutout" Bird Construction ---
    const birdGroup = new THREE.Group();
    
    const bodyMat = new THREE.MeshStandardMaterial({ 
        color: COLORS.BIRD_FILL, 
        roughness: 0.4, 
        metalness: 0.1,
        flatShading: false,
        emissive: COLORS.BIRD_FILL,
        emissiveIntensity: 0.2
    });
    const whiteMat = new THREE.MeshStandardMaterial({ 
        color: 0xffffff, 
        roughness: 0.2, 
        metalness: 0.1 
    });
    const blackMat = new THREE.MeshBasicMaterial({ color: 0x000000 }); 
    const beakMat = new THREE.MeshStandardMaterial({ 
        color: COLORS.BIRD_STROKE,
        roughness: 0.5, 
        metalness: 0.1 
    });
    const cheekMat = new THREE.MeshStandardMaterial({
        color: 0xFF8A80, // Soft Pink
        roughness: 0.5,
        flatShading: true
    });

    // 1. Body - Cylinder acting as a thick circle
    const bodyGeo = new THREE.CylinderGeometry(15, 15, 2, 32);
    const body = new THREE.Mesh(bodyGeo, bodyMat);
    body.rotation.x = Math.PI / 2; // Face camera
    body.castShadow = true;
    birdGroup.add(body);

    // 2. Eye - Large White Cylinder (Cuter, larger)
    const eyeGeo = new THREE.CylinderGeometry(7.5, 7.5, 2.2, 32);
    const eye = new THREE.Mesh(eyeGeo, whiteMat);
    eye.rotation.x = Math.PI / 2;
    eye.position.set(6, 5, 0.5); // Slightly lower and forward
    birdGroup.add(eye);

    // 3. Pupil - Large Black Circle
    const pupilGeo = new THREE.CircleGeometry(3.5, 32);
    const pupil = new THREE.Mesh(pupilGeo, blackMat);
    pupil.position.set(8, 5, 1.7);
    birdGroup.add(pupil);

    // 4. Cheek - Pink Blush (New!)
    const cheekGeo = new THREE.CylinderGeometry(3.5, 3.5, 2.2, 32);
    const cheek = new THREE.Mesh(cheekGeo, cheekMat);
    cheek.rotation.x = Math.PI / 2;
    cheek.position.set(5, -4, 0.5); // Below eye
    birdGroup.add(cheek);

    // 5. Wing - Flattened Cylinder
    const wingGeo = new THREE.CylinderGeometry(5, 5, 2.2, 32);
    const wing = new THREE.Mesh(wingGeo, whiteMat);
    wing.rotation.x = Math.PI / 2;
    wing.position.set(-6, -3, 0.5);
    wing.scale.set(1.5, 1.1, 1);
    birdGroup.add(wing);

    // 6. Beak - Extruded Triangle
    const beakShape = new THREE.Shape();
    beakShape.moveTo(0, 4);
    beakShape.lineTo(10, 0);
    beakShape.lineTo(0, -4);
    beakShape.lineTo(0, 4);
    const beakGeo = new THREE.ExtrudeGeometry(beakShape, { depth: 2, bevelEnabled: false });
    const beak = new THREE.Mesh(beakGeo, beakMat);
    beak.position.set(13, -2, -1); 
    beak.scale.set(0.8, 0.8, 1); // Slightly smaller beak for cuteness
    birdGroup.add(beak);

    scene.add(birdGroup);
    birdMeshRef.current = birdGroup;

    // Store refs
    sceneRef.current = scene;
    cameraRef.current = camera;
    rendererRef.current = renderer;

    // Cleanup
    return () => {
        if (containerRef.current && renderer.domElement) {
            containerRef.current.removeChild(renderer.domElement);
        }
        renderer.dispose();
        geometryRef.current?.pipe.dispose();
        geometryRef.current?.pipeCap.dispose();
        
        // Dispose Bird Geometries
        bodyGeo.dispose();
        eyeGeo.dispose();
        pupilGeo.dispose();
        wingGeo.dispose();
        beakGeo.dispose();
        cheekGeo.dispose();
        
        // Dispose Materials
        bodyMat.dispose();
        whiteMat.dispose();
        blackMat.dispose();
        beakMat.dispose();
        cheekMat.dispose();
        materialRef.current?.pipe.dispose();
        materialRef.current?.pipeCap.dispose();
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
