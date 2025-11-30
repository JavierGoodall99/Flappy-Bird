
import { Skin, World } from './types';

export const GAME_CONSTANTS = {
  GRAVITY: 0.55,
  JUMP_STRENGTH: -8.2, 
  BASE_PIPE_SPEED: 4.2,
  SPEED_INCREMENT: 0.0015,
  PIPE_GAP: 165, 
  PIPE_WIDTH: 65,
  PIPE_SPAWN_RATE: 100, 
  BIRD_RADIUS: 16, 
  BIRD_X_POSITION: 0.2, 
  GLASS_PIPE_CHANCE: 0.25,
  GLASS_BREAK_SCORE: 5,
  GLASS_BREAK_PENALTY: 8, 
  
  // Powerups
  POWERUP_SPAWN_RATE: 600, 
  POWERUP_SIZE: 20,
  
  // Durations
  DURATION_SIZE: 300, 
  DURATION_SLOWMO: 180, 
  DURATION_FAST: 300, 
  DURATION_SHIELD: 600, 
  DURATION_GHOST: 240,  
  DURATION_GUN: 300, 

  SCALE_NORMAL: 1,
  SCALE_SHRINK: 0.6,
  SCALE_GROW: 1.5,
  
  TIME_SCALE_NORMAL: 1.0,
  TIME_SCALE_SLOW: 0.6,
  TIME_SCALE_FAST: 1.4,
  
  // Gun Stats
  GUN_FIRE_RATE: 45, 
  PROJECTILE_SPEED: 9,
  
  // Mobile Responsiveness / Camera
  MIN_GAME_WIDTH: 850, 
  MIN_GAME_HEIGHT: 1100, 
};

export const ECONOMY = {
  REVIVE_COST: 50, // Rebalanced for 1-coin economy
  COIN_VALUE: 1,
  BASE_SPAWN_INTERVAL: 300, 
  SCORE_SPAWN_FACTOR: 0.4, 
  MILESTONE_REWARDS: {
    25: 5,
    50: 10,
    75: 15,
    100: 25,
    150: 40,
    200: 50,
    300: 75,
    500: 100
  },
  STREAK_BONUS_MULTIPLIER: 1.5 
};

export const STREAK_REWARDS = {
    3: { coins: 100, label: 'Bronze Bonus' },
    7: { coins: 500, label: 'Silver Stash' },
    14: { coins: 1500, label: 'Gold Hoard' },
    30: { coins: 5000, label: 'Diamond Chest' },
    100: { coins: 25000, label: 'Century Jackpot' }
};

export const COLORS = {
  BIRD_FILL: '#FFE600', 
  BIRD_STROKE: '#FF9100', 
  PIPE_FILL: '#22C55E', 
  PIPE_STROKE: '#15803D', 
  PIPE_GLASS: '#A5F3FC', 
  PIPE_GLASS_STROKE: '#CFFAFE', 
  SKY_TOP: '#6366F1', 
  SKY_BOTTOM: '#38BDF8', 
  
  // Powerup Colors
  POWERUP_SHRINK: '#3B82F6', 
  POWERUP_GROW: '#EF4444', 
  POWERUP_SLOWMO: '#8B5CF6', 
  POWERUP_SHIELD: '#FFFFFF', 
  POWERUP_GHOST: '#EC4899', 
  POWERUP_GUN: '#14B8A6', 
  POWERUP_FAST: '#84CC16', 
  POWERUP_RANDOM: '#F59E0B', 
  
  SHIELD_GLOW: '#FFFFFF', 
  PROJECTILE: '#FFFF00', 
  BOSS_PROJECTILE: '#FF0000',

  COIN: '#FFD700', // Single Gold Color
};

