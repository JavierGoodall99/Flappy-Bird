
import * as THREE from 'three';
import { COLORS, GAME_CONSTANTS } from '../constants';

export const createGeometries = () => {
    const pipeRadius = GAME_CONSTANTS.PIPE_WIDTH / 2;
    return {
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
        strawHatBrim: new THREE.CylinderGeometry(17, 17, 1, 32),
        strawHatTop: new THREE.CylinderGeometry(10, 12, 8, 32),
        headbandPlate: new THREE.BoxGeometry(10, 3, 1),
        gunBarrel: new THREE.CylinderGeometry(2, 2, 8, 16),
        eyebrow: new THREE.BoxGeometry(7, 1.5, 1)
    };
};

export const createMaterials = () => {
    return {
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
        pFast: new THREE.MeshStandardMaterial({ color: COLORS.POWERUP_FAST, roughness: 0.2, metalness: 0.5, emissive: COLORS.POWERUP_FAST, emissiveIntensity: 0.6 }),
        shieldEffect: new THREE.MeshPhysicalMaterial({ 
            color: COLORS.SHIELD_GLOW, 
            transparent: true, 
            opacity: 0.15, 
            roughness: 0.25,
            metalness: 0.1,
            transmission: 0.95,
            thickness: 0.5,
            clearcoat: 0.8,
            clearcoatRoughness: 0.1,
            side: THREE.DoubleSide,
            emissive: COLORS.SHIELD_GLOW,
            emissiveIntensity: 0.1,
            ior: 1.5,
            depthWrite: false 
        }),
        projectile: new THREE.MeshStandardMaterial({ color: 0xFFFFFF, emissive: 0xFFFF00, emissiveIntensity: 2.0 }),
        particleMat: new THREE.MeshBasicMaterial({ color: 0xffffff }),
        gunMat: new THREE.MeshStandardMaterial({ color: 0x333333, roughness: 0.3, metalness: 0.8 }),
        eyebrow: new THREE.MeshStandardMaterial({ color: 0x000000, roughness: 0.9 })
    };
};
