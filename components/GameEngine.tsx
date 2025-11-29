
import React, { useRef, useEffect } from 'react';
import { GameState, ActivePowerup, Skin, GameMode, PowerupType } from '../types';
import { GameLogic } from '../game/GameLogic';
import { GameRenderer } from '../game/GameRenderer';
import { GAME_CONSTANTS } from '../constants';

interface GameEngineProps {
  gameState: GameState;
  setGameState: (state: GameState) => void;
  setScore: (score: number) => void;
  triggerEffect: () => void;
  highScore: number;
  setActivePowerup: (powerup: ActivePowerup | null) => void;
  currentSkin: Skin;
  initialPowerup?: PowerupType | null; 
  gameMode: GameMode;
  setBossActive: (active: boolean, hp: number, maxHp: number) => void;
  setPlayerHealth: (current: number, max: number) => void;
  onCoinCollected: (total: number) => void;
  reviveTrigger: number;
}

export const GameEngine: React.FC<GameEngineProps> = (props) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const requestRef = useRef<number>(0);
  const lastTimeRef = useRef<number>(0);
  
  const logicRef = useRef<GameLogic>(new GameLogic({
      setGameState: props.setGameState,
      setScore: props.setScore,
      triggerEffect: props.triggerEffect,
      setActivePowerup: props.setActivePowerup,
      setBossActive: props.setBossActive,
      setPlayerHealth: props.setPlayerHealth,
      onCoinCollected: props.onCoinCollected
  }));
  
  const rendererRef = useRef<GameRenderer>(new GameRenderer());
  const prevGameStateRef = useRef<GameState>(props.gameState);

  // Sync Props to Logic
  useEffect(() => {
     logicRef.current.updateProps(props.gameState, props.gameMode, props.initialPowerup || null, props.currentSkin);
     rendererRef.current.updateSkin(props.currentSkin);
  }, [props.gameState, props.gameMode, props.initialPowerup, props.currentSkin]);

  // Handle Revive
  useEffect(() => {
      if (props.reviveTrigger > 0) {
          const width = window.innerWidth;
          const height = window.innerHeight;
          const scale = Math.max(1, GAME_CONSTANTS.MIN_GAME_WIDTH / width, GAME_CONSTANTS.MIN_GAME_HEIGHT / height);
          const logicWidth = width * scale;
          const logicHeight = height * scale;
          
          logicRef.current.revive(logicWidth, logicHeight);
      }
  }, [props.reviveTrigger]);

  // Main Loop
  const loop = () => {
    const width = window.innerWidth;
    const height = window.innerHeight;
    
    const scale = Math.max(1, GAME_CONSTANTS.MIN_GAME_WIDTH / width, GAME_CONSTANTS.MIN_GAME_HEIGHT / height);
    const logicWidth = width * scale;
    const logicHeight = height * scale;
    
    const now = performance.now();
    if (!lastTimeRef.current) lastTimeRef.current = now;
    const rawDeltaMS = Math.min(now - lastTimeRef.current, 100); 
    lastTimeRef.current = now;
    const rawDeltaFactor = rawDeltaMS / 16.666;

    logicRef.current.update(rawDeltaFactor, logicWidth, logicHeight);
    rendererRef.current.render(logicRef.current);

    requestRef.current = requestAnimationFrame(loop);
  };

  useEffect(() => {
    if (containerRef.current) {
        rendererRef.current.init(containerRef.current);
        requestRef.current = requestAnimationFrame(loop);
    }
    
    const handleResize = () => {
        rendererRef.current.resize(window.innerWidth, window.innerHeight);
    };
    
    window.addEventListener('resize', handleResize);
    return () => {
        if (requestRef.current) cancelAnimationFrame(requestRef.current);
        window.removeEventListener('resize', handleResize);
        rendererRef.current.dispose();
    };
  }, []);

  // Handle Game State Changes (Reset)
  useEffect(() => {
      const width = window.innerWidth;
      const height = window.innerHeight;
      const scale = Math.max(1, GAME_CONSTANTS.MIN_GAME_WIDTH / width, GAME_CONSTANTS.MIN_GAME_HEIGHT / height);
      const logicWidth = width * scale;
      const logicHeight = height * scale;

      if (props.gameState === GameState.START) {
          // Full Reset on START
          logicRef.current.reset(false, logicWidth, logicHeight);
          rendererRef.current.reset();
      } else if (props.gameState === GameState.PLAYING) {
          // Transitioning to PLAYING
          if (prevGameStateRef.current === GameState.START || prevGameStateRef.current === GameState.GAME_OVER) {
              // Only reset and spawn entities if we are NOT reviving.
              if (props.reviveTrigger === 0) {
                  logicRef.current.reset(true, logicWidth, logicHeight);
              }
          }
      }
      prevGameStateRef.current = props.gameState;
  }, [props.gameState, props.reviveTrigger]);

  // Input Handlers
  const handlePointerDown = (e: React.PointerEvent) => {
      if (props.gameState === GameState.PLAYING) {
          if (e.button !== 0) return; // Only left click
          logicRef.current.jump();
      }
  };

  useEffect(() => {
      const handleKeyDown = (e: KeyboardEvent) => {
          if (props.gameState === GameState.PLAYING) {
              if (e.code === 'Space' || e.code === 'ArrowUp') {
                  // e.preventDefault(); // handled in App for Space, but good here too
                  logicRef.current.jump();
              }
          }
      };
      window.addEventListener('keydown', handleKeyDown);
      return () => window.removeEventListener('keydown', handleKeyDown);
  }, [props.gameState]);
  
  return (
    <div 
        ref={containerRef} 
        className="w-full h-full cursor-pointer touch-none select-none outline-none" 
        onContextMenu={(e) => e.preventDefault()}
        onPointerDown={handlePointerDown}
    />
  );
};
