
import * as THREE from 'three';
import { GameState, Pipe, Powerup, Enemy, Skin, Bird, Coin } from '../types';
import { GAME_CONSTANTS, COLORS, PARTICLE_CONFIG, ENEMY_SKIN, BOSS_SKIN, BATTLE_CONSTANTS } from '../constants';
import { setupThreeScene, updateCamera } from '../utils/threeSetup';
import { createGeometries, createMaterials } from '../utils/assetManager';
import { createBirdMesh } from '../utils/birdFactory';
import { GameLogic } from './GameLogic';

export class GameRenderer {
  private scene: THREE.Scene | null = null;
  private camera: THREE.PerspectiveCamera | null = null;
  private renderer: THREE.WebGLRenderer | null = null;
  private bgTexture: THREE.Texture | null = null;
  
  private birdMesh: THREE.Group | null = null;
  private pipeMeshes: Map<Pipe, THREE.Group> = new Map();
  private powerupMeshes: Map<Powerup, THREE.Mesh> = new Map();
  private coinMeshes: Map<Coin, THREE.Sprite> = new Map();
  private projectileMeshes: THREE.Group[] = []; 
  private bossProjectileMeshes: THREE.Mesh[] = [];
  private enemyMeshes: Map<Enemy, THREE.Group> = new Map();
  private bossMesh: THREE.Group | null = null;
  private particleMeshes: THREE.Mesh[] = [];

  private geometry: any = null;
  private material: any = null;
  private currentSkin: Skin | null = null;
  
  // Cache dimensions to prevent layout thrashing
  private width: number = 0;
  private height: number = 0;
  private container: HTMLDivElement | null = null;
  
  public init(container: HTMLDivElement) {
    if (this.renderer) {
        this.renderer.dispose();
        if (this.renderer.domElement.parentNode) {
            this.renderer.domElement.parentNode.removeChild(this.renderer.domElement);
        }
    }
    
    this.container = container;
    this.width = window.innerWidth;
    this.height = window.innerHeight;

    const { scene, camera, renderer, bgTexture } = setupThreeScene(container, this.width, this.height);
    this.scene = scene;
    this.camera = camera;
    this.renderer = renderer;
    this.bgTexture = bgTexture;

    this.geometry = createGeometries();
    this.material = createMaterials();

    for(let i=0; i<PARTICLE_CONFIG.MAX_PARTICLES; i++) {
        const mesh = new THREE.Mesh(this.geometry.particleSphere, new THREE.MeshBasicMaterial({color: 0xffffff, transparent: true}));
        mesh.visible = false;
        scene.add(mesh);
        this.particleMeshes.push(mesh);
    }

    if (this.currentSkin) {
        if (this.birdMesh) {
            this.scene.remove(this.birdMesh);
            this.birdMesh = null;
        }
        this.rebuildBirdMesh(this.currentSkin);
    }
    this.renderer.render(this.scene, this.camera);
  }

  public resize(width: number, height: number) {
      if (!this.camera || !this.renderer) return;
      this.width = width;
      this.height = height;
      updateCamera(this.camera, width, height);
      this.renderer.setSize(width, height);
  }

  public updateSkin(skin: Skin) {
      this.currentSkin = skin;
      if (!this.geometry || !this.material || !this.scene) return;
      if (this.birdMesh && this.birdMesh.userData.skinId === skin.id) return;
      this.rebuildBirdMesh(skin);
  }

  private rebuildBirdMesh(skin: Skin) {
      if (!this.scene || !this.geometry || !this.material) return;
      if (this.birdMesh) this.scene.remove(this.birdMesh);
      this.birdMesh = createBirdMesh(skin, this.geometry, this.material);
      this.birdMesh.userData.skinId = skin.id; 
      this.scene.add(this.birdMesh);
  }

  public reset() {
      if (!this.scene) return;
      this.pipeMeshes.forEach((group) => this.scene?.remove(group));
      this.pipeMeshes.clear();
      this.powerupMeshes.forEach((mesh) => this.scene?.remove(mesh));
      this.powerupMeshes.clear();
      this.coinMeshes.forEach((mesh) => this.scene?.remove(mesh));
      this.coinMeshes.clear();
      this.enemyMeshes.forEach((group) => this.scene?.remove(group));
      this.enemyMeshes.clear();
      if (this.bossMesh) { this.scene.remove(this.bossMesh); this.bossMesh = null; }
      this.projectileMeshes.forEach(group => { group.visible = false; });
      this.bossProjectileMeshes.forEach(mesh => { mesh.visible = false; });
      this.particleMeshes.forEach(mesh => mesh.visible = false);
  }

