
import { Coin } from '../../types';
import { GAME_CONSTANTS, ECONOMY } from '../../constants';
import { Pipe } from '../../types';

export class CoinController {
    public coins: Coin[] = [];
    private lastSpawnFrame: number = 0;

    public reset() {
        this.coins = [];
        this.lastSpawnFrame = 0;
    }

    public update(dt: number, speed: number) {
        const moveSpeed = speed * dt;
        for (let i = this.coins.length - 1; i >= 0; i--) {
            const coin = this.coins[i];
            coin.x -= moveSpeed;
            coin.rotation += 0.05 * dt;
            coin.wobbleOffset += 0.1 * dt;
            
            // Remove if off screen or collected
            if (coin.x + 30 < 0 || coin.collected) {
                this.coins.splice(i, 1);
            }
        }
    }

    public spawn(frameCount: number, score: number, width: number, height: number, pipes: Pipe[]) {
        // Calculate dynamic spawn rate based on score
        const rateReduction = Math.min(100, Math.floor(score * ECONOMY.SCORE_SPAWN_FACTOR));
        const currentSpawnRate = Math.max(100, ECONOMY.BASE_SPAWN_INTERVAL - rateReduction);
        
        if (frameCount - this.lastSpawnFrame >= currentSpawnRate) {
            this.lastSpawnFrame = frameCount;
            
            const value = ECONOMY.COIN_VALUE;

            // Positioning Logic
            // Avoid pipes if possible, or place nicely in gaps
            let spawnY = height / 2;
            
            // Find the last pipe to position relatively
            if (pipes.length > 0) {
                const lastPipe = pipes[pipes.length - 1];
                // Try to spawn in the center of the gap
                spawnY = lastPipe.topHeight + (GAME_CONSTANTS.PIPE_GAP / 2);
                
                // Add some variation
                spawnY += (Math.random() - 0.5) * 50;
            } else {
                spawnY = 100 + Math.random() * (height - 200);
            }

            this.coins.push({
                x: width + 50,
                y: spawnY,
                value,
                collected: false,
                scale: 1,
                rotation: 0,
                wobbleOffset: Math.random() * Math.PI * 2
            });
        }
    }
}
