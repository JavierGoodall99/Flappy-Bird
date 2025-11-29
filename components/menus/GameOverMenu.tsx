
import React from 'react';
import { Button } from '../Button';
import { GameMode, PowerupType } from '../../types';

interface GameOverMenuProps {
    score: number;
    highScore: number;
    isNewHighScore: boolean;
    gameMode: GameMode;
    initialPowerup: PowerupType | null;
    onRestart: (powerup: PowerupType | null, mode: GameMode) => void;
    onHome: () => void;
}

export const GameOverMenu: React.FC<GameOverMenuProps> = ({ 
    score, highScore, isNewHighScore, gameMode, initialPowerup, onRestart, onHome 
}) => {
    return (
        <div className="absolute inset-0 flex items-center justify-center z-20 bg-slate-900/60 backdrop-blur-md">
          <div className="glass-panel p-6 md:p-8 rounded-3xl text-center w-full max-w-xs mx-4 shadow-2xl border border-white/10 relative max-h-[90vh] overflow-y-auto no-scrollbar">
            <h2 className={`text-3xl md:text-4xl font-bold text-white mb-4 md:mb-6 tracking-wide`}>GAME OVER</h2>

            <div className="flex flex-col gap-3 md:gap-4 mb-6 md:mb-8">
                <div className={`p-4 rounded-2xl border transition-all duration-500 ${isNewHighScore ? 'bg-yellow-400/20 border-yellow-400/50 shadow-[0_0_30px_rgba(251,191,36,0.3)]' : 'bg-white/10 border-white/5'}`}>
                    <div className={`text-sm uppercase tracking-wider text-xs ${isNewHighScore ? 'text-yellow-200' : 'text-slate-300'}`}>Score</div>
                    <div className={`text-4xl md:text-5xl font-bold ${isNewHighScore ? 'text-yellow-400' : 'text-amber-400'}`}>{score}</div>
                </div>
                {gameMode !== 'playground' && (
                  <div className="p-3 bg-white/5 rounded-xl border border-white/5 flex justify-center px-6">
                      <div className="text-center">
                          <div className="text-xs uppercase tracking-wider text-slate-400">Best</div>
                          <div className="text-xl font-bold text-white">{highScore}</div>
                      </div>
                  </div>
                )}
            </div>

            <div className="flex flex-col gap-3">
              <Button onClick={() => onRestart(initialPowerup, gameMode)}>TRY AGAIN</Button>
              <Button onClick={onHome} variant="secondary">HOME</Button>
            </div>
            <div className="text-white/30 text-xs mt-4">Press Space to Restart</div>
          </div>
        </div>
    );
};
