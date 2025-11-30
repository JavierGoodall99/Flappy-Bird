
import { Enemy, Boss, BossProjectile, EnemyType } from '../../types';
import { BATTLE_CONSTANTS } from '../../constants';
import { audioService } from '../../services/audioService';

export class BattleController {
    public enemies: Enemy[] = [];
    public boss: Boss;
    public bossProjectiles: BossProjectile[] = [];
    private lastEnemySpawnFrame: number = 0;
    
    constructor() {
        this.boss = this.createDefaultBoss();
    }

    private createDefaultBoss(): Boss {
        return { active: false, x: 0, y: 0, hp: 0, maxHp: 0, phase: 0, targetY: 0, attackTimer: 0 };
    }

    public reset(width: number, height: number) {
        this.enemies = [];
        this.bossProjectiles = [];
        this.boss = this.createDefaultBoss();
        this.boss.x = width + 200;
        this.boss.y = height / 2;
        this.lastEnemySpawnFrame = 0;
    }

    public updateEnemies(dt: number, score: number, frameCount: number, birdY: number, width: number) {
        const globalSpeedBonus = Math.min(4, (score / 50) * 0.5); 
        const weaveIntensity = 50 + Math.min(50, score / 10);

        for (let i = this.enemies.length - 1; i >= 0; i--) {
            const enemy = this.enemies[i];
            
            // Varied behavior based on type
            if (enemy.type === 'charger') {
                // Charger: Fast, jittery movement, actively tracks your position slightly.
                // Harder to hit but lower HP.
                enemy.x -= (enemy.velocity + globalSpeedBonus) * dt;
                // Softly track player Y
                const dy = birdY - enemy.y;
                enemy.y += dy * 0.05 * dt; 
            } else if (enemy.type === 'tank') {
                // Tank: Slow, steady, high HP. Requires sustained fire.
                enemy.x -= (enemy.velocity + globalSpeedBonus * 0.5) * dt; 
                // Moves slowly towards targetY, but barely deviates
                enemy.y += (enemy.targetY - enemy.y) * 0.05 * dt;
            } else {
                // Standard (Red): The classic weaver.
                enemy.x -= (enemy.velocity + globalSpeedBonus) * dt;
                enemy.y = enemy.targetY + Math.sin(frameCount * 0.05 + enemy.id * 10) * weaveIntensity;
            }
            
            if (enemy.x < -100) {
                this.enemies.splice(i, 1);
            }
        }
    }

    public spawnEnemy(score: number, frameCount: number, width: number, height: number) {
        const spawnRateReduction = Math.min(15, Math.floor(score / 50)); 
        const currentSpawnRate = Math.max(10, BATTLE_CONSTANTS.ENEMY_SPAWN_RATE - spawnRateReduction);

        if (frameCount - this.lastEnemySpawnFrame >= currentSpawnRate) {
            this.lastEnemySpawnFrame = frameCount;
            const padding = 50;
            const spawnY = padding + Math.random() * (height - padding * 2);
            
            // Enemy Variety Roll logic
            const roll = Math.random();
            let type: EnemyType = 'standard';
            
            if (score > 100) {
                if (roll > 0.85) type = 'tank';
                else if (roll > 0.65) type = 'charger';
            } else if (score > 40) {
                if (roll > 0.8) type = 'charger';
            }

            // Fallback to standard if type config is missing (safety check)
            const stats = BATTLE_CONSTANTS.ENEMY_TYPES[type] || BATTLE_CONSTANTS.ENEMY_TYPES['standard'];
            const scaleBonus = Math.min(0.8, Math.floor(score / 200) * 0.1);

            this.enemies.push({
                id: Math.random(),
                x: width + 50,
                y: spawnY,
                velocity: stats.speed + (Math.random() * 2), 
                targetY: spawnY,
                hp: stats.hp,
                scale: stats.scale + (type === 'standard' ? scaleBonus : 0),
                type: type
            });
        }
    }

    public activateBoss(score: number, width: number, height: number) {
        this.boss.active = true;
        this.boss.x = width + 200;
        this.boss.y = height / 2;
        const difficultyMultiplier = Math.max(1, Math.floor(score / BATTLE_CONSTANTS.BOSS_INTERVAL));
        this.boss.maxHp = BATTLE_CONSTANTS.BOSS_BASE_HP * difficultyMultiplier;
        this.boss.hp = this.boss.maxHp;
        this.boss.phase = 1;
        this.boss.targetY = height / 2;
        this.boss.attackTimer = BATTLE_CONSTANTS.BOSS_ATTACK_RATE;
        audioService.playDangerSurge();
        return this.boss;
    }

