import React, { useState, useEffect, useCallback } from 'react';
import { GameEngine } from './components/GameEngine';
import { Button } from './components/Button';
import { GameState } from './types';
import { audioService } from './services/audioService';

const App: React.FC = () => {
  const [gameState, setGameState] = useState<GameState>(GameState.START);
  const [score, setScore] = useState(0);
  const [highScore, setHighScore] = useState(0);
  const [isNewHighScore, setIsNewHighScore] = useState(false);
  const [shake, setShake] = useState(false);

  useEffect(() => {
    const stored = localStorage.getItem('flapai-highscore');
    if (stored) {
      setHighScore(parseInt(stored, 10));
    }
  }, []);

  useEffect(() => {
    if (gameState === GameState.GAME_OVER) {
      if (score > highScore) {
        setHighScore(score);
        localStorage.setItem('flapai-highscore', score.toString());
        setIsNewHighScore(true);
      }
    }
  }, [gameState, score, highScore]);

  const startGame = () => {
    audioService.init();
    setGameState(GameState.PLAYING);
    setIsNewHighScore(false);
  };

  const resetGame = () => {
    setGameState(GameState.START);
    setIsNewHighScore(false);
  };
  
  const togglePause = useCallback(() => {
    setGameState(prev => {
      if (prev === GameState.PLAYING) return GameState.PAUSED;
      if (prev === GameState.PAUSED) return GameState.PLAYING;
      return prev;
    });
  }, []);

  const triggerShake = () => {
    setShake(true);
    setTimeout(() => setShake(false), 300);
  };

  // Keyboard listener for Pause (P)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'KeyP') {
        togglePause();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [togglePause]);

  return (
    <div className={`relative w-full h-screen overflow-hidden ${shake ? 'animate-pulse' : ''}`}>
      {/* Game Layer */}
      <div className="absolute inset-0 z-0">
        <GameEngine 
          gameState={gameState} 
          setGameState={setGameState} 
          setScore={setScore}
          triggerEffect={triggerShake}
          highScore={highScore}
        />
      </div>

      {/* HUD Score (Playing or Paused) */}
      {(gameState === GameState.PLAYING || gameState === GameState.PAUSED) && (
        <div className="absolute top-10 left-0 right-0 text-center z-10 pointer-events-none">
          <span className="text-6xl font-black text-white drop-shadow-lg select-none font-['Outfit']">
            {score}
          </span>
        </div>
      )}
      
      {/* Pause Button */}
      {gameState === GameState.PLAYING && (
        <button 
          onClick={togglePause}
          className="absolute top-8 right-8 z-30 w-12 h-12 bg-white/20 backdrop-blur-md border border-white/30 rounded-full flex items-center justify-center hover:bg-white/30 transition-all active:scale-95 group"
          aria-label="Pause Game"
        >
          <div className="flex gap-1.5">
            <div className="w-1.5 h-5 bg-white rounded-full shadow-sm group-hover:scale-y-110 transition-transform"></div>
            <div className="w-1.5 h-5 bg-white rounded-full shadow-sm group-hover:scale-y-110 transition-transform"></div>
          </div>
        </button>
      )}

      {/* Pause Menu Overlay */}
      {gameState === GameState.PAUSED && (
        <div className="absolute inset-0 flex items-center justify-center z-40 bg-slate-900/40 backdrop-blur-md animate-fade-in">
          <div className="glass-panel p-8 rounded-3xl text-center min-w-[320px] shadow-2xl border border-white/10">
             <div className="mb-8">
                <div className="w-16 h-16 mx-auto bg-amber-400 rounded-full flex items-center justify-center mb-4 shadow-lg border-4 border-white/20">
                    <div className="flex gap-2">
                        <div className="w-2 h-6 bg-white rounded-full"></div>
                        <div className="w-2 h-6 bg-white rounded-full"></div>
                    </div>
                </div>
                <h2 className="text-4xl font-black text-white tracking-wide drop-shadow-sm">PAUSED</h2>
             </div>
             
             <div className="flex flex-col gap-4">
                <Button onClick={togglePause} className="w-full">
                  RESUME
                </Button>
                <Button onClick={resetGame} variant="secondary" className="w-full">
                  QUIT TO MENU
                </Button>
             </div>
          </div>
        </div>
      )}

      {/* Start Screen */}
      {gameState === GameState.START && (
        <div className="absolute inset-0 flex items-center justify-center z-20 bg-black/20 backdrop-blur-sm">
          <div className="glass-panel p-10 rounded-3xl text-center max-w-sm mx-4 shadow-2xl transform transition-all animate-fade-in-up">
            <h1 className="text-5xl font-black bg-clip-text text-transparent bg-gradient-to-r from-amber-400 to-orange-600 mb-2 drop-shadow-sm">
              FlapAI
            </h1>
            <div className="text-xl text-slate-200 mb-8 font-light">2025 Edition</div>
            
            <div className="mb-8 flex justify-center">
               {/* Simple decorative bird icon */}
               <div className="w-16 h-16 bg-amber-400 rounded-full border-4 border-white shadow-lg animate-bounce flex items-center justify-center relative">
                 <div className="absolute top-3 right-3 w-4 h-4 bg-white rounded-full"><div className="w-1 h-1 bg-black rounded-full absolute top-1 right-1"></div></div>
                 <div className="absolute -left-2 w-6 h-4 bg-white/50 rounded-full"></div>
               </div>
            </div>

            <Button onClick={startGame} className="w-full">
              PLAY NOW
            </Button>
            
            <div className="mt-6 text-sm text-slate-300">
              Tap, Click or Spacebar to Fly
            </div>
          </div>
        </div>
      )}

      {/* Game Over Screen */}
      {gameState === GameState.GAME_OVER && (
        <div className="absolute inset-0 flex items-center justify-center z-20 bg-slate-900/60 backdrop-blur-md">
          <div className="glass-panel p-8 rounded-3xl text-center w-full max-w-xs mx-4 shadow-2xl border border-white/10 relative">
            
            <h2 className={`text-4xl font-bold text-white mb-2 tracking-wide ${isNewHighScore ? 'mb-2' : 'mb-6'}`}>
              GAME OVER
            </h2>
            
            {isNewHighScore && (
              <div className="mb-6 animate-bounce flex justify-center">
                <span className="bg-gradient-to-r from-yellow-400 to-orange-500 text-white px-4 py-1 rounded-full text-sm font-black shadow-lg border border-white/20 transform -rotate-2 inline-block">
                  🏆 NEW HIGH SCORE!
                </span>
              </div>
            )}

            <div className="flex flex-col gap-4 mb-8">
              <div className={`p-4 rounded-2xl border transition-all duration-500 ${isNewHighScore ? 'bg-yellow-400/20 border-yellow-400/50 shadow-[0_0_30px_rgba(251,191,36,0.3)]' : 'bg-white/10 border-white/5'}`}>
                <div className={`text-sm uppercase tracking-wider text-xs ${isNewHighScore ? 'text-yellow-200' : 'text-slate-300'}`}>Score</div>
                <div className={`text-5xl font-bold ${isNewHighScore ? 'text-yellow-400' : 'text-amber-400'}`}>{score}</div>
              </div>
              
              <div className="bg-white/5 p-3 rounded-2xl border border-white/5">
                <div className="text-xs text-slate-400 uppercase tracking-wider">Best</div>
                <div className="text-2xl font-bold text-white">{highScore}</div>
              </div>
            </div>

            <div className="flex flex-col gap-3">
              <Button onClick={startGame}>
                TRY AGAIN
              </Button>
              <Button onClick={resetGame} variant="secondary">
                HOME
              </Button>
            </div>
          </div>
        </div>
      )}
      
      <div className="absolute bottom-2 right-4 text-white/20 text-xs font-mono z-50 pointer-events-none">
        v1.2.0
      </div>
    </div>
  );
};

export default App;