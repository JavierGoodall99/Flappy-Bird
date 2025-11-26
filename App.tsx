
import React, { useState, useEffect, useCallback } from 'react';
import { GameEngine } from './components/GameEngine';
import { Button } from './components/Button';
import { GameState, ActivePowerup, SkinId, Skin, PowerupType } from './types';
import { SKINS, POWERUP_INFO } from './constants';
import { audioService } from './services/audioService';

const App: React.FC = () => {
  const [gameState, setGameState] = useState<GameState>(GameState.START);
  const [score, setScore] = useState(0);
  const [highScore, setHighScore] = useState(0);
  
  const [isNewHighScore, setIsNewHighScore] = useState(false);
  const [shake, setShake] = useState(false);
  const [activePowerup, setActivePowerup] = useState<ActivePowerup | null>(null);
  
  // Cosmetics State
  const [currentSkinId, setCurrentSkinId] = useState<SkinId>('default');
  const [unlockedSkins, setUnlockedSkins] = useState<SkinId[]>(['default']);
  const [isShopOpen, setIsShopOpen] = useState(false);
  const [isGuideOpen, setIsGuideOpen] = useState(false);

  // Testing State
  const [initialPowerup, setInitialPowerup] = useState<PowerupType | null>(null);

  useEffect(() => {
    const storedScore = localStorage.getItem('flapai-highscore');
    if (storedScore) setHighScore(parseInt(storedScore, 10));
    
    // Force unlock all default skins for existing users
    const allDefaultSkins = Object.values(SKINS)
        .filter(s => s.unlockCondition.type === 'default')
        .map(s => s.id);
    
    const storedSkins = localStorage.getItem('flapai-unlockedskins');
    let currentUnlocked = storedSkins ? JSON.parse(storedSkins) : [];
    
    // Merge defaults
    const merged = [...new Set([...currentUnlocked, ...allDefaultSkins])];
    setUnlockedSkins(merged);
    // Update storage to reflect new unlocked state for consistency
    localStorage.setItem('flapai-unlockedskins', JSON.stringify(merged));

    const storedCurrentSkin = localStorage.getItem('flapai-currentskin');
    if (storedCurrentSkin && SKINS[storedCurrentSkin]) setCurrentSkinId(storedCurrentSkin as SkinId);
  }, []);

  useEffect(() => {
    if (gameState === GameState.GAME_OVER) {
      if (score > highScore) {
        setHighScore(score);
        localStorage.setItem('flapai-highscore', score.toString());
        setIsNewHighScore(true);
      }
      // Removed setInitialPowerup(null) to persist test state on death
    }
  }, [gameState, score, highScore]);

  const startGame = useCallback((forcedPowerup: PowerupType | null = null) => {
    audioService.init();
    setInitialPowerup(forcedPowerup);
    setGameState(GameState.PLAYING);
    setIsNewHighScore(false);
    setIsGuideOpen(false);
  }, []);

  const resetGame = () => {
    setGameState(GameState.START);
    setIsNewHighScore(false);
    setInitialPowerup(null);
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

  const handleEquipSkin = (id: SkinId) => {
      setCurrentSkinId(id);
      localStorage.setItem('flapai-currentskin', id);
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (isShopOpen || isGuideOpen) return; // Disable game controls in menus
      if (e.code === 'Escape' || e.code === 'KeyP') togglePause();
      if (e.code === 'Space') {
        e.preventDefault(); 
        if (gameState === GameState.PAUSED) togglePause();
        // Pass initialPowerup to persist test mode if active
        else if (gameState === GameState.START || gameState === GameState.GAME_OVER) startGame(initialPowerup);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [togglePause, gameState, startGame, isShopOpen, isGuideOpen, initialPowerup]);

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
          setActivePowerup={setActivePowerup}
          currentSkin={SKINS[currentSkinId]}
          initialPowerup={initialPowerup}
        />
      </div>

      {/* Powerup HUD */}
      {(gameState === GameState.PLAYING) && activePowerup && (
          <div className="absolute top-24 left-0 right-0 flex justify-center z-10 animate-bounce-short">
              <div className="bg-slate-900/60 backdrop-blur-md rounded-full px-6 py-2 border border-white/20 flex items-center gap-3 shadow-xl">
                  <div className={`w-3 h-3 rounded-full animate-pulse 
                      ${activePowerup.type === 'shield' ? 'bg-amber-400' : 
                        activePowerup.type === 'slowmo' ? 'bg-violet-500' :
                        activePowerup.type === 'ghost' ? 'bg-pink-500' : 
                        activePowerup.type === 'shrink' ? 'bg-blue-500' : 
                        activePowerup.type === 'fast' ? 'bg-lime-500' : 
                        activePowerup.type === 'gun' ? 'bg-teal-500' : 'bg-red-500'
                      }`} 
                  />
                  <div className="text-white font-bold text-sm tracking-wider uppercase">
                      {activePowerup.type === 'slowmo' ? 'TIME WARP' : 
                       activePowerup.type === 'shield' ? 'SHIELD ACTIVE' :
                       activePowerup.type === 'ghost' ? 'GHOST MODE' :
                       activePowerup.type === 'shrink' ? 'TINY BIRD' : 
                       activePowerup.type === 'fast' ? 'TURBO BOOST' : 
                       activePowerup.type === 'gun' ? 'BLASTER' : 'GIANT BIRD'}
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

      {/* HUD Score */}
      {(gameState === GameState.PLAYING || gameState === GameState.PAUSED) && (
        <div className="absolute top-10 left-0 right-0 text-center z-10 pointer-events-none">
          <span className={`text-6xl font-black drop-shadow-lg select-none font-['Outfit'] transition-all text-white`}>
            {score}
          </span>
        </div>
      )}
      
      {/* Pause Button */}
      {gameState === GameState.PLAYING && (
        <button 
          onClick={togglePause}
          className="absolute top-8 right-8 z-30 w-12 h-12 bg-white/20 backdrop-blur-md border border-white/30 rounded-full flex items-center justify-center hover:bg-white/30 transition-all active:scale-95 group"
        >
          <div className="flex gap-1.5">
            <div className="w-1.5 h-5 bg-white rounded-full shadow-sm group-hover:scale-y-110 transition-transform"></div>
            <div className="w-1.5 h-5 bg-white rounded-full shadow-sm group-hover:scale-y-110 transition-transform"></div>
          </div>
        </button>
      )}

      {/* Pause Menu */}
      {gameState === GameState.PAUSED && (
        <div className="absolute inset-0 flex items-center justify-center z-40 bg-slate-900/40 backdrop-blur-md">
          <div className="glass-panel p-8 rounded-3xl text-center min-w-[320px] shadow-2xl border border-white/10">
             <h2 className="text-4xl font-black text-white tracking-wide drop-shadow-sm mb-8">PAUSED</h2>
             <div className="flex flex-col gap-4">
                <Button onClick={togglePause} className="w-full">RESUME</Button>
                <Button onClick={resetGame} variant="secondary" className="w-full">QUIT</Button>
             </div>
          </div>
        </div>
      )}

      {/* Start Screen */}
      {gameState === GameState.START && !isShopOpen && !isGuideOpen && (
        <div className="absolute inset-0 flex items-center justify-center z-20 bg-black/20 backdrop-blur-sm">
          <div className="glass-panel p-10 rounded-3xl text-center w-full max-w-md mx-4 shadow-2xl transform transition-all animate-fade-in-up">
            <h1 className="text-6xl font-black bg-clip-text text-transparent bg-gradient-to-r from-amber-400 to-orange-600 mb-2 drop-shadow-sm">
              Fliply
            </h1>
            <div className="text-xl text-slate-200 mb-8 font-light">Arcade Edition</div>
            
            <div className="flex flex-col gap-8">
                <Button onClick={() => startGame(null)} className="w-full text-xl py-4 shadow-xl">PLAY NOW</Button>
                <div className="flex gap-6 w-full">
                  <button 
                    onClick={() => setIsShopOpen(true)}
                    className="flex-1 py-4 rounded-2xl font-bold text-base tracking-wide bg-white/5 text-white border border-white/10 hover:bg-white/15 hover:border-white/30 transition-all flex flex-col items-center justify-center gap-1 group"
                  >
                    <span className="text-2xl mb-1 group-hover:scale-110 transition-transform">🎨</span> 
                    SKINS
                  </button>
                  <button 
                    onClick={() => setIsGuideOpen(true)}
                    className="flex-1 py-4 rounded-2xl font-bold text-base tracking-wide bg-white/5 text-white border border-white/10 hover:bg-white/15 hover:border-white/30 transition-all flex flex-col items-center justify-center gap-1 group"
                  >
                    <span className="text-2xl mb-1 group-hover:scale-110 transition-transform">⚡</span> 
                    POWERS
                  </button>
                </div>
                <div className="text-white/30 text-xs uppercase tracking-widest mt-[-10px]">Press Space to Start</div>
            </div>
          </div>
        </div>
      )}

      {/* POWERUP GUIDE */}
      {isGuideOpen && (
         <div className="absolute inset-0 z-50 bg-slate-900/90 backdrop-blur-lg flex flex-col items-center justify-center p-6 animate-fade-in">
             <div className="w-full max-w-lg h-full max-h-[80vh] flex flex-col">
                <div className="flex justify-between items-center mb-6">
                    <h2 className="text-3xl font-black text-white">POWER-UPS</h2>
                    <button onClick={() => setIsGuideOpen(false)} className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center text-white hover:bg-white/20">✕</button>
                </div>
                
                <div className="flex-1 overflow-y-auto flex flex-col gap-3 no-scrollbar">
                   {POWERUP_INFO.map(p => (
                      <div key={p.type} className="bg-white/5 border border-white/10 rounded-2xl p-4 flex items-center gap-4 hover:bg-white/10 transition-colors">
                          <div className="w-12 h-12 rounded-full shadow-lg flex-shrink-0" style={{ backgroundColor: p.color }}></div>
                          <div className="flex-1">
                             <h3 className="text-xl font-bold text-white mb-1">{p.name}</h3>
                             <p className="text-sm text-slate-300 leading-tight">{p.desc}</p>
                          </div>
                          <button 
                             onClick={() => startGame(p.type as any)}
                             className="px-4 py-2 bg-white/20 hover:bg-white/30 rounded-full text-xs font-bold text-white tracking-wide border border-white/20 transition-all active:scale-95"
                          >
                             TEST
                          </button>
                      </div>
                   ))}
                </div>
                <div className="mt-6 text-center text-white/40 text-sm">
                   Click TEST to start a run with the power-up active!
                </div>
             </div>
         </div>
      )}

      {/* SKIN SHOP */}
      {isShopOpen && (
        <div className="absolute inset-0 z-50 bg-slate-900/90 backdrop-blur-lg flex flex-col items-center justify-center p-6 animate-fade-in">
           <div className="w-full max-w-4xl h-full flex flex-col">
              <div className="flex justify-between items-center mb-8">
                  <h2 className="text-4xl font-black text-white">SKIN SHOP</h2>
                  <button onClick={() => setIsShopOpen(false)} className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center text-white hover:bg-white/20">✕</button>
              </div>

              <div className="flex-1 overflow-y-auto grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 pb-8 no-scrollbar">
                 {Object.values(SKINS).map((skin) => {
                     const isUnlocked = unlockedSkins.includes(skin.id);
                     const isEquipped = currentSkinId === skin.id;

                     return (
                         <div key={skin.id} 
                              onClick={() => isUnlocked && handleEquipSkin(skin.id)}
                              className={`relative p-4 rounded-2xl border transition-all cursor-pointer group
                                ${isEquipped ? 'bg-amber-500/20 border-amber-500' : 'bg-white/5 border-white/10 hover:border-white/30'}
                                ${!isUnlocked && 'opacity-60 grayscale'}
                              `}
                         >
                             <div className="flex justify-between items-start mb-2">
                                <span className={`text-xs font-bold px-2 py-1 rounded uppercase
                                    ${skin.rarity === 'Legendary' ? 'bg-yellow-500 text-black' : 
                                      skin.rarity === 'Epic' ? 'bg-purple-500 text-white' :
                                      skin.rarity === 'Rare' ? 'bg-blue-500 text-white' : 'bg-slate-600 text-slate-200'}
                                `}>{skin.rarity}</span>
                                {isEquipped && <span className="text-xs text-amber-400 font-bold">EQUIPPED</span>}
                             </div>
                             
                             <div className="h-24 flex items-center justify-center mb-2">
                                 {/* Minimal CSS representation of skin */}
                                 <div className="w-12 h-12 rounded-full shadow-lg relative" style={{ backgroundColor: '#' + skin.colors.body.toString(16) }}>
                                     <div className="absolute right-[-4px] top-[14px] w-6 h-4 rounded-full bg-white"></div>
                                     <div className="absolute right-[-8px] top-[18px] w-4 h-3 bg-orange-500" style={{ backgroundColor: '#' + skin.colors.beak.toString(16) }}></div>
                                 </div>
                             </div>

                             <h3 className="text-lg font-bold text-white mb-1">{skin.name}</h3>
                             <div className="text-xs text-slate-400">{isUnlocked ? 'Tap to Equip' : skin.unlockCondition.description}</div>
                             
                             {!isUnlocked && (
                                 <div className="absolute inset-0 bg-black/40 flex items-center justify-center rounded-2xl backdrop-blur-[1px]">
                                     <span className="text-2xl">🔒</span>
                                 </div>
                             )}
                         </div>
                     );
                 })}
              </div>
           </div>
        </div>
      )}

      {/* Game Over Screen */}
      {gameState === GameState.GAME_OVER && !isShopOpen && !isGuideOpen && (
        <div className="absolute inset-0 flex items-center justify-center z-20 bg-slate-900/60 backdrop-blur-md">
          <div className="glass-panel p-8 rounded-3xl text-center w-full max-w-xs mx-4 shadow-2xl border border-white/10 relative">
            <h2 className={`text-4xl font-bold text-white mb-6 tracking-wide`}>GAME OVER</h2>

            <div className="flex flex-col gap-4 mb-8">
                <div className={`p-4 rounded-2xl border transition-all duration-500 ${isNewHighScore ? 'bg-yellow-400/20 border-yellow-400/50 shadow-[0_0_30px_rgba(251,191,36,0.3)]' : 'bg-white/10 border-white/5'}`}>
                    <div className={`text-sm uppercase tracking-wider text-xs ${isNewHighScore ? 'text-yellow-200' : 'text-slate-300'}`}>Score</div>
                    <div className={`text-5xl font-bold ${isNewHighScore ? 'text-yellow-400' : 'text-amber-400'}`}>{score}</div>
                </div>
                <div className="p-3 bg-white/5 rounded-xl border border-white/5 flex justify-center px-6">
                    <div className="text-center">
                        <div className="text-xs uppercase tracking-wider text-slate-400">Best</div>
                        <div className="text-xl font-bold text-white">{highScore}</div>
                    </div>
                </div>
            </div>

            <div className="flex flex-col gap-3">
              <Button onClick={() => startGame(initialPowerup)}>TRY AGAIN</Button>
              <Button onClick={resetGame} variant="secondary">HOME</Button>
            </div>
            <div className="text-white/30 text-xs mt-4">Press Space to Restart</div>
          </div>
        </div>
      )}
    </div>
  );
};

export default App;
