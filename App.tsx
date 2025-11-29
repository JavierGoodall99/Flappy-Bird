
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { GameEngine } from './components/GameEngine';
import { Button } from './components/Button';
import { GameState, ActivePowerup, SkinId, Skin, PowerupType, GameMode } from './types';
import { SKINS, POWERUP_INFO, WEAPON_LOADOUTS } from './constants';
import { audioService } from './services/audioService';
import { signIn, signInWithGoogle, logout, subscribeToAuth, syncUserData, saveGameData } from './services/firebase';

const App: React.FC = () => {
  const [gameState, setGameState] = useState<GameState>(GameState.START);
  const [score, setScore] = useState(0);
  
  // Separate highscores for different modes
  const [highScores, setHighScores] = useState<Record<GameMode, number>>({ 
      standard: 0, 
      battle: 0,
      danger: 0,
      playground: 0
  });
  
  // Player Stats
  const [stats, setStats] = useState({ gamesPlayed: 0, totalScore: 0 });
  
  const [isNewHighScore, setIsNewHighScore] = useState(false);
  
  const [shake, setShake] = useState(false);
  const [activePowerup, setActivePowerup] = useState<ActivePowerup | null>(null);
  const [isMuted, setIsMuted] = useState(false);
  
  // Game Mode
  const [gameMode, setGameMode] = useState<GameMode>('standard');
  const [bossInfo, setBossInfo] = useState<{ active: boolean; hp: number; maxHp: number }>({ active: false, hp: 0, maxHp: 0 });
  const [playerHealth, setPlayerHealth] = useState({ current: 0, max: 0 });

  // Cosmetics State
  const [currentSkinId, setCurrentSkinId] = useState<SkinId>('default');
  const [unlockedSkins, setUnlockedSkins] = useState<SkinId[]>(['default']);
  const [isShopOpen, setIsShopOpen] = useState(false);
  const [isGuideOpen, setIsGuideOpen] = useState(false);
  const [isWeaponSelectOpen, setIsWeaponSelectOpen] = useState(false);

  // Testing State
  const [initialPowerup, setInitialPowerup] = useState<PowerupType | null>(null);

  // User State
  const [user, setUser] = useState<any>(null);
  const isSyncing = useRef(false);

  // 1. INITIAL LOAD (Local Storage)
  useEffect(() => {
    // Load highscores for all modes
    const storedStandard = localStorage.getItem('flapai-highscore-standard') || localStorage.getItem('flapai-highscore');
    const storedBattle = localStorage.getItem('flapai-highscore-battle');
    const storedDanger = localStorage.getItem('flapai-highscore-danger');
    
    setHighScores({
        standard: storedStandard ? parseInt(storedStandard, 10) : 0,
        battle: storedBattle ? parseInt(storedBattle, 10) : 0,
        danger: storedDanger ? parseInt(storedDanger, 10) : 0,
        playground: 0
    });
    
    // Load Stats
    const storedStats = localStorage.getItem('flapai-stats');
    if (storedStats) {
        setStats(JSON.parse(storedStats));
    }
    
    // Force unlock all default skins for existing users
    const allDefaultSkins = Object.values(SKINS)
        .filter(s => s.unlockCondition.type === 'default')
        .map(s => s.id);
    
    const storedSkins = localStorage.getItem('flapai-unlockedskins');
    let currentUnlocked = storedSkins ? JSON.parse(storedSkins) : [];
    
    // Merge defaults
    const merged = [...new Set([...currentUnlocked, ...allDefaultSkins])];
    setUnlockedSkins(merged);
    localStorage.setItem('flapai-unlockedskins', JSON.stringify(merged));

    const storedCurrentSkin = localStorage.getItem('flapai-currentskin');
    if (storedCurrentSkin && SKINS[storedCurrentSkin]) setCurrentSkinId(storedCurrentSkin as SkinId);

    // Load Mute State
    const storedMute = localStorage.getItem('flapai-muted');
    if (storedMute === 'true') {
        setIsMuted(true);
        audioService.setMuted(true);
    }
  }, []);

  // 2. FIREBASE AUTH & SYNC FLOW
  useEffect(() => {
    const handleAuthChange = async (authUser: any) => {
        if (authUser) {
            setUser(authUser);
            // Prepare local data for sync (User's current device state)
            const localData = {
                highScores: {
                    standard: parseInt(localStorage.getItem('flapai-highscore-standard') || '0', 10),
                    battle: parseInt(localStorage.getItem('flapai-highscore-battle') || '0', 10),
                    danger: parseInt(localStorage.getItem('flapai-highscore-danger') || '0', 10),
                },
                unlockedSkins: JSON.parse(localStorage.getItem('flapai-unlockedskins') || '[]'),
                currentSkinId: localStorage.getItem('flapai-currentskin') || 'default',
                muted: localStorage.getItem('flapai-muted') === 'true',
                stats: JSON.parse(localStorage.getItem('flapai-stats') || '{"gamesPlayed": 0, "totalScore": 0}')
            };

            // Prepare User Identity Data
            const userProfile = {
                displayName: authUser.displayName,
                email: authUser.email,
                photoURL: authUser.photoURL
            };

            // Sync with Cloud
            const cloudData = await syncUserData(authUser.uid, localData, userProfile);
            
            // Apply Cloud Data (Remote Wins or Merged)
            if (cloudData) {
                isSyncing.current = true; // Prevent triggering save effects during load
                
                if (cloudData.highScores) setHighScores(prev => ({ ...prev, ...cloudData.highScores }));
                if (cloudData.unlockedSkins) setUnlockedSkins(cloudData.unlockedSkins);
                if (cloudData.currentSkinId) setCurrentSkinId(cloudData.currentSkinId as SkinId);
                if (cloudData.stats) setStats(cloudData.stats);
                if (cloudData.muted !== undefined) {
                    setIsMuted(cloudData.muted);
                    audioService.setMuted(cloudData.muted);
                }

                // Update Local Storage to match Cloud (Keep them in sync)
                localStorage.setItem('flapai-highscore-standard', (cloudData.highScores?.standard || 0).toString());
                localStorage.setItem('flapai-highscore-battle', (cloudData.highScores?.battle || 0).toString());
                localStorage.setItem('flapai-highscore-danger', (cloudData.highScores?.danger || 0).toString());
                localStorage.setItem('flapai-unlockedskins', JSON.stringify(cloudData.unlockedSkins || []));
                localStorage.setItem('flapai-currentskin', cloudData.currentSkinId || 'default');
                localStorage.setItem('flapai-muted', String(cloudData.muted));
                localStorage.setItem('flapai-stats', JSON.stringify(cloudData.stats || {gamesPlayed: 0, totalScore: 0}));

                setTimeout(() => { isSyncing.current = false; }, 100);
            }
        } else {
            setUser(null);
            // If not logged in, try anonymous login for Guest Mode
            signIn(); 
        }
    };

    const unsubscribe = subscribeToAuth(handleAuthChange);
    return () => unsubscribe();
  }, []);

  // 3. PERSISTENCE EFFECTS (Save when state changes)

  // Save High Scores
  useEffect(() => {
      if (isSyncing.current) return;
      if (user) {
          saveGameData(user.uid, { highScores });
      }
  }, [highScores, user]);

  // Save Stats
  useEffect(() => {
      if (isSyncing.current) return;
      if (user) {
          saveGameData(user.uid, { stats });
      }
  }, [stats, user]);

  // Save Skins
  useEffect(() => {
      if (isSyncing.current) return;
      if (user) {
          saveGameData(user.uid, { unlockedSkins });
      }
  }, [unlockedSkins, user]);

  // Save Current Skin
  useEffect(() => {
      if (isSyncing.current) return;
      if (user) {
          saveGameData(user.uid, { currentSkinId });
      }
  }, [currentSkinId, user]);

  // Save Settings
  useEffect(() => {
      if (isSyncing.current) return;
      if (user) {
          saveGameData(user.uid, { muted: isMuted });
      }
  }, [isMuted, user]);


  useEffect(() => {
    if (gameState === GameState.GAME_OVER) {
      // Update Stats
      if (gameMode !== 'playground') {
           setStats(prev => {
               const newStats = {
                   gamesPlayed: prev.gamesPlayed + 1,
                   totalScore: prev.totalScore + score
               };
               localStorage.setItem('flapai-stats', JSON.stringify(newStats));
               return newStats;
           });
      }

      // Only check and update high scores if NOT in playground mode
      if (gameMode !== 'playground') {
        const currentHigh = highScores[gameMode];
        
        if (score > currentHigh) {
          // Update state
          setHighScores(prev => ({
              ...prev,
              [gameMode]: score
          }));
          
          // Update Local Storage
          localStorage.setItem(`flapai-highscore-${gameMode}`, score.toString());
          
          // Maintain legacy key for standard mode
          if (gameMode === 'standard') {
              localStorage.setItem('flapai-highscore', score.toString());
          }

          setIsNewHighScore(true);
        }
      }
      setBossInfo({ active: false, hp: 0, maxHp: 0 });
    }
  }, [gameState, score, highScores, gameMode]);

  const startGame = useCallback((forcedPowerup: PowerupType | null = null, mode: GameMode = 'standard') => {
    audioService.init();
    setGameMode(mode);
    setInitialPowerup(forcedPowerup);
    setGameState(GameState.PLAYING);
    setIsNewHighScore(false);
    setIsGuideOpen(false);
    setIsWeaponSelectOpen(false);
    setBossInfo({ active: false, hp: 0, maxHp: 0 });
    setPlayerHealth({ current: 1, max: 1 });
  }, []);

  const resetGame = () => {
    setGameState(GameState.START);
    setIsNewHighScore(false);
    setInitialPowerup(null);
    setBossInfo({ active: false, hp: 0, maxHp: 0 });
  };
  
  const togglePause = useCallback(() => {
    setGameState(prev => {
      if (prev === GameState.PLAYING) return GameState.PAUSED;
      if (prev === GameState.PAUSED) return GameState.PLAYING;
      return prev;
    });
  }, []);

  const toggleMute = (e: React.MouseEvent) => {
      e.stopPropagation();
      const newState = !isMuted;
      setIsMuted(newState);
      audioService.setMuted(newState);
      localStorage.setItem('flapai-muted', String(newState));
  };

  const triggerShake = () => {
    setShake(true);
    setTimeout(() => setShake(false), 300);
  };

  const handleEquipSkin = (id: SkinId) => {
      setCurrentSkinId(id);
      localStorage.setItem('flapai-currentskin', id);
  };
  
  const handleGoogleSignIn = () => {
      signInWithGoogle();
  };
  
  const handleLogout = () => {
      logout();
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (isShopOpen || isGuideOpen || isWeaponSelectOpen) return; // Disable game controls in menus
      if (e.code === 'Escape' || e.code === 'KeyP') togglePause();
      if (e.code === 'KeyM') toggleMute({ stopPropagation: () => {} } as React.MouseEvent);
      if (e.code === 'Space') {
        e.preventDefault(); 
        if (gameState === GameState.PAUSED) togglePause();
        // Pass initialPowerup to persist test mode if active
        else if (gameState === GameState.START || gameState === GameState.GAME_OVER) startGame(initialPowerup, gameMode);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('mousedown', handleTouchOrClick);
    window.addEventListener('touchstart', handleTouchOrClick, { passive: false });
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('mousedown', handleTouchOrClick);
      window.removeEventListener('touchstart', handleTouchOrClick);
    };
  }, [togglePause, gameState, startGame, isShopOpen, isGuideOpen, isWeaponSelectOpen, initialPowerup, gameMode, isMuted]);
  
  // Dummy handler to prevent errors in cleanup
  const handleTouchOrClick = () => {};

  const getPowerupName = (p: ActivePowerup) => {
      if (p.type === 'slowmo') return 'TIME WARP';
      if (p.type === 'shield') return 'SHIELD ACTIVE';
      if (p.type === 'ghost') return 'GHOST MODE';
      if (p.type === 'shrink') return 'TINY BIRD';
      if (p.type === 'fast') return 'TURBO BOOST';
      if (p.type === 'grow') return 'GIANT BIRD';
      
      // Weapon Names
      if (p.type === 'gun') return 'BLASTER';
      if (p.type === 'gun_spread') return 'TRI-SHOT';
      if (p.type === 'gun_rapid') return 'VULCAN';
      if (p.type.startsWith('weapon_')) {
          const w = WEAPON_LOADOUTS.find(l => l.id === p.type);
          return w ? w.name.toUpperCase() : 'WEAPON';
      }
      
      return 'POWER UP';
  };

  // Dynamic Health Bar Logic
  const healthPercent = playerHealth.current / Math.max(1, playerHealth.max);
  // Adjusted thresholds for 3 HP: 3=1.0(Green), 2=0.66(Green), 1=0.33(Red)
  const healthColor = healthPercent > 0.7 ? 'from-green-600 to-green-400' : 
                      healthPercent > 0.4 ? 'from-yellow-500 to-amber-500' : 'from-red-600 to-red-500';
  const healthShadow = healthPercent > 0.7 ? 'shadow-[0_0_8px_rgba(74,222,128,0.5)]' : 
                       healthPercent > 0.4 ? 'shadow-[0_0_8px_rgba(245,158,11,0.5)]' : 'shadow-[0_0_8px_rgba(239,68,68,0.5)]';

  return (
    <div className={`relative w-full h-screen overflow-hidden ${shake ? 'animate-pulse' : ''}`}>
      {/* Game Layer */}
      <div className="absolute inset-0 z-0">
        <GameEngine 
          gameState={gameState} 
          setGameState={setGameState} 
          setScore={setScore}
          triggerEffect={triggerShake}
          highScore={highScores[gameMode]}
          setActivePowerup={setActivePowerup}
          currentSkin={SKINS[currentSkinId]}
          initialPowerup={initialPowerup}
          gameMode={gameMode}
          setBossActive={(active, hp, maxHp) => setBossInfo({ active, hp, maxHp })}
          setPlayerHealth={(current, max) => setPlayerHealth({ current, max })}
        />
      </div>

      {/* MUTE BUTTON - Always Visible (except deep menus maybe) */}
      {!isShopOpen && !isGuideOpen && !isWeaponSelectOpen && (
          <button 
            onClick={toggleMute}
            className="absolute top-6 left-6 md:top-8 md:left-8 z-30 w-10 h-10 md:w-12 md:h-12 bg-white/20 backdrop-blur-md border border-white/30 rounded-full flex items-center justify-center hover:bg-white/30 transition-all active:scale-95 group"
          >
             {isMuted ? (
                 <span className="text-xl md:text-2xl text-white">🔇</span>
             ) : (
                 <span className="text-xl md:text-2xl text-white">🔊</span>
             )}
          </button>
      )}

      {/* USER PROFILE / AUTH - TOP RIGHT on START SCREEN */}
      {gameState === GameState.START && !isShopOpen && !isGuideOpen && !isWeaponSelectOpen && (
          <div className="absolute top-6 right-6 md:top-8 md:right-8 z-30 flex flex-col items-end gap-2 animate-fade-in">
              {user && !user.isAnonymous ? (
                  <div className="flex items-center gap-2 bg-slate-900/80 backdrop-blur-md border border-white/20 rounded-full pl-1 pr-4 py-1 shadow-lg">
                      <div className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-xs font-bold text-white overflow-hidden border border-white/30">
                          {user.photoURL ? (
                              <img src={user.photoURL} alt="User" className="w-full h-full object-cover" />
                          ) : (
                              <span>{user.displayName ? user.displayName.charAt(0).toUpperCase() : 'U'}</span>
                          )}
                      </div>
                      <div className="flex flex-col">
                           <span className="text-xs font-bold text-white leading-tight max-w-[100px] truncate">
                               {user.displayName || 'Player'}
                           </span>
                           <button 
                              onClick={handleLogout}
                              className="text-[10px] text-red-400 hover:text-red-300 font-bold uppercase tracking-wide text-left"
                           >
                              Log Out
                           </button>
                      </div>
                  </div>
              ) : (
                  <button 
                      onClick={handleGoogleSignIn}
                      className="px-4 py-2 bg-white/10 hover:bg-white/20 backdrop-blur-md border border-white/20 rounded-full text-white text-xs font-bold tracking-wide flex items-center gap-2 transition-all shadow-lg active:scale-95 group"
                  >
                      <span className="group-hover:scale-110 transition-transform">👤</span>
                      <span>SIGN IN</span>
                  </button>
              )}
          </div>
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

      {/* Powerup HUD - Hidden in Battle Mode */}
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

      {/* HUD Score */}
      {(gameState === GameState.PLAYING || gameState === GameState.PAUSED) && (
        <div className="absolute top-6 md:top-10 left-0 right-0 text-center z-10 pointer-events-none flex flex-col items-center">
          <span className={`text-5xl md:text-6xl font-black drop-shadow-lg select-none font-['Outfit'] transition-all text-white leading-none`}>
            {score}
          </span>
          
          {/* Previous Best Score Display */}
          {gameMode !== 'playground' && (
             <div className="text-white/50 font-bold text-xs md:text-sm tracking-widest uppercase drop-shadow-sm mt-1">
                 Best {highScores[gameMode]}
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
      
      {/* Pause Button */}
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

      {/* Pause Menu */}
      {gameState === GameState.PAUSED && (
        <div className="absolute inset-0 flex items-center justify-center z-40 bg-slate-900/40 backdrop-blur-md">
          <div className="glass-panel p-6 md:p-8 rounded-3xl text-center min-w-[300px] md:min-w-[320px] shadow-2xl border border-white/10 max-h-[90vh] overflow-y-auto no-scrollbar mx-4">
             <h2 className="text-3xl md:text-4xl font-black text-white tracking-wide drop-shadow-sm mb-6 md:mb-8">PAUSED</h2>
             <div className="flex flex-col gap-4">
                <Button onClick={togglePause} className="w-full">RESUME</Button>
                <Button 
                   onClick={(e) => toggleMute(e as any)} 
                   variant="secondary" 
                   className="w-full"
                >
                   <div className="flex items-center justify-center gap-2">
                       <span>{isMuted ? 'UNMUTE SOUND' : 'MUTE SOUND'}</span>
                       <span className="text-xl">{isMuted ? '🔇' : '🔊'}</span>
                   </div>
                </Button>
                <Button onClick={resetGame} variant="secondary" className="w-full">QUIT</Button>
             </div>
          </div>
        </div>
      )}

      {/* Start Screen */}
      {gameState === GameState.START && !isShopOpen && !isGuideOpen && !isWeaponSelectOpen && (
        <div className="absolute inset-0 flex items-center justify-center z-20 bg-black/20 backdrop-blur-sm">
          <div className="glass-panel p-6 md:p-10 rounded-3xl text-center w-full max-w-md mx-4 shadow-2xl transform transition-all animate-fade-in-up max-h-[90vh] overflow-y-auto no-scrollbar">
            <h1 className="text-5xl md:text-7xl font-black text-white mb-2 drop-shadow-xl tracking-tighter italic transform -rotate-2">
              Fliply
            </h1>
            <div className="text-amber-400 font-bold tracking-widest uppercase mb-4 md:mb-8 text-sm">Arcade Edition</div>
            
            <div className="flex flex-col gap-3 md:gap-4 mb-4 md:mb-6">
                <Button onClick={() => startGame(null, 'standard')} className="w-full text-lg md:text-xl py-3 md:py-4 shadow-xl">PLAY CLASSIC</Button>
                
                <button 
                  onClick={() => setIsWeaponSelectOpen(true)}
                  className="w-full py-3 md:py-4 rounded-full font-bold text-base md:text-lg text-white bg-gradient-to-r from-red-600 to-rose-600 border-b-4 border-red-800 active:scale-95 shadow-lg hover:brightness-110 transition-all flex items-center justify-center gap-2"
                >
                  <span>⚔️</span> BATTLE MODE
                </button>
            </div>

            <div className="flex gap-3 md:gap-4 w-full">
              <button 
                onClick={() => setIsShopOpen(true)}
                className="flex-1 py-3 md:py-4 rounded-2xl font-bold text-base tracking-wide bg-white/5 text-white border border-white/10 hover:bg-white/15 hover:border-white/30 transition-all flex flex-col items-center justify-center gap-1 group"
              >
                <span className="text-2xl mb-1 group-hover:scale-110 transition-transform">🎨</span> 
                SKINS
              </button>
              <button 
                onClick={() => setIsGuideOpen(true)}
                className="flex-1 py-3 md:py-4 rounded-2xl font-bold text-base tracking-wide bg-white/5 text-white border border-white/10 hover:bg-white/15 hover:border-white/30 transition-all flex flex-col items-center justify-center gap-1 group"
              >
                <span className="text-2xl mb-1 group-hover:scale-110 transition-transform">⚡</span> 
                POWERS
              </button>
            </div>
            <div className="text-white/30 text-xs uppercase tracking-widest mt-4 md:mt-6">Press Space to Start</div>
          </div>
        </div>
      )}

      {/* WEAPON SELECTOR */}
      {isWeaponSelectOpen && (
          <div className="absolute inset-0 z-50 bg-slate-900/90 backdrop-blur-lg flex flex-col items-center justify-center p-4 md:p-6 animate-fade-in">
              <div className="w-full max-w-5xl h-full flex flex-col relative">
                  <div className="flex justify-between items-center mb-6 flex-shrink-0 px-2">
                     <h2 className="text-2xl md:text-4xl font-black text-white italic tracking-tighter">CHOOSE YOUR WEAPON</h2>
                     <button onClick={() => setIsWeaponSelectOpen(false)} className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center text-white hover:bg-white/20 transition-colors">✕</button>
                  </div>
                  
                  <div className="flex-1 overflow-y-auto no-scrollbar w-full">
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6 pb-20 px-2">
                          {WEAPON_LOADOUTS.map((weapon) => (
                              <div 
                                 key={weapon.id}
                                 onClick={() => startGame(weapon.id as any, 'battle')}
                                 className="bg-white/5 hover:bg-white/10 border border-white/10 hover:border-white/30 rounded-3xl p-6 cursor-pointer transition-all hover:-translate-y-2 group flex flex-col h-full"
                              >
                                 <div className="flex items-center gap-4 mb-4">
                                     <div 
                                        className="w-16 h-16 rounded-2xl shadow-lg flex-shrink-0 flex items-center justify-center text-3xl transition-transform group-hover:scale-110"
                                        style={{ backgroundColor: weapon.color }}
                                     >
                                        {weapon.id === 'gun' ? '🔫' : weapon.id.includes('gun') ? '🦅' : '⚔️'}
                                     </div>
                                     <h3 className="text-2xl font-bold text-white leading-none">{weapon.name}</h3>
                                 </div>
                                 
                                 <p className="text-sm text-slate-300 mb-4 flex-grow">{weapon.description}</p>
                                 
                                 <div className="bg-black/20 rounded-xl p-3 mb-4">
                                     <div className="text-xs font-mono text-white/70 whitespace-pre-wrap">{weapon.stats}</div>
                                 </div>

                                 <div className="w-full py-3 bg-white/10 rounded-xl text-center font-bold text-sm tracking-widest text-white group-hover:bg-white/20 transition-colors uppercase">
                                     Select
                                 </div>
                              </div>
                          ))}
                      </div>
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
                             onClick={() => startGame(p.type as any, 'playground')}
                             className="px-4 py-2 bg-white/20 hover:bg-white/30 rounded-full text-xs font-bold text-white tracking-wide border border-white/20 transition-all active:scale-95"
                          >
                             TRY OUT
                          </button>
                      </div>
                   ))}
                </div>
                <div className="mt-6 text-center text-white/40 text-sm">
                   Click TRY OUT to start a run with the power-up active!
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
                  <div className="flex items-center gap-4">
                      {/* Stats Display in Shop */}
                      <div className="bg-black/30 px-4 py-1.5 rounded-full flex gap-4 text-xs font-bold border border-white/10">
                          <div className="text-slate-300">GAMES: <span className="text-white">{stats.gamesPlayed}</span></div>
                          <div className="text-slate-300">LIFETIME SCORE: <span className="text-amber-400">{stats.totalScore}</span></div>
                      </div>
                      <button onClick={() => setIsShopOpen(false)} className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center text-white hover:bg-white/20">✕</button>
                  </div>
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
      {gameState === GameState.GAME_OVER && !isShopOpen && !isGuideOpen && !isWeaponSelectOpen && (
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
                          <div className="text-xl font-bold text-white">{highScores[gameMode]}</div>
                      </div>
                  </div>
                )}
            </div>

            <div className="flex flex-col gap-3">
              <Button onClick={() => startGame(initialPowerup, gameMode)}>TRY AGAIN</Button>
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