// --- WORLDS ---
export const WORLDS: World[] = [
  {
    id: 'city_day',
    name: 'Neo City',
    description: 'The classic bright and sunny cityscape.',
    skyColor: '#4ec0ca',
    cityImage: 'https://i.postimg.cc/VLvCNxmH/Gemini_Generated_Image_enihz0enihz0enih.png',
    groundImage: 'https://i.postimg.cc/qBjK4JV6/Gemini_Generated_Image_ef4yjaef4yjaef4y.png',
  },
  {
    id: 'city_night',
    name: 'Midnight',
    description: 'A quiet night under the city lights.',
    skyColor: '#171720',
    cityImage: 'https://i.postimg.cc/VLvCNxmH/Gemini_Generated_Image_enihz0enihz0enih.png',
    groundImage: 'https://i.postimg.cc/qBjK4JV6/Gemini_Generated_Image_ef4yjaef4yjaef4y.png',
    filter: 'brightness(0.6) contrast(1.1) hue-rotate(220deg)'
  },
  {
    id: 'sunset',
    name: 'Golden Hour',
    description: 'Bask in the warm glow of the setting sun.',
    skyColor: '#f97316',
    cityImage: 'https://i.postimg.cc/VLvCNxmH/Gemini_Generated_Image_enihz0enihz0enih.png',
    groundImage: 'https://i.postimg.cc/qBjK4JV6/Gemini_Generated_Image_ef4yjaef4yjaef4y.png',
    filter: 'sepia(0.4) saturate(1.4) hue-rotate(-20deg)'
  },
  {
    id: 'matrix',
    name: 'The Grid',
    description: 'Digital frontier.',
    skyColor: '#002200',
    cityImage: 'https://i.postimg.cc/VLvCNxmH/Gemini_Generated_Image_enihz0enihz0enih.png',
    groundImage: 'https://i.postimg.cc/qBjK4JV6/Gemini_Generated_Image_ef4yjaef4yjaef4y.png',
    filter: 'grayscale(1) sepia(1) hue-rotate(70deg) saturate(2) brightness(0.8)'
  }
];

export const POWERUP_INFO = [
  { type: 'random', name: 'Mystery Box', desc: 'Gives you a random power-up. Good luck!', color: COLORS.POWERUP_RANDOM },
  { type: 'shrink', name: 'Tiny Bird', desc: 'Shrinks you to 60% size. Easier to fit through gaps.', color: COLORS.POWERUP_SHRINK },
  { type: 'grow', name: 'Giant Bird', desc: 'Makes you 150% bigger. Harder to dodge! (Risk/Reward)', color: COLORS.POWERUP_GROW },
  { type: 'shield', name: 'Shield', desc: 'Survive one fatal collision. Breaks upon impact.', color: COLORS.POWERUP_SHIELD },
  { type: 'ghost', name: 'Ghost Mode', desc: 'Phase through pipes for 4 seconds. Still die to ground.', color: COLORS.POWERUP_GHOST },
  { type: 'slowmo', name: 'Time Warp', desc: 'Slows down time by 40% for 3 seconds.', color: COLORS.POWERUP_SLOWMO },
  { type: 'fast', name: 'Turbo Boost', desc: 'Speeds up time by 40% for 5 seconds. Hold on tight!', color: COLORS.POWERUP_FAST },
  { type: 'gun', name: 'Blaster', desc: 'Auto-fire plasma bolts that destroy pipes for points.', color: COLORS.POWERUP_GUN },
];

