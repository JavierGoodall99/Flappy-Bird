
import { Projectile, PowerupType } from '../../types';
import { GAME_CONSTANTS, WEAPON_LOADOUTS } from '../../constants';
import { audioService } from '../../services/audioService';

export class ProjectileController {
    public projectiles: Projectile[] = [];
    private lastShotFrame: number = -100;

    public reset() {
        this.projectiles = [];
        this.lastShotFrame = -100;
    }

    public update(dt: number, width: number) {
        for (let i = this.projectiles.length - 1; i >= 0; i--) {
            const proj = this.projectiles[i];
            
            // Movement Update
            if (proj.type === 'wave' && proj.initialY !== undefined) {
                proj.time = (proj.time || 0) + dt;
                proj.x += proj.vx * dt;
                // Sine wave motion: Amplitude 80, Frequency dependent on time
                proj.y = proj.initialY + Math.sin(proj.time * 0.15) * 80;
            } else {
                proj.x += proj.vx * dt;
                proj.y += proj.vy * dt;
            }

            if (proj.x > width + 100) {
                this.projectiles.splice(i, 1);
            }
        }
    }

    public tryShoot(frameCount: number, weaponType: PowerupType, birdX: number, birdY: number, gameMode: string, score: number) {
        // Determine Base Rates
        let baseRate = 45;
        if (weaponType === 'gun_spread') baseRate = 70;
        if (weaponType === 'gun_rapid') baseRate = 20;
        if (weaponType === 'gun_double') baseRate = 50;
        if (weaponType === 'gun_wave') baseRate = 55;
        if (weaponType === 'gun_pulse') baseRate = 120; // Slower fire rate to emphasize "wait for big blast"

        let fireRate = baseRate;
        if (gameMode === 'battle') {
            const reduction = Math.floor(score / 500) * (baseRate / 10);
            fireRate = Math.max(baseRate * 0.5, baseRate - reduction);
        } else {
            fireRate = GAME_CONSTANTS.GUN_FIRE_RATE;
        }

        if (frameCount - this.lastShotFrame >= fireRate) {
            this.lastShotFrame = frameCount;
            this.fire(weaponType, birdX, birdY, score);
        }
    }

    private fire(weaponType: string, birdX: number, birdY: number, score: number) {
        const speedBonus = Math.min(10, Math.floor(score / 50)); 
        const pSpeed = GAME_CONSTANTS.PROJECTILE_SPEED + speedBonus;
        
        const weaponDef = WEAPON_LOADOUTS.find(w => w.id === weaponType) || WEAPON_LOADOUTS[0];
        const color = parseInt(weaponDef.color.replace('#', '0x'));
        
        let sound = 'shoot';

        if (weaponType === 'gun_spread') {
             this.projectiles.push({
                 id: Math.random(), x: birdX + 20, y: birdY - 5,
                 vx: pSpeed, vy: 0, color, damage: 1, pierce: 1
             });
             this.projectiles.push({
                 id: Math.random(), x: birdX + 20, y: birdY - 5,
                 vx: pSpeed * 0.95, vy: 2, color, damage: 1, pierce: 1
             });
             this.projectiles.push({
                 id: Math.random(), x: birdX + 20, y: birdY - 5,
                 vx: pSpeed * 0.95, vy: -2, color, damage: 1, pierce: 1
             });
        } else if (weaponType === 'gun_rapid') {
             this.projectiles.push({
                 id: Math.random(), x: birdX + 20, y: birdY - 5 + (Math.random()*10 - 5),
                 vx: pSpeed * 1.1, vy: 0, color, damage: 1, pierce: 1
             });
        } else if (weaponType === 'gun_double') {
             this.projectiles.push({
                 id: Math.random(), x: birdX + 20, y: birdY - 15,
                 vx: pSpeed, vy: 0, color, damage: 1.5, pierce: 1
             });
             this.projectiles.push({
                 id: Math.random(), x: birdX + 20, y: birdY + 15,
                 vx: pSpeed, vy: 0, color, damage: 1.5, pierce: 1
             });
        } else if (weaponType === 'gun_wave') {
             this.projectiles.push({
                 id: Math.random(), x: birdX + 20, y: birdY,
                 vx: pSpeed, vy: 0, color, 
                 type: 'wave', initialY: birdY, time: 0, damage: 2, pierce: 3
             });
        } else if (weaponType === 'gun_pulse') {
             this.projectiles.push({
                 id: Math.random(), x: birdX + 20, y: birdY,
                 vx: pSpeed * 0.5, vy: 0, color, 
                 scale: 6.0, damage: 10, pierce: 99 // Infinite pierce essentially
             });
             sound = 'boss';
        } else {
             this.projectiles.push({
                id: Math.random(), x: birdX + 20, y: birdY - 5,
                vx: pSpeed, vy: 0, color, damage: 1, pierce: 1
            });
        }
        
        if (sound === 'boss') {
            audioService.playBossShoot();
        } else {
            audioService.playShoot();
        }
    }
}
