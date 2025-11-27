
export enum GameState {
  START = 'START',
  PLAYING = 'PLAYING',
  GAME_OVER = 'GAME_OVER',
  PAUSED = 'PAUSED',
}

export interface Bird {
  y: number;
  velocity: number;
  rotation: number;
  scale: number;
  targetScale: number;
  effectTimer: number;
}

export interface Pipe {
  x: number;
  topHeight: number; // Height of the top pipe
  passed: boolean;
  type: 'normal' | 'glass';
  brokenTop: boolean;
  brokenBottom: boolean;
}

export type PowerupType = 
  | 'shrink' | 'grow' | 'slowmo' | 'shield' | 'ghost' 
  | 'gun' | 'gun_spread' | 'gun_rapid' | 'gun_double' | 'gun_wave' | 'gun_pulse'
  | 'fast' | 'random';

export interface Powerup {
  x: number;
  y: number;
  type: PowerupType;
  active: boolean;
}

export interface ActivePowerup {
  type: PowerupType;
  timeLeft: number; // in milliseconds roughly (frames)
  totalTime: number;
}

export interface Projectile {
  x: number;
  y: number;
  vx: number;
  vy: number;
  id: number;
  color?: number;
  // Advanced properties
  type?: string;
  initialY?: number;
  time?: number;
  scale?: number;
  damage?: number;
  pierce?: number;
}

export interface BossProjectile {
  x: number;
  y: number;
  vx: number;
  vy: number;
  id: number;
}

export interface GameConfig {
  gravity: number;
  jumpStrength: number;
  pipeSpeed: number;
  pipeSpawnRate: number; // Frames between pipes
  pipeGap: number;
}

// --- COSMETICS ---

export type Rarity = 'Common' | 'Rare' | 'Epic' | 'Legendary';
export type TrailType = 'none' | 'smoke' | 'sparkle' | 'neon_line' | 'pixel_dust' | 'ghost_trail';
export type SkinId = 
  | 'default' | 'neon_blue' | 'neon_pink' | 'pixel_bird' | 'pixel_scout' 
  | 'ninja' | 'robot' | 'ghost' | 'golden'
  | 'magma' | 'ice_breaker' | 'bumblebee' | 'zombie' | 'vampire' | 'bubblegum' | 'toxic' | 'saiyan'
  | 'ninja_sage' | 'pirate_king' | 'enemy' | 'boss';

export interface UnlockCondition {
  type: 'default' | 'score' | 'games_played' | 'login' | 'lucky_drop';
  value: number; // e.g. Score 50, or 100 games
  description: string;
}

export interface Skin {
  id: SkinId;
  name: string;
  rarity: Rarity;
  unlockCondition: UnlockCondition;
  
  // Visual Configuration
  modelType: 'standard' | 'neon' | 'pixel';
  trail: TrailType;
  
  // Colors (hex strings)
  colors: {
    body: number;
    wing: number;
    beak: number;
    eye: number;
    glow?: number; // For neon
  };
}

export interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  scale: number;
  color: number;
  rotation: number;
}
// --- ENVIRONMENT ---

export type Biome = 'City' | 'Jungle' | 'Space' | 'Underwater';
export type Weather = 'Clear' | 'Rain' | 'Fog' | 'Wind';
export type TimeOfDay = 'Dawn' | 'Noon' | 'Dusk' | 'Night';

export interface EnvironmentState {
  biome: Biome;
  timeOfDay: TimeOfDay;
  weather: Weather;
  timeProgress: number; // 0 to 1 for day cycle
}

// --- ENDLESS DANGER MODE ---

export type GameMode = 'standard' | 'danger' | 'battle';

export type HazardType = 'laser' | 'debris';

export interface Laser {
  id: number;
  y: number;
  width: number; // full screen usually
  state: 'warning' | 'active' | 'cooldown';
  timer: number;
}

export interface Debris {
  id: number;
  x: number;
  y: number;
  rotation: number;
  size: number;
}

export interface Enemy {
  id: number;
  x: number;
  y: number;
  velocity: number;
  targetY: number;
  hp: number;
  scale: number;
}

export interface Boss {
  active: boolean;
  x: number;
  y: number;
  hp: number;
  maxHp: number;
  phase: number;
  targetY: number;
  attackTimer: number;
}
