
import * as THREE from 'three';
import { Skin } from '../types';

export const createBirdMesh = (skin: Skin, geometries: any, materials: any) => {
    if (!geometries || !materials) return new THREE.Group();

    const group = new THREE.Group();
    const opacity = 1.0;
    const transparent = true;

    // Common Geometries
    const bodyRadius = 15;
    
    // --- STANDARD / NEON MODEL ---
    if (skin.modelType === 'standard' || skin.modelType === 'neon') {
        const isNeon = skin.modelType === 'neon';
        const bodyColor = skin.colors.body;
        const wingColor = skin.colors.wing;
        
        // Increased emissive intensity for better visibility
        const bodyMat = new THREE.MeshStandardMaterial({ 
            color: bodyColor, 
            roughness: isNeon ? 0.2 : 0.1, 
            metalness: isNeon ? 0.8 : 0.1,
            emissive: isNeon ? (skin.colors.glow || bodyColor) : bodyColor,
            emissiveIntensity: isNeon ? 1.0 : 0.5, // Increased from 0.25 to 0.5 for standard
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
        const eyebrowMat = materials.eyebrow || new THREE.MeshStandardMaterial({ color: 0x000000, roughness: 0.9 });

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
        pupil.name = 'pupil'; // Track for animation
        pupil.position.set(8, 5, 1.7);
        group.add(pupil);

        // Eyebrows
        const browGeo = geometries.eyebrow || new THREE.BoxGeometry(7, 1.5, 1);
        const browL = new THREE.Mesh(browGeo, eyebrowMat);
        browL.name = 'browL';
        browL.position.set(6, 10, 2);
        group.add(browL);

        const browR = new THREE.Mesh(browGeo, eyebrowMat);
        browR.name = 'browR';
        browR.position.set(6, 10, -2);
        browR.visible = false; 
        group.add(browR);

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
            
            const largeSpike = geometries.hairSpikeLarge || new THREE.ConeGeometry(4, 16, 8);
            const mediumSpike = geometries.hairSpikeMedium || new THREE.ConeGeometry(3, 12, 8);
            const smallSpike = geometries.hairSpikeSmall || new THREE.ConeGeometry(2, 8, 8);

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
          
          const plateGeo = geometries.headbandPlate || new THREE.BoxGeometry(10, 3, 1);
          const plate = new THREE.Mesh(plateGeo, metalMat);
          plate.position.set(2, 8, 11); 
          plate.rotation.x = -0.1;
          group.add(plate);

          const spikeGeo = geometries.hairSpikeMedium || new THREE.ConeGeometry(3, 12, 8);
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
           
           const hairGeo = geometries.hairSpikeSmall || new THREE.ConeGeometry(2, 8, 8);
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

           // Reduced Hat Size
           const brimGeo = geometries.strawHatBrim || new THREE.CylinderGeometry(17, 17, 1, 32);
           const brim = new THREE.Mesh(brimGeo, strawMat);
           brim.rotation.x = Math.PI/2; brim.position.set(0, 11, 0); brim.scale.set(1, 0.05, 0.9);
           group.add(brim);

           const domeGeo = new THREE.SphereGeometry(7, 32, 16, 0, Math.PI * 2, 0, Math.PI / 2);
           const dome = new THREE.Mesh(domeGeo, strawMat);
           dome.rotation.x = -Math.PI/2; dome.position.set(0, 11, 0); dome.scale.set(1, 0.7, 1);
           group.add(dome);

           const bandGeo = new THREE.CylinderGeometry(7.2, 7.2, 2, 32, 1, true);
           const band = new THREE.Mesh(bandGeo, redBandMat);
           band.rotation.x = Math.PI/2; band.position.set(0, 12, 0);
           group.add(band);
           
           const scarGeo = new THREE.BoxGeometry(3, 0.3, 0.2);
           const scarMat = new THREE.MeshBasicMaterial({ color: 0x3E2723, transparent, opacity: 0.7 });
           const scar = new THREE.Mesh(scarGeo, scarMat);
           scar.position.set(6, 2, 2.5); scar.rotation.z = -0.2;
           group.add(scar);
        }

        // --- BOSS CROWN ---
        if (skin.id === 'boss') {
            const crownMat = new THREE.MeshStandardMaterial({
                color: 0xFFD700,
                roughness: 0.3,
                metalness: 0.8,
                transparent, opacity
            });
            const spikeGeo = new THREE.ConeGeometry(2, 6, 4);
            const baseGeo = new THREE.CylinderGeometry(6, 6, 1.5, 8);
            
            const base = new THREE.Mesh(baseGeo, crownMat);
            base.position.set(0, 15, 0);
            group.add(base);

            for(let i=0; i<4; i++) {
                const spike = new THREE.Mesh(spikeGeo, crownMat);
                const angle = (i / 4) * Math.PI * 2;
                spike.position.set(Math.cos(angle)*4, 18, Math.sin(angle)*4);
                group.add(spike);
            }
        }
    } 
    // --- PIXEL / VOXEL MODEL ---
    else if (skin.modelType === 'pixel') {
        const size = 3;
        const geo = geometries.voxel || new THREE.BoxGeometry(size, size, size);

        // Boost emissive for pixel too
        const mat = new THREE.MeshStandardMaterial({ 
            color: skin.colors.body, 
            roughness: 0.5, 
            emissive: skin.colors.body,
            emissiveIntensity: 0.2,
            transparent, opacity 
        });
        const beakMat = new THREE.MeshStandardMaterial({ color: skin.colors.beak, roughness: 0.5, transparent, opacity });
        const eyeMat = new THREE.MeshBasicMaterial({ color: skin.colors.eye, transparent, opacity });
        const pupilMat = new THREE.MeshBasicMaterial({ color: 0x000000, transparent, opacity });
        const wingMat = new THREE.MeshStandardMaterial({ color: skin.colors.wing || 0xffffff, roughness: 0.5, transparent, opacity });
        const browMat = new THREE.MeshStandardMaterial({ color: 0x000000 });

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
        const pupil = new THREE.Mesh(geo, pupilMat); pupil.position.set(1.5*size, 1*size, 1.5*size); 
        pupil.scale.set(0.5, 0.5, 0.5); pupil.name = 'pupil'; group.add(pupil);

        const wing = new THREE.Mesh(geo, wingMat); wing.position.set(-1*size, -1*size, size); group.add(wing);

        // Pixel Brows
        const browL = new THREE.Mesh(geo, browMat);
        browL.name = 'browL';
        browL.position.set(1*size, 2.5*size, size);
        group.add(browL);
    }

    // --- Shield Sphere (Hidden by default) ---
    if (geometries && materials) {
        const shieldMesh = new THREE.Mesh(geometries.shield, materials.shieldEffect);
        shieldMesh.name = 'shield';
        shieldMesh.visible = false;
        shieldMesh.scale.set(1.4, 1.4, 1.4);
        group.add(shieldMesh);
    }

    // --- Gun Attachment (Hidden by default) ---
    if (geometries && materials) {
        const gunGeo = geometries.gunBarrel || new THREE.CylinderGeometry(2, 2, 8, 16);
        const gunMesh = new THREE.Mesh(gunGeo, materials.gunMat);
        gunMesh.name = 'gun';
        gunMesh.visible = false;
        gunMesh.rotation.z = -Math.PI / 2;
        gunMesh.position.set(5, -5, 10); // Side mounted
        group.add(gunMesh);
    }
    
    return group;
}
