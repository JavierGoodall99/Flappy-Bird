
import React from 'react';
import { GameState, ActivePowerup, GameMode, PowerupType } from '../../types';
import { WEAPON_LOADOUTS } from '../../constants';

interface HUDProps {
    gameState: GameState;
    score: number;
    highScore: number;
    gameMode: GameMode;
    activePowerup: ActivePowerup | null;
    bossInfo: { active: boolean; hp: number; maxHp: number };
    playerHealth: { current: number; max: number };
    isMuted: boolean;
    toggleMute: (e: React.MouseEvent) => void;
    togglePause: () => void;
}

export const HUD: React.FC<HUDProps> = ({ 
    gameState, score, highScore, gameMode, activePowerup, bossInfo, playerHealth, isMuted, toggleMute, togglePause
}) => {
    
    // Helper for Powerup Names
    const getPowerupName = (p: ActivePowerup) => {
      if (p.type === 'slowmo') return 'TIME WARP';
      if (p.type === 'shield') return 'SHIELD ACTIVE';
      if (p.type === 'ghost') return 'GHOST MODE';
      if (p.type === 'shrink') return 'TINY BIRD';
      if (p.type === 'fast') return 'TURBO BOOST';
      if (p.type === 'grow') return 'GIANT BIRD';
      if (p.type === 'gun') return 'BLASTER';
      if (p.type === 'gun_spread') return 'TRI-SHOT';
      if (p.type === 'gun_rapid') return 'VULCAN';
      if (p.type.startsWith('weapon_')) {
          const w = WEAPON_LOADOUTS.find(l => l.id === p.type);
          return w ? w.name.toUpperCase() : 'WEAPON';
      }
      return 'POWER UP';
    };

    // Health Bar Logic
    const healthPercent = playerHealth.current / Math.max(1, playerHealth.max);
    const healthColor = healthPercent > 0.7 ? 'from-green-600 to-green-400' : 
                        healthPercent > 0.4 ? 'from-yellow-500 to-amber-500' : 'from-red-600 to-red-500';
    const healthShadow = healthPercent > 0.7 ? 'shadow-[0_0_8px_rgba(74,222,128,0.5)]' : 
                         healthPercent > 0.4 ? 'shadow-[0_0_8px_rgba(245,158,11,0.5)]' : 'shadow-[0_0_8px_rgba(239,68,68,0.5)]';

    return (
        <>
            {/* MUTE BUTTON */}
            <button 
                onClick={toggleMute}
                className="absolute top-6 left-6 md:top-8 md:left-8 z-30 w-10 h-10 md:w-12 md:h-12 bg-white/20 backdrop-blur-md border border-white/30 rounded-full flex items-center justify-center hover:bg-white/30 transition-all active:scale-95 group"
            >
                <span className="text-xl md:text-2xl text-white">{isMuted ? '🔇' : '🔊'}</span>
            </button>

            {/* PAUSE BUTTON */}
            {gameState === GameState.PLAYING && (
                <button 
                onClick={togglePause}
                className="absolute top-6 right-6 md:top-8 md:right-8 z-30 w-10 h-10 md:w-12 md:h-12 bg-white/20 backdrop-blur-md border border-white/30 rounded-full flex items-center justify-center hover:bg-white/30 transition-all active:scale-95 group"
                >
                <div className="flex gap-1.5">
                    <div className="w-1.5 h-4 md:h-5 bg-white rounded-full shadow-sm group-hover:scale-y-110 transition-transform"></div>
                    <div className="w-1.5 h-4 md:h-5 bg-white rounded-full shadow-sm group-hover:scale-y-110 transition-transform"></div>
                </div>
                </button>
            )}

            {/* PLAYER HP HUD (Battle Mode) */}
            {gameMode === 'battle' && gameState === GameState.PLAYING && (
                <div className="absolute top-20 left-6 md:top-24 md:left-8 z-30 pointer-events-none animate-fade-in">
                    <div className="flex flex-col gap-1">
                        <div className="text-xs font-bold text-white/80 tracking-widest uppercase">ARMOR INTEGRITY</div>
                        <div className="flex gap-1">
                            {Array.from({ length: playerHealth.max }).map((_, i) => (
                                <div 
                                    key={i}
                                    className={`w-4 h-6 md:w-5 md:h-8 rounded-sm transform skew-x-[-12deg] transition-all duration-300 border border-white/20
                                    ${i < playerHealth.current ? `bg-gradient-to-t ${healthColor} ${healthShadow}` : 'bg-slate-800/50'}
                                    `}
                                />
                            ))}
                        </div>
                    </div>
                </div>
            )}

            {/* Powerup HUD */}
            {(gameState === GameState.PLAYING) && activePowerup && gameMode !== 'battle' && (
                <div className="absolute top-32 md:top-44 left-0 right-0 flex justify-center z-10 pointer-events-none">
                    <div className="bg-slate-900/60 backdrop-blur-md rounded-full px-6 py-2 border border-white/20 flex items-center gap-3 shadow-xl">
                        <div className={`w-3 h-3 rounded-full animate-pulse 
                            ${activePowerup.type === 'shield' ? 'bg-white shadow-[0_0_8px_rgba(255,255,255,0.6)]' : 
                                activePowerup.type === 'slowmo' ? 'bg-violet-500' :
                                activePowerup.type === 'ghost' ? 'bg-pink-500' : 
                                activePowerup.type === 'shrink' ? 'bg-blue-500' : 
                                activePowerup.type === 'fast' ? 'bg-lime-500' : 
                                activePowerup.type.startsWith('gun') || activePowerup.type.startsWith('weapon_') ? 'bg-teal-500' : 'bg-red-500'
                            }`} 
                        />
                        <div className="text-white font-bold text-sm tracking-wider uppercase">
                            {getPowerupName(activePowerup)}
                        </div>
                        <div className="w-16 h-1.5 bg-white/20 rounded-full overflow-hidden">
                            <div 
                                className="h-full bg-white"
                                style={{ width: `${Math.max(0, (activePowerup.timeLeft / activePowerup.totalTime) * 100)}%` }}
                            />
                        </div>
                    </div>
                </div>
            )}

            {/* BOSS HUD */}
            {bossInfo.active && (
                <div className="absolute top-28 md:top-32 left-0 right-0 flex justify-center z-20 animate-fade-in-up pointer-events-none">
                    <div className="w-full max-w-md px-4">
                    <div className="bg-slate-900/80 backdrop-blur-md p-3 rounded-xl border border-red-500/50 shadow-2xl">
                        <div className="flex justify-between items-center mb-1">
                            <span className="text-red-500 font-black tracking-widest text-xs uppercase">WARNING: GIANT BIRD DETECTED</span>
                            <span className="text-white font-bold text-xs">{Math.ceil(bossInfo.hp)} / {bossInfo.maxHp}</span>
                        </div>
                        <div className="w-full h-4 bg-slate-800 rounded-full overflow-hidden border border-white/10 relative">
                            <div className="absolute inset-0 bg-red-900/50"></div>
                            <div 
                                className="h-full bg-gradient-to-r from-red-600 to-red-500 transition-all duration-200"
                                style={{ width: `${(bossInfo.hp / bossInfo.maxHp) * 100}%` }}
                            ></div>
                        </div>
                    </div>
                    </div>
                </div>
            )}

            {/* Score HUD */}
            {(gameState === GameState.PLAYING || gameState === GameState.PAUSED) && (
                <div className="absolute top-6 md:top-10 left-0 right-0 text-center z-10 pointer-events-none flex flex-col items-center">
                    <span className={`text-5xl md:text-6xl font-black drop-shadow-lg select-none font-['Outfit'] transition-all text-white leading-none`}>
                        {score}
                    </span>
                    
                    {gameMode !== 'playground' && (
                        <div className="text-white/50 font-bold text-xs md:text-sm tracking-widest uppercase drop-shadow-sm mt-1">
                            Best {highScore}
                        </div>
                    )}

                    {gameMode === 'battle' && (
                        <div className="flex justify-center mt-3">
                            <div className="px-5 py-1.5 bg-red-950/40 backdrop-blur-md border border-red-500/30 rounded-full shadow-[0_0_15px_rgba(220,38,38,0.3)] flex items-center gap-2.5">
                                <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse shadow-[0_0_8px_rgba(239,68,68,0.8)]"></span>
                                <span className="text-white/90 font-bold tracking-[0.2em] text-xs uppercase drop-shadow-md">BATTLE MODE</span>
                            </div>
                        </div>
                    )}
                    {gameMode === 'playground' && (
                        <div className="flex justify-center mt-3">
                            <div className="px-5 py-1.5 bg-blue-950/40 backdrop-blur-md border border-blue-500/30 rounded-full shadow-[0_0_15px_rgba(59,130,246,0.3)] flex items-center gap-2.5">
                                <span className="text-white/90 font-bold tracking-[0.2em] text-xs uppercase drop-shadow-md">PRACTICE</span>
                            </div>
                        </div>
                    )}
                </div>
            )}
        </>
    );
};
