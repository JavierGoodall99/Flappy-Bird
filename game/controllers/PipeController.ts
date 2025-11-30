


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
            brokenBottom: false,
            moving: false,
            initialTopHeight: startPipeHeight,
            moveSpeed: 0,
            moveRange: 0,
            moveOffset: 0
        });
    }

    public update(dt: number, speed: number) {
        const moveSpeed = speed * dt;
        const time = performance.now() * 0.001;
        
        for (let i = this.pipes.length - 1; i >= 0; i--) {
            const pipe = this.pipes[i];
            pipe.x -= moveSpeed;
            
            // Vertical Movement Logic
            if (pipe.moving) {
                // Sine wave oscillation
                const offset = Math.sin(time * pipe.moveSpeed + pipe.moveOffset) * pipe.moveRange;
                pipe.topHeight = pipe.initialTopHeight + offset;
            }

            if (pipe.x + GAME_CONSTANTS.PIPE_WIDTH < 0) {
                this.pipes.splice(i, 1);
            }
        }
    }

    public spawn(frameCount: number, speed: number, timeScale: number, width: number, height: number, score: number) {
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
                
                // ADJUSTMENT: Increased maxJump from 230 to 340 to reduce "inline" boring generation.
                const maxJump = Math.min(340, (height * 0.32)) * timeFactor;
                
                minBound = Math.max(minPipeHeight, lastPipe.topHeight - maxJump);
                maxBound = Math.min(maxTopPipeHeight, lastPipe.topHeight + maxJump);
            } else {
                minBound = height / 3;
                maxBound = height / 1.5;
            }

            const topHeight = Math.floor(minBound + Math.random() * (maxBound - minBound));
            const isGlass = Math.random() < GAME_CONSTANTS.GLASS_PIPE_CHANCE;
            
            // Dynamic Moving Pipes Logic
            let moving = false;
            let moveSpeed = 0;
            let moveRange = 0;
            
            // Start introducing moving pipes after score 15
            if (score > 15) {
                const chance = Math.min(0.6, (score - 10) * 0.015); // Caps at 60% chance
                if (Math.random() < chance) {
                    moving = true;
                    // Difficulty scaling
                    const difficultyMult = Math.min(2.0, 1 + (score / 100));
                    moveSpeed = (1.5 + Math.random()) * difficultyMult;
                    moveRange = (30 + Math.random() * 40) * difficultyMult; 
                    
                    // Clamp range to prevent hitting ceiling/floor too hard
                    const safetyMargin = 50;
                    const maxUp = topHeight - safetyMargin; 
                    const maxDown = (height - GAME_CONSTANTS.PIPE_GAP - topHeight) - safetyMargin;
                    moveRange = Math.min(moveRange, maxUp, maxDown);
                    
                    if (moveRange < 10) moving = false; // Too risky/small
                }
            }

            this.pipes.push({
                x: width,
                topHeight,
                passed: false,
                type: isGlass ? 'glass' : 'normal',
                brokenTop: false,
                brokenBottom: false,
                moving,
                initialTopHeight: topHeight,
                moveSpeed,
                moveRange,
                moveOffset: Math.random() * Math.PI * 2
            });
        }
    }
}