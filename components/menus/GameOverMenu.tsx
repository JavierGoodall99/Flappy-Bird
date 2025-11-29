
import React from 'react';
import { Button } from '../Button';
import { GameMode, PowerupType } from '../../types';
import { ECONOMY } from '../../constants';

interface GameOverMenuProps {
    score: number;
    runCoins: number;
    totalCoins: number;
    highScore: number;
    isNewHighScore: boolean;
    gameMode: GameMode;
    initialPowerup: PowerupType | null;
    onRestart: (powerup: PowerupType | null, mode: GameMode) => void;
    onHome: () => void;
    onRevive: () => void;
    canRevive: boolean;
}

export const GameOverMenu: React.FC<GameOverMenuProps> = ({ 
    score, runCoins, totalCoins, highScore, isNewHighScore, gameMode, initialPowerup, onRestart, onHome, onRevive, canRevive
}) => {
    return (
        <div className="absolute inset-0 flex items-center justify-center z-20 bg-slate-900/60 backdrop-blur-md">
          <div className="glass-panel p-6 md:p-8 rounded-3xl text-center w-full max-w-xs mx-4 shadow-2xl border border-white/10 relative max-h-[90vh] overflow-y-auto no-scrollbar touch-pan-y">
            <h2 className={`text-3xl md:text-4xl font-bold text-white mb-4 md:mb-6 tracking-wide`}>GAME OVER</h2>

            <div className="flex flex-col gap-3 md:gap-4 mb-6 md:mb-8">
                <div className={`p-4 rounded-2xl border transition-all duration-500 ${isNewHighScore ? 'bg-yellow-400/20 border-yellow-400/50 shadow-[0_0_30px_rgba(251,191,36,0.3)]' : 'bg-white/10 border-white/5'}`}>
                    <div className={`text-sm uppercase tracking-wider text-xs ${isNewHighScore ? 'text-yellow-200' : 'text-slate-300'}`}>Score</div>
                    <div className={`text-4xl md:text-5xl font-bold ${isNewHighScore ? 'text-yellow-400' : 'text-amber-400'}`}>{score}</div>
                </div>
                
                {/* Coin Summary */}
                <div className="flex gap-2">
                    <div className="flex-1 p-3 bg-white/5 rounded-xl border border-white/5 flex flex-col items-center justify-center">
                         <div className="text-[10px] uppercase tracking-wider text-slate-400 mb-1">Earned</div>
                         <div className="flex items-center gap-1">
                             <span className="text-yellow-400">🪙</span>
                             <span className="text-lg font-bold text-white">+{runCoins}</span>
                         </div>
                    </div>
                    <div className="flex-1 p-3 bg-white/5 rounded-xl border border-white/5 flex flex-col items-center justify-center">
                         <div className="text-[10px] uppercase tracking-wider text-slate-400 mb-1">Total</div>
                         <div className="flex items-center gap-1">
                             <span className="text-yellow-400">🪙</span>
                             <span className="text-lg font-bold text-white">{totalCoins}</span>
                         </div>
                    </div>
                </div>

                {gameMode !== 'playground' && (
                  <div className="p-2 bg-white/5 rounded-xl border border-white/5 flex justify-center px-6">
                      <div className="text-center">
                          <div className="text-[10px] uppercase tracking-wider text-slate-400">Best</div>
                          <div className="text-lg font-bold text-white">{highScore}</div>
                      </div>
                  </div>
                )}
            </div>

            <div className="flex flex-col gap-3">
              {/* REVIVE BUTTON */}
              {gameMode !== 'playground' && (
                  <button
                      onClick={onRevive}
                      disabled={!canRevive}
                      className={`w-full py-3 rounded-full font-bold text-base tracking-wide flex items-center justify-center gap-2 shadow-lg transition-all active:scale-95 border-b-4
                         ${canRevive 
                            ? 'bg-gradient-to-r from-emerald-500 to-green-600 text-white border-green-800 hover:brightness-110' 
                            : 'bg-slate-700 text-slate-400 border-slate-900 opacity-50 cursor-not-allowed grayscale'
                         }
                      `}
                  >
                      <span>❤️</span> REVIVE ({ECONOMY.REVIVE_COST} 🪙)
                  </button>
              )}
              
              <Button onClick={() => onRestart(initialPowerup, gameMode)}>TRY AGAIN</Button>
              <Button onClick={onHome} variant="secondary">HOME</Button>
            </div>
            <div className="text-white/30 text-xs mt-4">Press Space to Restart</div>
          </div>
        </div>
    );
};
