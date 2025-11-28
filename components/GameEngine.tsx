
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
      setPlayerHealth: props.setPlayerHealth
  }));
  
  const rendererRef = useRef<GameRenderer>(new GameRenderer());
  const prevGameStateRef = useRef<GameState>(props.gameState);

  // Sync Props to Logic
  useEffect(() => {
     logicRef.current.updateProps(props.gameState, props.gameMode, props.initialPowerup || null, props.currentSkin);
     rendererRef.current.updateSkin(props.currentSkin);
  }, [props.gameState, props.gameMode, props.initialPowerup, props.currentSkin]);

  // Main Loop
  const loop = () => {
    const width = window.innerWidth;
    const height = window.innerHeight;
    
    // Calculate scale factor using max of width/height constraints
    // This ensures game world is never too small on either axis
    const scale = Math.max(1, GAME_CONSTANTS.MIN_GAME_WIDTH / width, GAME_CONSTANTS.MIN_GAME_HEIGHT / height);
    
    // Apply scale to both width and height to maintain aspect ratio coverage
    const logicWidth = width * scale;
    const logicHeight = height * scale;
    
    const now = performance.now();
    if (!lastTimeRef.current) lastTimeRef.current = now;
    const rawDeltaMS = Math.min(now - lastTimeRef.current, 100); 
    lastTimeRef.current = now;
    const rawDeltaFactor = rawDeltaMS / 16.666;

    // Update Logic using SCALED dimensions
    logicRef.current.update(rawDeltaFactor, logicWidth, logicHeight);

    // Render (Renderer handles mapping Logic -> Screen)
    rendererRef.current.render(logicRef.current);

    requestRef.current = requestAnimationFrame(loop);
  };

  useEffect(() => {
    if (containerRef.current) {
        rendererRef.current.init(containerRef.current);
        // Start loop
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
          logicRef.current.reset(false, logicWidth, logicHeight);
          rendererRef.current.reset();
      } else if (props.gameState === GameState.PLAYING) {
          if (prevGameStateRef.current === GameState.START || prevGameStateRef.current === GameState.GAME_OVER) {
              logicRef.current.reset(true, logicWidth, logicHeight);
              rendererRef.current.reset();
          }
      }
      prevGameStateRef.current = props.gameState;
  }, [props.gameState]);

  // Input Handling
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'Space') {
        e.preventDefault();
        logicRef.current.jump();
      }
    };
    const handleTouchOrClick = (e: Event) => {
      // Prevent jump if interacting with UI buttons
      const target = e.target as HTMLElement;
      if (target.closest('button') || target.closest('[role="button"]')) {
          return;
      }
      logicRef.current.jump();
    };
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('mousedown', handleTouchOrClick);
    window.addEventListener('touchstart', handleTouchOrClick, { passive: false });
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('mousedown', handleTouchOrClick);
      window.removeEventListener('touchstart', handleTouchOrClick);
    };
  }, []);

  return (
    <div ref={containerRef} className="w-full h-full cursor-pointer" />
  );
};
