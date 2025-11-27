
import { Particle } from '../../types';
import { PARTICLE_CONFIG } from '../../constants';

export class ParticleController {
    public particles: Particle[] = [];
    private lastParticleFrame: number = 0;
    private lastBulletTrailFrame: number = 0;

    public reset() {
        this.particles = [];
        this.lastParticleFrame = 0;
        this.lastBulletTrailFrame = 0;
    }

    public update(dt: number) {
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

    public spawnTrail(frameCount: number, birdX: number, birdY: number, trailType: string, trailColors: any) {
        if (trailType !== 'none' && (frameCount - this.lastParticleFrame >= PARTICLE_CONFIG.TRAIL_SPAWN_RATE)) {
            this.lastParticleFrame = frameCount;
            const pScale = trailType === 'pixel_dust' ? 4 : 2;
            const pLife = 40;
            let color = trailType === 'sparkle' ? 0xFFFF00 : 
                       trailType === 'neon_line' ? (trailColors.glow || 0x00FFFF) : 0xFFFFFF;
  
            this.particles.push({
                x: birdX - 10,
                y: birdY + (Math.random() * 10 - 5),
                vx: -2 - Math.random(),
                vy: (Math.random() - 0.5) * 2,
                life: pLife,
                maxLife: pLife,
                scale: pScale,
                color: color,
                rotation: Math.random() * Math.PI
            });
        }
    }

    public spawnBulletTrails(frameCount: number, projectiles: any[]) {
        if (frameCount - this.lastBulletTrailFrame >= 2) {
            this.lastBulletTrailFrame = frameCount;
            projectiles.forEach(proj => {
                this.particles.push({
                    x: proj.x, y: proj.y,
                    vx: -2, vy: 0,
                    life: 10, maxLife: 10, scale: 2,
                    color: proj.color || 0xFFFF00,
                    rotation: 0
                });
            });
        }
    }

    public spawnExplosion(x: number, y: number, color: number, count: number, scale: number) {
        for(let k=0; k<count; k++) {
            this.particles.push({
                x: x, y: y,
                vx: (Math.random()-0.5)*8, vy: (Math.random()-0.5)*8,
                life: 20, maxLife: 20, scale: scale, 
                color: color, rotation: 0
            });
        }
    }
}