    public updateBoss(dt: number, score: number, width: number, height: number, birdY: number, birdX: number, now: number) {
        const boss = this.boss;
        if (!boss.active) return;

        // Rage Phase Logic: When Boss drops below 50% HP, it enters Phase 2.
        if (boss.hp < boss.maxHp * 0.5) {
            boss.phase = 2; 
        } else {
            boss.phase = 1;
        }

        if (boss.x > width * 0.8) {
            boss.x -= 3 * dt;
            boss.y += (birdY - boss.y) * 0.05 * dt; 
        } else {
            // Movement: The Boss moves more erratically and tracks the player faster when enraged.
            if (boss.phase === 2) {
                // Aggressive movement
                boss.y += (birdY - boss.y) * 0.08 * dt; 
                boss.y += Math.sin(now * 0.01) * 3 * dt; // Fast jitter
            } else {
                // Calm movement
                boss.y += (birdY - boss.y) * 0.04 * dt; 
                boss.y += Math.sin(now * 0.002) * 1 * dt;
            }
            
            const targetX = width * 0.8;
            boss.x += (targetX - boss.x) * 0.05 * dt;
            boss.y = Math.max(100, Math.min(height - 100, boss.y));

            // Attack Logic
            boss.attackTimer -= 1 * dt;
            if (boss.attackTimer <= 0) {
                this.bossAttack(score, birdY, birdX);
            }
        }
    }

    private bossAttack(score: number, birdY: number, birdX: number) {
        const boss = this.boss;
        const difficultyTier = Math.floor(score / BATTLE_CONSTANTS.BOSS_INTERVAL);
        
        // Aggressive Attacks: During Rage Phase, the Boss attacks 30% faster
        let cooldown = BATTLE_CONSTANTS.BOSS_ATTACK_RATE - (Math.floor(score/200)*5);
        if (boss.phase === 2) cooldown *= 0.7; 
        
        boss.attackTimer = Math.max(20, cooldown);
        
        const spawnProjectile = (vy: number, speedOverride?: number) => {
            const spd = speedOverride || BATTLE_CONSTANTS.BOSS_PROJECTILE_SPEED;
            this.bossProjectiles.push({
                id: Math.random(),
                x: boss.x - 60,
                y: boss.y,
                vx: -spd,
                vy: vy
            });
        };

        if (boss.phase === 2) {
             // Rage Pattern: More dangerous patterns
             const pattern = Math.random();
             if (pattern > 0.6) {
                 // Tri-Shot
                 spawnProjectile(0);
                 spawnProjectile(2.5);
                 spawnProjectile(-2.5);
             } else if (pattern > 0.3) {
                 // Fast Snipe
                 spawnProjectile(0, BATTLE_CONSTANTS.BOSS_PROJECTILE_SPEED * 1.5); 
             } else {
                 // Wide Spread
                 spawnProjectile(4);
                 spawnProjectile(-4);
             }
        } else {
             // Normal Pattern
             if (difficultyTier > 1 && Math.random() > 0.7) {
                 // Occasional double shot for higher tiers
                 spawnProjectile(1.5);
                 spawnProjectile(-1.5);
             } else {
                 // Targeted Shot
                 const dy = birdY - boss.y;
                 const dx = birdX - boss.x;
                 const angle = Math.atan2(dy, dx);
                 const speed = BATTLE_CONSTANTS.BOSS_PROJECTILE_SPEED;
                 
                 // Clamp angle to prevent shooting backwards too much
                 const clampedVx = Math.min(-5, Math.cos(angle) * speed);
                 
                 this.bossProjectiles.push({
                    id: Math.random(),
                    x: boss.x - 60,
                    y: boss.y,
                    vx: clampedVx,
                    vy: Math.sin(angle) * speed
                 });
             }
        }
        audioService.playBossShoot();
    }

    public updateBossProjectiles(dt: number, height: number) {
        for (let i = this.bossProjectiles.length - 1; i >= 0; i--) {
            const proj = this.bossProjectiles[i];
            proj.x += proj.vx * dt;
            proj.y += proj.vy * dt;

            if (proj.x < -100 || proj.y < -100 || proj.y > height + 100) {
                this.bossProjectiles.splice(i, 1);
            }
        }
    }
}
