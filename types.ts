
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

export interface Powerup {
  x: number;
  y: number;
  type: 'shrink' | 'grow';
  active: boolean;
}

export interface GameConfig {
  gravity: number;
  jumpStrength: number;
  pipeSpeed: number;
  pipeSpawnRate: number; // Frames between pipes
  pipeGap: number;
}

export interface ReplayFrame {
  y: number;
  rotation: number;
  scale: number;
}
