

import { Skin } from './types';

export const GAME_CONSTANTS = {
  GRAVITY: 0.55,
  JUMP_STRENGTH: -8.2, // Negative because Y is down
  BASE_PIPE_SPEED: 4.2,
  SPEED_INCREMENT: 0.0015, // Speed increase per frame
  PIPE_GAP: 155,
  PIPE_WIDTH: 65,
  PIPE_SPAWN_RATE: 105, // Frames between pipes
  BIRD_RADIUS: 17,
  BIRD_X_POSITION: 0.3, // 30% of screen width
  GLASS_PIPE_CHANCE: 0.25,
  GLASS_BREAK_SCORE: 5,
  GLASS_BREAK_PENALTY: 8, // Positive Y velocity to push down
  
  // Powerups
  POWERUP_SPAWN_RATE: 600, // Reduced frequency (approx 10s)
  POWERUP_SIZE: 20,
  
  // Durations (in frames approx 60fps)
  DURATION_SIZE: 300, 
  DURATION_SLOWMO: 180, // 3 seconds
  DURATION_FAST: 300, // 5 seconds
  DURATION_SHIELD: 600, // 10 seconds
  DURATION_GHOST: 240,  // 4 seconds (Reduced)
  DURATION_GUN: 300, // 5 seconds (Reduced)

  SCALE_NORMAL: 1,
  SCALE_SHRINK: 0.6,
  SCALE_GROW: 1.5,
  
  TIME_SCALE_NORMAL: 1.0,
  TIME_SCALE_SLOW: 0.6,
  TIME_SCALE_FAST: 1.4,
  
  // Gun Stats
  GUN_FIRE_RATE: 45, // Slower fire rate
  PROJECTILE_SPEED: 9,
  
  // Mobile Responsiveness
  MIN_GAME_WIDTH: 600,
  MIN_GAME_HEIGHT: 600,
};

export const COLORS = {
  BIRD_FILL: '#FFE600', // Brighter Vivid Yellow
  BIRD_STROKE: '#FF9100', // Bright Orange
  PIPE_FILL: '#22C55E', // Brighter Green
  PIPE_STROKE: '#15803D', // Green 700
  PIPE_GLASS: '#A5F3FC', // Cyan 200 for Glass
  PIPE_GLASS_STROKE: '#CFFAFE', // Cyan 100
  SKY_TOP: '#6366F1', // Indigo 500
  SKY_BOTTOM: '#38BDF8', // Sky 400
  
  // Powerup Colors
  POWERUP_SHRINK: '#3B82F6', // Blue 500
  POWERUP_GROW: '#EF4444', // Red 500
  POWERUP_SLOWMO: '#8B5CF6', // Violet 500
  POWERUP_SHIELD: '#FFFFFF', // Changed to White to match pause button aesthetic
  POWERUP_GHOST: '#EC4899', // Pink 500
  POWERUP_GUN: '#14B8A6', // Teal 500
  POWERUP_FAST: '#84CC16', // Lime 500
  POWERUP_RANDOM: '#F59E0B', // Amber 500 (Gold)
  
  SHIELD_GLOW: '#FFFFFF', // Changed to White
  PROJECTILE: '#FFFF00', // Yellow Projectiles
  BOSS_PROJECTILE: '#FF0000',
};

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
  { id: 'gun', name: 'Plasma Blaster', description: 'Standard rapid-fire energy weapon. Reliable & balanced.', color: '#14B8A6', stats: 'Fire Rate: ⭐⭐⭐\nDamage: ⭐⭐' },
  { id: 'gun_spread', name: 'Tri-Shot', description: 'Fires 3 projectiles in a wide spread. Crowd control.', color: '#F97316', stats: 'Fire Rate: ⭐⭐\nSpread: ⭐⭐⭐⭐⭐' },
  { id: 'gun_rapid', name: 'Vulcan Cannon', description: 'Extreme fire rate. Melts bosses but eats accuracy.', color: '#8B5CF6', stats: 'Fire Rate: ⭐⭐⭐⭐⭐\nAccuracy: ⭐' },
  { id: 'gun_double', name: 'Twin Strikers', description: 'Fires two parallel shots. Double the trouble.', color: '#4ADE80', stats: 'Fire Rate: ⭐⭐⭐\nDamage: ⭐⭐⭐' },
  { id: 'gun_wave', name: 'Sonic Wave', description: 'Oscillating energy waves that pierce through multiple enemies.', color: '#06B6D4', stats: 'Fire Rate: ⭐⭐\nPierce: ⭐⭐⭐⭐' },
  { id: 'gun_pulse', name: 'Omega Pulse', description: 'Massive piercing energy ball. Obliterates everything in its path.', color: '#E11D48', stats: 'Fire Rate: ⭐\nDamage: ⭐⭐⭐⭐⭐' },
  // MELEE WEAPONS
  { id: 'weapon_spear', name: 'Gungnir Spear', description: 'High-velocity piercing throw. Penetrates multiple enemies.', color: '#FFD700', stats: 'Fire Rate: ⭐⭐\nPierce: ⭐⭐⭐⭐⭐' },
  { id: 'weapon_dagger', name: 'Shadow Daggers', description: 'Throw 3 knives in a burst. Fast but weak.', color: '#A8A29E', stats: 'Fire Rate: ⭐⭐⭐⭐⭐\nSpeed: ⭐⭐⭐⭐⭐' },
];

