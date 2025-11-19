

export const GAME_CONSTANTS = {
  GRAVITY: 0.4,
  JUMP_STRENGTH: -7, // Negative because Y is down
  BASE_PIPE_SPEED: 3.5,
  SPEED_INCREMENT: 0.001, // Speed increase per frame
  PIPE_GAP: 180,
  PIPE_WIDTH: 60,
  PIPE_SPAWN_RATE: 120, // Frames
  BIRD_RADIUS: 18,
  BIRD_X_POSITION: 0.3, // 30% of screen width
  GLASS_PIPE_CHANCE: 0.2,
  GLASS_BREAK_SCORE: 5,
  GLASS_BREAK_PENALTY: 5, // Positive Y velocity to push down
  
  // Powerups
  POWERUP_SPAWN_RATE: 300, // Frames approx 5s
  POWERUP_SIZE: 20,
  POWERUP_DURATION: 300, // Frames (5 seconds at 60fps)
  SCALE_NORMAL: 1,
  SCALE_SHRINK: 0.6,
  SCALE_GROW: 1.5,
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
  POWERUP_SHRINK: '#3B82F6', // Blue 500
  POWERUP_GROW: '#EF4444', // Red 500
};
