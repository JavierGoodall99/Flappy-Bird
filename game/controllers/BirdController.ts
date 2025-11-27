
import { Bird, GameState } from '../../types';
import { GAME_CONSTANTS } from '../../constants';
import { audioService } from '../../services/audioService';

export class BirdController {
    public bird: Bird;

    constructor() {
        this.bird = this.createDefaultBird();
    }

    private createDefaultBird(): Bird {
        return {
            y: 0,
            velocity: 0,
            rotation: 0,
            scale: GAME_CONSTANTS.SCALE_NORMAL,
            targetScale: GAME_CONSTANTS.SCALE_NORMAL,
            effectTimer: 0
        };
    }

    public reset(height: number) {
        this.bird = this.createDefaultBird();
        this.bird.y = height / 2;
    }

    public jump() {
        this.bird.velocity = GAME_CONSTANTS.JUMP_STRENGTH;
        audioService.playJump();
    }

    public update(dt: number, height: number, isRoundActive: boolean, gameState: GameState) {
        if (gameState === GameState.START || !isRoundActive) {
            const time = Date.now() * 0.005;
            this.bird.y = (height / 2) + Math.sin(time) * 15;
            this.bird.rotation = 0;
            return;
        }

        // Physics
        this.bird.velocity += GAME_CONSTANTS.GRAVITY * dt;
        this.bird.y += this.bird.velocity * dt;
        this.bird.rotation = Math.min(Math.PI / 4, Math.max(-Math.PI / 4, (this.bird.velocity * 0.1)));

        // Scale Animation
        const scaleLerp = 0.1 * dt; 
        this.bird.scale += (this.bird.targetScale - this.bird.scale) * scaleLerp;

        // Effect Timer
        if (this.bird.effectTimer > 0) {
            this.bird.effectTimer -= 1 * dt;
        }
    }

    public setEffect(scale: number, duration: number) {
        this.bird.targetScale = scale;
        this.bird.effectTimer = duration;
    }
    
    public clearEffect() {
        this.bird.targetScale = GAME_CONSTANTS.SCALE_NORMAL;
        this.bird.effectTimer = 0;
    }
}