// --- ENVIRONMENT CONSTANTS ---

export const BIOME_CONFIG = {
  City: {
    bgTop: 0x475569, // Slate 600
    bgBottom: 0x1e293b, // Slate 800
    pipeColor: 0x64748b, // Slate 500
    particleType: 'none',
  },
  Jungle: {
    bgTop: 0x14532d, // Green 900
    bgBottom: 0x166534, // Green 800
    pipeColor: 0x15803d, // Green 700
    particleType: 'spores',
  },
  Space: {
    bgTop: 0x0f172a, // Slate 900
    bgBottom: 0x020617, // Slate 950
    pipeColor: 0x334155, // Slate 700
    particleType: 'stars',
  },
  Underwater: {
    bgTop: 0x1e40af, // Blue 800
    bgBottom: 0x172554, // Blue 900
    pipeColor: 0x1e3a8a, // Blue 900
    particleType: 'bubbles',
  }
};

export const TIME_CYCLES = {
  Dawn: { skyTop: 0xfbbf24, skyBottom: 0xfeb4b2, lightIntensity: 0.6 },
  Noon: { skyTop: 0x38bdf8, skyBottom: 0xbae6fd, lightIntensity: 1.0 },
  Dusk: { skyTop: 0x4c1d95, skyBottom: 0xf472b6, lightIntensity: 0.7 },
  Night: { skyTop: 0x0f172a, skyBottom: 0x312e81, lightIntensity: 0.3 }
};

// --- DANGER MODE CONSTANTS ---

export const DANGER_CONSTANTS = {
  SPEED_MULTIPLIER: 1.5,
  SPAWN_RATE_MODIFIER: 0.7, // Spawns hazards faster
  DANGER_FILL_RATE: 0.05, // Per frame
  SURGE_DURATION: 300, // 5 seconds
  LASER_WARN_TIME: 120, // 2 seconds
  LASER_ACTIVE_TIME: 60, // 1 second
  DEBRIS_SPEED: 6,
  
  COLORS: {
    SKY_TOP: 0x450a0a, // Red 950
    SKY_BOTTOM: 0x000000,
    SURGE_VIGNETTE: 0xff0000
  }
};

// --- BATTLE MODE CONSTANTS ---

