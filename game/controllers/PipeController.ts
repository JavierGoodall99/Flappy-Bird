
import { Pipe } from '../../types';
import { GAME_CONSTANTS } from '../../constants';

export class PipeController {
    public pipes: Pipe[] = [];
    private lastSpawnFrame: number = 0;

    public reset() {
        this.pipes = [];
        this.lastSpawnFrame = 0;
    }

    public addInitialPipe(width: number, height: number) {
        const minPipeHeight = 50;
        const maxTopPipeHeight = Math.max(minPipeHeight, height - GAME_CONSTANTS.PIPE_GAP - minPipeHeight);
        const startPipeHeight = Math.floor(minPipeHeight + (maxTopPipeHeight - minPipeHeight) / 2 + (Math.random() * 100 - 50));
        
        this.pipes.push({
            x: width - 100,
            topHeight: startPipeHeight,
            passed: false,
            type: 'normal',
            brokenTop: false,
            brokenBottom: false
        });
    }

    public update(dt: number, speed: number) {
        const moveSpeed = speed * dt;
        for (let i = this.pipes.length - 1; i >= 0; i--) {
            const pipe = this.pipes[i];
            pipe.x -= moveSpeed;
            if (pipe.x + GAME_CONSTANTS.PIPE_WIDTH < 0) {
                this.pipes.splice(i, 1);
            }
        }
    }

    public spawn(frameCount: number, speed: number, timeScale: number, width: number, height: number) {
        const spawnInterval = Math.floor(GAME_CONSTANTS.PIPE_SPAWN_RATE * (GAME_CONSTANTS.BASE_PIPE_SPEED / speed));
        const spawnRate = Math.floor(Math.max(30, spawnInterval / timeScale));

        if (frameCount - this.lastSpawnFrame >= spawnRate) {
            this.lastSpawnFrame = frameCount;
            const minPipeHeight = 50;
            const maxTopPipeHeight = Math.max(minPipeHeight, height - GAME_CONSTANTS.PIPE_GAP - minPipeHeight);
            
            let minBound = minPipeHeight;
            let maxBound = maxTopPipeHeight;

            if (this.pipes.length > 0) {
                const lastPipe = this.pipes[this.pipes.length - 1];
                const timeFactor = (GAME_CONSTANTS.BASE_PIPE_SPEED / speed);
                const maxJump = Math.max(80, (height * 0.4) * timeFactor);
                minBound = Math.max(minPipeHeight, lastPipe.topHeight - maxJump);
                maxBound = Math.min(maxTopPipeHeight, lastPipe.topHeight + maxJump);
            } else {
                minBound = height / 3;
                maxBound = height / 1.5;
            }

            const topHeight = Math.floor(minBound + Math.random() * (maxBound - minBound));
            const isGlass = Math.random() < GAME_CONSTANTS.GLASS_PIPE_CHANCE;
            
            this.pipes.push({
                x: width,
                topHeight,
                passed: false,
                type: isGlass ? 'glass' : 'normal',
                brokenTop: false,
                brokenBottom: false
            });
        }
    }
}