export const WEAPON_LOADOUTS = [
  { id: 'gun', name: 'Plasma Blaster', description: 'Standard rapid-fire energy weapon. Reliable & balanced.', color: '#14B8A6', stats: 'Fire Rate: ⭐⭐⭐\nDamage: ⭐⭐', price: 0 },
  { id: 'gun_spread', name: 'Tri-Shot', description: 'Fires 3 projectiles in a wide spread. Crowd control.', color: '#F97316', stats: 'Fire Rate: ⭐⭐\nSpread: ⭐⭐⭐⭐⭐', price: 500 },
  { id: 'gun_rapid', name: 'Vulcan Cannon', description: 'Extreme fire rate. Melts bosses but eats accuracy.', color: '#8B5CF6', stats: 'Fire Rate: ⭐⭐⭐⭐⭐\nAccuracy: ⭐', price: 1000 },
  { id: 'gun_double', name: 'Twin Strikers', description: 'Fires two parallel shots. Double the trouble.', color: '#4ADE80', stats: 'Fire Rate: ⭐⭐⭐\nDamage: ⭐⭐⭐', price: 750 },
  { id: 'gun_wave', name: 'Sonic Wave', description: 'Oscillating energy waves that pierce through multiple enemies.', color: '#06B6D4', stats: 'Fire Rate: ⭐⭐\nPierce: ⭐⭐⭐⭐', price: 1500 },
  { id: 'gun_pulse', name: 'Omega Pulse', description: 'Massive piercing energy ball. Obliterates everything in its path.', color: '#E11D48', stats: 'Fire Rate: ⭐\nDamage: ⭐⭐⭐⭐⭐', price: 5000 },
  // MELEE WEAPONS
  { id: 'weapon_spear', name: 'Gungnir Spear', description: 'High-velocity piercing throw. Penetrates multiple enemies.', color: '#FFD700', stats: 'Fire Rate: ⭐⭐\nPierce: ⭐⭐⭐⭐⭐', price: 2000 },
  { id: 'weapon_dagger', name: 'Shadow Daggers', description: 'Throw 3 knives in a burst. Fast but weak.', color: '#A8A29E', stats: 'Fire Rate: ⭐⭐⭐⭐⭐\nSpeed: ⭐⭐⭐⭐⭐', price: 800 },
];

// --- DANGER MODE CONSTANTS ---

export const DANGER_CONSTANTS = {
  SPEED_MULTIPLIER: 1.5,
  SPAWN_RATE_MODIFIER: 0.7, 
  DANGER_FILL_RATE: 0.05, 
  SURGE_DURATION: 300, 
  LASER_WARN_TIME: 120, 
  LASER_ACTIVE_TIME: 60, 
  DEBRIS_SPEED: 6,
  
  COLORS: {
    SKY_TOP: 0x450a0a, 
    SKY_BOTTOM: 0x000000,
    SURGE_VIGNETTE: 0xff0000
  }
};

// --- BATTLE MODE CONSTANTS ---

export const BATTLE_CONSTANTS = {
    ENEMY_SPAWN_RATE: 20, 
    ENEMY_SPEED: 12.5, 
    ENEMY_SCORE: 10,
    ENEMY_HP: 1,
    ENEMY_SIZE: 20,
    BOSS_INTERVAL: 250, 
    BOSS_BASE_HP: 30, 
    BOSS_SIZE: 50, 
    BOSS_ATTACK_RATE: 50, 
    BOSS_PROJECTILE_SPEED: 11.0, 
    PLAYER_HP: 3, 
    DAMAGE_COOLDOWN: 60,
    ENEMY_TYPES: {
        standard: { hp: 1, speed: 12.5, score: 10, color: 0xD32F2F, scale: 1.0 },
        charger: { hp: 1, speed: 19.0, score: 25, color: 0xFF9100, scale: 0.85 },
        tank: { hp: 6, speed: 7.0, score: 50, color: 0x2E004B, scale: 1.5 },
    }
};

export const ENEMY_SKIN: Skin = {
    id: 'enemy',
    name: 'Invader',
    rarity: 'Common',
    modelType: 'standard',
    trail: 'smoke',
    unlockCondition: { type: 'default', value: 0, description: '' },
    colors: { body: 0xD32F2F, wing: 0x212121, beak: 0x000000, eye: 0xFF0000 }
};

export const BOSS_SKIN: Skin = {
    id: 'boss',
    name: 'Dreadnought',
    rarity: 'Legendary',
    modelType: 'standard',
    trail: 'ghost_trail',
    unlockCondition: { type: 'default', value: 0, description: '' },
    colors: { body: 0x222222, wing: 0x660000, beak: 0xFF0000, eye: 0xFF0000 }
};