export const BATTLE_CONSTANTS = {
    ENEMY_SPAWN_RATE: 20, // Reduced from 22 for more enemies
    ENEMY_SPEED: 12.5, // Increased from 11.0 for higher difficulty
    ENEMY_SCORE: 10,
    ENEMY_HP: 1,
    ENEMY_SIZE: 20,
    BOSS_INTERVAL: 250, // Score points between bosses
    BOSS_BASE_HP: 30, // As requested
    BOSS_SIZE: 70,
    BOSS_ATTACK_RATE: 50, // Frames (Faster attacks, was 65)
    BOSS_PROJECTILE_SPEED: 11.0, // Faster boss projectiles (was 9.0)
    PLAYER_HP: 3, // Reduced from 5 to balance the difficulty
    DAMAGE_COOLDOWN: 60, // 1 second invulnerability
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
    unlockCondition: { type: 'default', value: 0, description: 'Unlocked' },
    colors: { body: 0xFFE600, wing: 0xFFFFFF, beak: 0xFF9100, eye: 0xFFFFFF }
  },
  neon_blue: {
    id: 'neon_blue',
    name: 'Cyber Pulse',
    rarity: 'Rare',
    modelType: 'neon',
    trail: 'neon_line',
    unlockCondition: { type: 'default', value: 0, description: 'Unlocked' },
    colors: { body: 0x000000, wing: 0x00FFFF, beak: 0x00FFFF, eye: 0xFFFFFF, glow: 0x00FFFF }
  },
  neon_pink: {
    id: 'neon_pink',
    name: 'Neon Drift',
    rarity: 'Rare',
    modelType: 'neon',
    trail: 'sparkle',
    unlockCondition: { type: 'default', value: 0, description: 'Unlocked' },
    colors: { body: 0x220022, wing: 0xFF00FF, beak: 0xFF00FF, eye: 0xFFFFFF, glow: 0xFF00FF }
  },
  pixel_bird: {
    id: 'pixel_bird',
    name: '8-Bit Hero',
    rarity: 'Rare',
    modelType: 'pixel',
    trail: 'pixel_dust',
    unlockCondition: { type: 'default', value: 0, description: 'Unlocked' },
    colors: { body: 0xFCC200, wing: 0xFFFFFF, beak: 0xE65100, eye: 0x000000 }
  },
  pixel_scout: {
    id: 'pixel_scout',
    name: 'Voxel Scout',
    rarity: 'Epic',
    modelType: 'pixel',
    trail: 'pixel_dust',
    unlockCondition: { type: 'default', value: 0, description: 'Unlocked' },
    colors: { body: 0x4CAF50, wing: 0x1B5E20, beak: 0xFFC107, eye: 0x000000 }
  },
  ninja: {
    id: 'ninja',
    name: 'Shadow Ninja',
    rarity: 'Epic',
    modelType: 'standard',
    trail: 'smoke',
    unlockCondition: { type: 'default', value: 0, description: 'Unlocked' },
    colors: { body: 0x212121, wing: 0x424242, beak: 0xD32F2F, eye: 0xFFFFFF }
  },
  robot: {
    id: 'robot',
    name: 'Mecha-01',
    rarity: 'Epic',
    modelType: 'standard',
    trail: 'sparkle',
    unlockCondition: { type: 'default', value: 0, description: 'Unlocked' },
    colors: { body: 0xB0BEC5, wing: 0xCFD8DC, beak: 0x607D8B, eye: 0x00FFFF }
  },
  golden: {
    id: 'golden',
    name: 'Golden Legend',
    rarity: 'Legendary',
    modelType: 'standard',
    trail: 'sparkle',
    unlockCondition: { type: 'default', value: 0, description: 'Unlocked' },
    colors: { body: 0xFFD700, wing: 0xFFFFFF, beak: 0xFFA000, eye: 0xFFFFFF }
  },
  // --- NEW FUN SKINS ---
  magma: {
    id: 'magma',
    name: 'Molten Core',
    rarity: 'Epic',
    modelType: 'neon',
    trail: 'smoke',
    unlockCondition: { type: 'default', value: 0, description: 'Unlocked' },
    colors: { body: 0x330000, wing: 0xFF4500, beak: 0xFF0000, eye: 0xFFFF00, glow: 0xFF4500 }
  },
  ice_breaker: {
    id: 'ice_breaker',
    name: 'Frost Byte',
    rarity: 'Rare',
    modelType: 'neon',
    trail: 'ghost_trail',
    unlockCondition: { type: 'default', value: 0, description: 'Unlocked' },
    colors: { body: 0xE0FFFF, wing: 0x00FFFF, beak: 0xFFFFFF, eye: 0x0000FF, glow: 0x00FFFF }
  },
  bumblebee: {
    id: 'bumblebee',
    name: 'Buzzy Bee',
    rarity: 'Common',
    modelType: 'pixel',
    trail: 'pixel_dust',
    unlockCondition: { type: 'default', value: 0, description: 'Unlocked' },
    colors: { body: 0xFFD700, wing: 0x000000, beak: 0x000000, eye: 0xFFFFFF }
  },
  zombie: {
    id: 'zombie',
    name: 'Zom-Bird',
    rarity: 'Rare',
    modelType: 'pixel',
    trail: 'pixel_dust',
    unlockCondition: { type: 'default', value: 0, description: 'Unlocked' },
    colors: { body: 0x558B2F, wing: 0x33691E, beak: 0x1B5E20, eye: 0xFF0000 }
  },
  vampire: {
    id: 'vampire',
    name: 'Count Flapula',
    rarity: 'Epic',
    modelType: 'standard',
    trail: 'smoke',
    unlockCondition: { type: 'default', value: 0, description: 'Unlocked' },
    colors: { body: 0x212121, wing: 0xB71C1C, beak: 0xFFFFFF, eye: 0xFF0000 }
  },
  bubblegum: {
    id: 'bubblegum',
    name: 'Bubblegum Pop',
    rarity: 'Common',
    modelType: 'standard',
    trail: 'sparkle',
    unlockCondition: { type: 'default', value: 0, description: 'Unlocked' },
    colors: { body: 0xF8BBD0, wing: 0xF48FB1, beak: 0xFFFFFF, eye: 0x000000 }
  },
  toxic: {
    id: 'toxic',
    name: 'Radioactive',
    rarity: 'Epic',
    modelType: 'neon',
    trail: 'neon_line',
    unlockCondition: { type: 'default', value: 0, description: 'Unlocked' },
    colors: { body: 0x000000, wing: 0x00FF00, beak: 0xCCFF00, eye: 0x00FF00, glow: 0x00FF00 }
  },
  saiyan: {
    id: 'saiyan',
    name: 'Super Saiyan',
    rarity: 'Legendary',
    modelType: 'standard',
    trail: 'neon_line',
    unlockCondition: { type: 'default', value: 0, description: 'Unlocked' },
    colors: { body: 0xFFE0BD, wing: 0xFF4500, beak: 0xFFD700, eye: 0x00FFFF, glow: 0xFFD700 }
  },
  // --- ANIME SKINS ---
  ninja_sage: {
    id: 'ninja_sage',
    name: 'Ninja Toad Sage',
    rarity: 'Legendary',
    modelType: 'standard',
    trail: 'smoke',
    unlockCondition: { type: 'default', value: 0, description: 'Unlocked' },
    colors: { body: 0xFF8C00, wing: 0x212121, beak: 0xFFD700, eye: 0xFFFFFF }
  },
  pirate_king: {
    id: 'pirate_king',
    name: 'Pirate King',
    rarity: 'Legendary',
    modelType: 'standard',
    trail: 'pixel_dust',
    unlockCondition: { type: 'default', value: 0, description: 'Unlocked' },
    colors: { body: 0xFFE0BD, wing: 0xFF0000, beak: 0xFFD700, eye: 0x000000 }
  }
};

export const PARTICLE_CONFIG = {
  MAX_PARTICLES: 50,
  TRAIL_SPAWN_RATE: 3, // Frame interval
};