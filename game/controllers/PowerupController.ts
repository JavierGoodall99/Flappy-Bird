
import { Powerup, PowerupType, Pipe } from '../../types';
import { GAME_CONSTANTS } from '../../constants';

export class PowerupController {
    public powerups: Powerup[] = [];
    private lastSpawnFrame: number = 0;

    public reset() {
        this.powerups = [];
        this.lastSpawnFrame = 0;
    }

    public update(dt: number, speed: number) {
        const moveSpeed = speed * dt;
        for (let i = this.powerups.length - 1; i >= 0; i--) {
            const p = this.powerups[i];
            p.x -= moveSpeed;
            if (p.x + GAME_CONSTANTS.POWERUP_SIZE < 0 || !p.active) {
                this.powerups.splice(i, 1);
            }
        }
    }

    public spawn(frameCount: number, timeScale: number, width: number, height: number, pipes: Pipe[]) {
        const powerupRate = Math.floor(GAME_CONSTANTS.POWERUP_SPAWN_RATE / timeScale);
        
        if (frameCount - this.lastSpawnFrame >= powerupRate) {
            this.lastSpawnFrame = frameCount;
            const rand = Math.random();
            let type: PowerupType;
            if (rand < 0.15) type = 'shrink';
            else if (rand < 0.3) type = 'grow';
            else if (rand < 0.45) type = 'shield';
            else if (rand < 0.55) type = 'slowmo';
            else if (rand < 0.65) type = 'gun';
            else if (rand < 0.75) type = 'fast';
            else if (rand < 0.85) type = 'ghost';
            else type = 'random'; 

            let spawnMinY = height * 0.25;
            let spawnMaxY = height * 0.75;
            
            if (pipes.length > 0) {
                const lastPipe = pipes[pipes.length - 1];
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
}