// --- SKINS CATALOG ---

export const SKINS: Record<string, Skin> = {
  default: {
    id: 'default',
    name: 'FlapAI Classic',
    rarity: 'Common',
    modelType: 'standard',
    trail: 'none',
    unlockCondition: { type: 'default', value: 0, description: 'Default Skin' },
    colors: { body: 0xFFE600, wing: 0xFFFFFF, beak: 0xFF9100, eye: 0xFFFFFF },
    price: 0
  },
  bubblegum: {
    id: 'bubblegum',
    name: 'Bubblegum Pop',
    rarity: 'Common',
    modelType: 'standard',
    trail: 'sparkle',
    unlockCondition: { type: 'score', value: 20, description: 'Score 20 or Buy' },
    colors: { body: 0xF8BBD0, wing: 0xF48FB1, beak: 0xFFFFFF, eye: 0x000000 },
    price: 100
  },
  bumblebee: {
    id: 'bumblebee',
    name: 'Buzzy Bee',
    rarity: 'Common',
    modelType: 'pixel',
    trail: 'pixel_dust',
    unlockCondition: { type: 'games_played', value: 100, description: 'Play 100 Games or Buy' },
    colors: { body: 0xFFD700, wing: 0x000000, beak: 0x000000, eye: 0xFFFFFF },
    price: 200
  },
  neon_blue: {
    id: 'neon_blue',
    name: 'Cyber Pulse',
    rarity: 'Rare',
    modelType: 'neon',
    trail: 'neon_line',
    unlockCondition: { type: 'score', value: 50, description: 'Score 50 or Buy' },
    colors: { body: 0x000000, wing: 0x00FFFF, beak: 0x00FFFF, eye: 0xFFFFFF, glow: 0x00FFFF },
    price: 500
  },
  pixel_bird: {
    id: 'pixel_bird',
    name: '8-Bit Hero',
    rarity: 'Rare',
    modelType: 'pixel',
    trail: 'pixel_dust',
    unlockCondition: { type: 'games_played', value: 50, description: 'Play 50 Games or Buy' },
    colors: { body: 0xFCC200, wing: 0xFFFFFF, beak: 0xE65100, eye: 0x000000 },
    price: 400
  },
  neon_pink: {
    id: 'neon_pink',
    name: 'Neon Drift',
    rarity: 'Rare',
    modelType: 'neon',
    trail: 'sparkle',
    unlockCondition: { type: 'score', value: 100, description: 'Score 100 in Classic' },
    colors: { body: 0x220022, wing: 0xFF00FF, beak: 0xFF00FF, eye: 0xFFFFFF, glow: 0xFF00FF },
    price: 600
  },
  zombie: {
    id: 'zombie',
    name: 'Zom-Bird',
    rarity: 'Rare',
    modelType: 'pixel',
    trail: 'pixel_dust',
    unlockCondition: { type: 'games_played', value: 1, description: 'Play your first game' },
    colors: { body: 0x558B2F, wing: 0x33691E, beak: 0x1B5E20, eye: 0xFF0000 },
    price: 300
  },
  ice_breaker: {
    id: 'ice_breaker',
    name: 'Frost Byte',
    rarity: 'Rare',
    modelType: 'neon',
    trail: 'ghost_trail',
    unlockCondition: { type: 'total_score', value: 2000, description: '2,000 Total Score' },
    colors: { body: 0xE0FFFF, wing: 0x00FFFF, beak: 0xFFFFFF, eye: 0x0000FF, glow: 0x00FFFF },
    price: 700
  },
  ninja: {
    id: 'ninja',
    name: 'Shadow Ninja',
    rarity: 'Epic',
    modelType: 'standard',
    trail: 'smoke',
    unlockCondition: { type: 'battle_score', value: 50, description: 'Score 50 in Battle' },
    colors: { body: 0x212121, wing: 0x424242, beak: 0xD32F2F, eye: 0xFFFFFF },
    price: 1500
  },
  pixel_scout: {
    id: 'pixel_scout',
    name: 'Voxel Scout',
    rarity: 'Epic',
    modelType: 'pixel',
    trail: 'pixel_dust',
    unlockCondition: { type: 'games_played', value: 200, description: 'Play 200 Games' },
    colors: { body: 0x4CAF50, wing: 0x1B5E20, beak: 0xFFC107, eye: 0x000000 },
    price: 1600
  },
  vampire: {
    id: 'vampire',
    name: 'Count Flapula',
    rarity: 'Epic',
    modelType: 'standard',
    trail: 'smoke',
    unlockCondition: { type: 'score', value: 150, description: 'Score 150 in Classic' },
    colors: { body: 0x212121, wing: 0xB71C1C, beak: 0xFFFFFF, eye: 0xFF0000 },
    price: 1800
  },
  magma: {
    id: 'magma',
    name: 'Molten Core',
    rarity: 'Epic',
    modelType: 'neon',
    trail: 'smoke',
    unlockCondition: { type: 'battle_score', value: 150, description: 'Score 150 in Battle' },
    colors: { body: 0x330000, wing: 0xFF4500, beak: 0xFF0000, eye: 0xFFFF00, glow: 0xFF4500 },
    price: 2000
  },
  robot: {
    id: 'robot',
    name: 'Mecha-01',
    rarity: 'Epic',
    modelType: 'standard',
    trail: 'sparkle',
    unlockCondition: { type: 'score', value: 200, description: 'Score 200 in Classic' },
    colors: { body: 0xB0BEC5, wing: 0xCFD8DC, beak: 0x607D8B, eye: 0x00FFFF },
    price: 2400
  },
  toxic: {
    id: 'toxic',
    name: 'Radioactive',
    rarity: 'Epic',
    modelType: 'neon',
    trail: 'neon_line',
    unlockCondition: { type: 'total_score', value: 25000, description: '25,000 Total Score' },
    colors: { body: 0x000000, wing: 0x00FF00, beak: 0xCCFF00, eye: 0x00FF00, glow: 0x00FF00 },
    price: 2200
  },
  ninja_sage: {
    id: 'ninja_sage',
    name: 'Ninja Toad Sage',
    rarity: 'Legendary',
    modelType: 'standard',
    trail: 'smoke',
    unlockCondition: { type: 'battle_score', value: 300, description: 'Score 300 in Battle' },
    colors: { body: 0xFF8C00, wing: 0x212121, beak: 0xFFD700, eye: 0xFFFFFF },
    price: 5000
  },
  saiyan: {
    id: 'saiyan',
    name: 'Super Saiyan',
    rarity: 'Legendary',
    modelType: 'standard',
    trail: 'neon_line',
    unlockCondition: { type: 'score', value: 300, description: 'Score 300 in Classic' },
    colors: { body: 0xFFE0BD, wing: 0xFF4500, beak: 0xFFD700, eye: 0x00FFFF, glow: 0xFFD700 },
    price: 6000
  },
  golden: {
    id: 'golden',
    name: 'Golden Legend',
    rarity: 'Legendary',
    modelType: 'standard',
    trail: 'sparkle',
    unlockCondition: { type: 'total_score', value: 10000, description: '10,000 Total Score' },
    colors: { body: 0xFFD700, wing: 0xFFFFFF, beak: 0xFFA000, eye: 0xFFFFFF },
    price: 10000
  },
  pirate_king: {
    id: 'pirate_king',
    name: 'Pirate King',
    rarity: 'Legendary',
    modelType: 'standard',
    trail: 'pixel_dust',
    unlockCondition: { type: 'total_score', value: 50000, description: '50,000 Total Score' },
    colors: { body: 0xFFE0BD, wing: 0xFF0000, beak: 0xFFD700, eye: 0x000000 },
    price: 9000
  }
};

export const PARTICLE_CONFIG = {
  MAX_PARTICLES: 50,
  TRAIL_SPAWN_RATE: 3, 
};