  public render(gameLogic: GameLogic) {
    if (!this.scene || !this.camera || !this.renderer) return;

    if (!this.birdMesh) {
        if (this.currentSkin && this.geometry && this.material) {
            this.rebuildBirdMesh(this.currentSkin);
        }
        if (!this.birdMesh) {
            this.renderer.render(this.scene, this.camera);
            return;
        }
    }
    
    const width = this.width || window.innerWidth;
    const height = this.height || window.innerHeight;
    
    const scale = Math.max(1, GAME_CONSTANTS.MIN_GAME_WIDTH / width, GAME_CONSTANTS.MIN_GAME_HEIGHT / height);
    const logicWidth = width * scale;
    const logicHeight = height * scale;
    
    const birdState = gameLogic.bird;
    const pipes = gameLogic.pipes;
    const enemies = gameLogic.enemies;
    const powerups = gameLogic.powerups;
    const coins = gameLogic.coins;

    const toWorldY = (gameY: number) => (logicHeight / 2) - gameY;
    const toWorldX = (gameX: number) => gameX - (logicWidth / 2);
    
    const birdX = logicWidth * GAME_CONSTANTS.BIRD_X_POSITION;

    // Bird Update
    this.birdMesh.position.x = toWorldX(birdX);
    this.birdMesh.position.y = toWorldY(birdState.y);
    this.birdMesh.rotation.z = birdState.rotation;
    const s = birdState.scale;
    this.birdMesh.scale.set(s, s, s);
    this.birdMesh.visible = true;

    // Bird Animations
    let targetBrowRot = 0; 
    let targetPupilScale = 1;
    if (gameLogic.gameState === GameState.GAME_OVER) {
        targetPupilScale = 0.2;
    } else {
        const closePipe = pipes.find(p => p.x > birdX - 50 && p.x < birdX + 200);
        const isFalling = birdState.velocity > 6;
        const isFast = gameLogic.speed > GAME_CONSTANTS.BASE_PIPE_SPEED * 1.3;
        const isPowered = !!gameLogic.activePowerup;

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

    const browL = this.birdMesh.getObjectByName('browL');
    if (browL) browL.rotation.z += (targetBrowRot - browL.rotation.z) * 0.2;
    const browR = this.birdMesh.getObjectByName('browR');
    if (browR) browR.rotation.z += (-targetBrowRot - browR.rotation.z) * 0.2;
    
    const isGhostActive = gameLogic.activePowerup?.type === 'ghost';
    const isShieldActive = gameLogic.activePowerup?.type === 'shield';
    const isGunActive = gameLogic.activePowerup?.type.startsWith('gun') || gameLogic.activePowerup?.type.startsWith('weapon_');
    const isIframe = birdState.invulnerabilityTimer > 0;
    const alpha = isIframe ? (Math.sin(performance.now() * 0.03) > 0 ? 0.3 : 0.8) : 1.0;

    this.birdMesh.traverse((child) => {
        if (child.name === 'pupil') {
            const currentS = child.scale.x;
            const newS = currentS + (targetPupilScale - currentS) * 0.2;
            child.scale.set(newS, newS, 1);
        }
        if (child instanceof THREE.Mesh) {
           const mat = child.material as THREE.MeshStandardMaterial;
           if (mat.name !== 'shield' && mat.name !== 'gun') { 
               mat.opacity = (isGhostActive ? 0.3 : 1.0) * alpha;
               mat.transparent = true; 
           }
        }
    });
    
    const shield = this.birdMesh.getObjectByName('shield');
    if (shield) {
        shield.visible = !!isShieldActive;
        if (isShieldActive) {
            shield.scale.set(1.4, 1.4, 1.4);
            shield.rotation.y += 0.02; 
        }
    }
    const gun = this.birdMesh.getObjectByName('gun');
    if (gun) gun.visible = !!isGunActive;

    // Render Enemies
    const currentEnemies = new Set(enemies);
    for (const [enemy, group] of this.enemyMeshes.entries()) {
        if (!currentEnemies.has(enemy)) {
            this.scene.remove(group);
            this.enemyMeshes.delete(enemy);
        }
    }
    enemies.forEach(enemy => {
        let group = this.enemyMeshes.get(enemy);
        if (!group) {
            group = createBirdMesh(ENEMY_SKIN, this.geometry, this.material);
            group.rotation.y = Math.PI;
            this.scene?.add(group);
            this.enemyMeshes.set(enemy, group);
        }
        group.position.x = toWorldX(enemy.x);
        group.position.y = toWorldY(enemy.y);
        group.rotation.z = 0.2;
        const s = 1.2 * enemy.scale;
        group.scale.set(s, s, s);
        
        // Color override based on type (Visual Polish)
        const stats = BATTLE_CONSTANTS.ENEMY_TYPES[enemy.type || 'standard'];
        if (stats) {
            group.traverse((child) => {
                if (child instanceof THREE.Mesh && child.geometry.type === 'CylinderGeometry' && child.scale.y < 3) {
                     const mat = child.material as THREE.MeshStandardMaterial;
                     if (mat && mat.color) {
                         mat.color.setHex(stats.color);
                     }
                }
            });
        }
    });

    // Render Boss
    if (gameLogic.boss.active) {
        if (!this.bossMesh) {
            this.bossMesh = createBirdMesh(BOSS_SKIN, this.geometry, this.material);
            this.bossMesh.rotation.y = Math.PI;
            this.scene?.add(this.bossMesh);
        }
        this.bossMesh.visible = true;
        this.bossMesh.position.x = toWorldX(gameLogic.boss.x);
        this.bossMesh.position.y = toWorldY(gameLogic.boss.y);
        this.bossMesh.scale.set(4, 4, 4); 
        this.bossMesh.rotation.z = Math.sin(gameLogic.frameCount * 0.05) * 0.1;

        // Boss Rage Phase Visuals: Pulsating red
        const isRage = gameLogic.boss.phase === 2;
        this.bossMesh.traverse((child) => {
             if (child instanceof THREE.Mesh) {
                 const mat = child.material as THREE.MeshStandardMaterial;
                 // Safely check for emissive property before setting it
                 if (mat && mat.emissive) {
                     if (isRage) {
                         const pulse = Math.sin(performance.now() * 0.01) * 0.5 + 0.5;
                         mat.emissive.setHex(0xFF0000);
                         mat.emissiveIntensity = 0.5 + pulse;
                     } else {
                         mat.emissive.setHex(0x000000);
                         mat.emissiveIntensity = 0;
                     }
                 }
             }
        });

        if (gameLogic.boss.hp < gameLogic.boss.maxHp * 0.3) {
             const shake = (Math.random() - 0.5) * 10;
             this.bossMesh.position.x += shake;
             this.bossMesh.position.y += shake;
        }
    } else if (this.bossMesh) {
        this.bossMesh.visible = false;
    }

    // Render Pipes
    const currentPipes = new Set(pipes);
    for (const [pipe, mesh] of this.pipeMeshes.entries()) {
      if (!currentPipes.has(pipe)) {
        this.scene.remove(mesh);
        this.pipeMeshes.delete(pipe);
      }
    }
    pipes.forEach(pipe => {
      let group = this.pipeMeshes.get(pipe);
      if (!group) {
        group = new THREE.Group();
        const isGlass = pipe.type === 'glass';
        // Note: For standard pipes, we now use the single shared material that updates color dynamically
        const bodyMat = isGlass ? this.material.glassPipe : this.material.pipe;
        const capMat = isGlass ? this.material.glassCap : this.material.pipeCap;
        const topMesh = new THREE.Mesh(this.geometry.pipe, bodyMat);
        topMesh.castShadow = !isGlass; topMesh.receiveShadow = true; topMesh.name = 'top'; group.add(topMesh);
        const topCap = new THREE.Mesh(this.geometry.pipeCap, capMat);
        topCap.name = 'topCap'; topCap.castShadow = !isGlass; group.add(topCap);
        const bottomMesh = new THREE.Mesh(this.geometry.pipe, bodyMat);
        bottomMesh.castShadow = !isGlass; bottomMesh.receiveShadow = true; bottomMesh.name = 'bottom'; group.add(bottomMesh);
        const bottomCap = new THREE.Mesh(this.geometry.pipeCap, capMat);
        bottomCap.name = 'bottomCap'; bottomCap.castShadow = !isGlass; group.add(bottomCap);
        this.scene?.add(group);
        this.pipeMeshes.set(pipe, group);
      }
      group.position.x = toWorldX(pipe.x + GAME_CONSTANTS.PIPE_WIDTH / 2);
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
        topMesh.position.y = (logicHeight / 2) - (topPipeHeight / 2);
        topCap.position.y = (logicHeight / 2) - topPipeHeight - 5; 
      }
      if (bottomMesh && bottomCap) {
        const bottomPipeYStart = pipe.topHeight + GAME_CONSTANTS.PIPE_GAP;
        const bottomPipeHeight = Math.max(1, logicHeight - bottomPipeYStart);
        bottomMesh.scale.set(1, bottomPipeHeight, 1);
        bottomMesh.position.y = (logicHeight / 2) - bottomPipeYStart - (bottomPipeHeight / 2);
        bottomCap.position.y = (logicHeight / 2) - bottomPipeYStart + 5;
      }
    });

    // Render Powerups
    const currentPowerups = new Set(powerups);
    for (const [p, mesh] of this.powerupMeshes.entries()) {
      if (!currentPowerups.has(p)) {
        this.scene.remove(mesh);
        this.powerupMeshes.delete(p);
      }
    }
    powerups.forEach(p => {
      let mesh = this.powerupMeshes.get(p);
      if (!mesh) {
          const geo = this.geometry.orb;
          let mat = this.material.pShrink;
          switch (p.type) {
              case 'grow': mat = this.material.pGrow; break;
              case 'slowmo': mat = this.material.pSlow; break;
              case 'fast': mat = this.material.pFast; break;
              case 'shield': mat = this.material.pShield; break;
              case 'ghost': mat = this.material.pGhost; break;
              case 'gun': mat = this.material.pGun; break;
              case 'random': mat = this.material.pRandom; break;
              default: mat = this.material.pRandom; break;
          }
          mesh = new THREE.Mesh(geo, mat);
          mesh.scale.set(GAME_CONSTANTS.POWERUP_SIZE/2, GAME_CONSTANTS.POWERUP_SIZE/2, GAME_CONSTANTS.POWERUP_SIZE/2); 
          this.scene?.add(mesh);
          this.powerupMeshes.set(p, mesh);
      }
      if (mesh) {
        mesh.position.x = toWorldX(p.x);
        mesh.position.y = toWorldY(p.y);
        mesh.rotation.y += 0.05; mesh.rotation.z += 0.02;

        if (p.type === 'random') {
            const time = performance.now() * 0.003; 
            const hue = (time % 1); 
            const mat = mesh.material as THREE.MeshStandardMaterial;
            mat.color.setHSL(hue, 1.0, 0.5);
            mat.emissive.setHSL(hue, 1.0, 0.5);
        }
      }
    });

    // Render Coins
    const currentCoins = new Set(coins);
    for (const [c, mesh] of this.coinMeshes.entries()) {
        if (!currentCoins.has(c)) {
            this.scene.remove(mesh);
            this.coinMeshes.delete(c);
        }
    }
    coins.forEach(c => {
        if (c.collected) return;
        let mesh = this.coinMeshes.get(c);
        if (!mesh) {
            mesh = new THREE.Sprite(this.material.coinMaterial);
            mesh.scale.set(24, 24, 1); 
            this.scene?.add(mesh);
            this.coinMeshes.set(c, mesh);
        }
        mesh.position.x = toWorldX(c.x);
        mesh.position.y = toWorldY(c.y + Math.sin(c.wobbleOffset) * 5); 
        mesh.scale.set(24 * Math.cos(c.rotation), 24, 1); 
    });


    // Particles
    this.particleMeshes.forEach(m => m.visible = false);
    while (this.particleMeshes.length < gameLogic.particles.length) {
         const mesh = new THREE.Mesh(this.geometry.particleSphere, new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true }));
         this.scene.add(mesh);
         this.particleMeshes.push(mesh);
    }
    gameLogic.particles.forEach((p, i) => {
        const mesh = this.particleMeshes[i];
        mesh.visible = true;
        mesh.position.x = toWorldX(p.x);
        mesh.position.y = toWorldY(p.y);
        mesh.position.z = -5; 
        const scale = p.scale * (p.life / p.maxLife);
        mesh.scale.set(scale, scale, scale);
        (mesh.material as THREE.MeshBasicMaterial).color.setHex(p.color);
        (mesh.material as THREE.MeshBasicMaterial).opacity = p.life / p.maxLife;
        mesh.rotation.z = p.rotation;
    });

    // Projectiles
    this.projectileMeshes.forEach(group => group.visible = false);
    while (this.projectileMeshes.length < gameLogic.projectiles.length) {
        const group = new THREE.Group();
        
        const orb = new THREE.Mesh(this.geometry.particleSphere, this.material.projectile.clone());
        const glow = new THREE.Mesh(this.geometry.particleSphere, new THREE.MeshBasicMaterial({ color: 0xFFFFFF, transparent: true, opacity: 0.5 }));
        glow.name = 'glow'; glow.scale.set(1.5, 1.5, 1.5); orb.add(glow);
        orb.name = 'standard';
        group.add(orb);

        const spear = new THREE.Mesh(this.geometry.geoSpear, this.material.projectile.clone());
        spear.rotation.z = -Math.PI / 2; 
        spear.name = 'spear';
        group.add(spear);

        const dagger = new THREE.Mesh(this.geometry.geoDagger, this.material.projectile.clone());
        dagger.rotation.z = -Math.PI / 2;
        dagger.name = 'dagger';
        group.add(dagger);
        
        this.scene.add(group);
        this.projectileMeshes.push(group);
    }
    
    gameLogic.projectiles.forEach((p, i) => {
        const group = this.projectileMeshes[i];
        group.visible = true;
        group.position.x = toWorldX(p.x);
        group.position.y = toWorldY(p.y);
        group.position.z = 2;
        
        const type = p.type || 'standard';
        group.children.forEach(c => c.visible = false);
        
        let activeMesh = group.getObjectByName('standard') as THREE.Mesh;
        let visualType = 'standard';
        if (type === 'spear') visualType = 'spear';
        if (type === 'dagger') visualType = 'dagger';

        activeMesh = group.getObjectByName(visualType) as THREE.Mesh || activeMesh;
        activeMesh.visible = true;

        const baseScale = (p.scale || 1);
        let s = baseScale * 6; 
        if (visualType === 'spear') s = baseScale * 2;
        if (visualType === 'dagger') s = baseScale * 1.5;
        
        activeMesh.scale.set(s, s, s);

        const mat = activeMesh.material as THREE.MeshStandardMaterial;
        const col = p.color || 0xFFFF00;
        mat.color.setHex(col);
        mat.emissive.setHex(col);
        
        if (visualType === 'standard') {
            const glow = activeMesh.getObjectByName('glow') as THREE.Mesh;
            if (glow) (glow.material as THREE.MeshBasicMaterial).color.setHex(col);
        }
    });

    // Boss Projectiles
    this.bossProjectileMeshes.forEach(m => m.visible = false);
    while (this.bossProjectileMeshes.length < gameLogic.bossProjectiles.length) {
        const mesh = new THREE.Mesh(this.geometry.orb, this.material.bossProjectile);
        const glow = new THREE.Mesh(this.geometry.particleSphere, new THREE.MeshBasicMaterial({ color: 0xFF0000, transparent: true, opacity: 0.4 }));
        glow.scale.set(2.0, 2.0, 2.0);
        mesh.add(glow);
        this.scene.add(mesh);
        this.bossProjectileMeshes.push(mesh);
    }
    gameLogic.bossProjectiles.forEach((p, i) => {
        const mesh = this.bossProjectileMeshes[i];
        mesh.visible = true;
        mesh.position.x = toWorldX(p.x);
        mesh.position.y = toWorldY(p.y);
        mesh.position.z = 5;
        mesh.rotation.z += 0.1;
        mesh.rotation.x += 0.1;
        mesh.scale.set(10, 10, 10);
    });
    
    this.renderer.render(this.scene, this.camera);
  }

  public dispose() {
    if (this.container && this.renderer) {
        this.container.removeChild(this.renderer.domElement);
    }
    this.renderer?.dispose();
    this.geometry?.pipe?.dispose();
  }
}
