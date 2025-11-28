
import { Enemy, Boss, BossProjectile } from '../../types';
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
            enemy.x -= (enemy.velocity + globalSpeedBonus) * dt;
            enemy.y = enemy.targetY + Math.sin(frameCount * 0.05 + enemy.id * 10) * weaveIntensity;
            
            if (enemy.x < -100) {
                this.enemies.splice(i, 1);
            }
        }
    }

    public spawnEnemy(score: number, frameCount: number, width: number, height: number) {
        const spawnRateReduction = Math.min(15, Math.floor(score / 50)); 
        const currentSpawnRate = Math.max(15, BATTLE_CONSTANTS.ENEMY_SPAWN_RATE - spawnRateReduction);

        if (frameCount - this.lastEnemySpawnFrame >= currentSpawnRate) {
            this.lastEnemySpawnFrame = frameCount;
            const padding = 50;
            const spawnY = padding + Math.random() * (height - padding * 2);
            const scaleBonus = Math.min(0.8, Math.floor(score / 100) * 0.1);

            this.enemies.push({
                id: Math.random(),
                x: width + 50,
                y: spawnY,
                velocity: BATTLE_CONSTANTS.ENEMY_SPEED + (Math.random() * 2), 
                targetY: spawnY,
                hp: BATTLE_CONSTANTS.ENEMY_HP,
                scale: 1.0 + scaleBonus
            });
        }
    }

    public activateBoss(score: number, width: number, height: number) {
        this.boss.active = true;
        this.boss.x = width + 200;
        this.boss.y = height / 2;
        const difficultyMultiplier = Math.floor(score / BATTLE_CONSTANTS.BOSS_INTERVAL);
        this.boss.maxHp = BATTLE_CONSTANTS.BOSS_BASE_HP * difficultyMultiplier;
        this.boss.hp = this.boss.maxHp;
        this.boss.targetY = height / 2;
        this.boss.attackTimer = BATTLE_CONSTANTS.BOSS_ATTACK_RATE;
        audioService.playDangerSurge();
        return this.boss;
    }

    public updateBoss(dt: number, score: number, width: number, height: number, birdY: number, birdX: number, now: number) {
        const boss = this.boss;
        if (!boss.active) return;

        if (boss.x > width * 0.8) {
            boss.x -= 3 * dt;
            boss.y += (birdY - boss.y) * 0.05 * dt; 
        } else {
            boss.y += (birdY - boss.y) * 0.04 * dt; 
            boss.y += Math.sin(now * 0.002) * 1 * dt;
            const targetX = width * 0.8;
            boss.x += (targetX - boss.x) * 0.05 * dt;
            boss.y = Math.max(100, Math.min(height - 100, boss.y));

            boss.attackTimer -= 1 * dt;
            if (boss.attackTimer <= 0) {
                this.bossAttack(score, birdY, birdX);
            }
        }
    }

    private bossAttack(score: number, birdY: number, birdX: number) {
        const boss = this.boss;
        boss.attackTimer = Math.max(30, BATTLE_CONSTANTS.BOSS_ATTACK_RATE - (Math.floor(score/200)*10));
        
        // Determine difficulty tier (1 = first boss, 2 = second, etc.)
        const difficultyTier = Math.floor(score / BATTLE_CONSTANTS.BOSS_INTERVAL);
        
        // Only use multi-shot rage mode if it's NOT the first boss
        const isLowHp = boss.hp < boss.maxHp * 0.5;
        const useRageMode = isLowHp && difficultyTier > 1;
        
        const spawnProjectile = (vy: number) => {
            this.bossProjectiles.push({
                id: Math.random(),
                x: boss.x - 60,
                y: boss.y,
                vx: -BATTLE_CONSTANTS.BOSS_PROJECTILE_SPEED,
                vy: vy
            });
        };

        if (useRageMode) {
             spawnProjectile(0);
             spawnProjectile(1.5);
             spawnProjectile(-1.5);
        } else {
             const dy = birdY - boss.y;
             const dx = birdX - boss.x;
             const angle = Math.atan2(dy, dx);
             const speed = BATTLE_CONSTANTS.BOSS_PROJECTILE_SPEED;
             this.bossProjectiles.push({
                id: Math.random(),
                x: boss.x - 60,
                y: boss.y,
                vx: Math.cos(angle) * speed,
                vy: Math.sin(angle) * speed
             });
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
