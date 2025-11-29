import React, { useState, useEffect, useCallback } from 'react';
import { GameEngine } from './components/GameEngine';
import { GameState, ActivePowerup, SkinId, PowerupType, GameMode } from './types';
import { SKINS } from './constants';
import { audioService } from './services/audioService';
import { signInWithGoogle, logout } from './services/firebase';
import { useGameData } from './hooks/useGameData';

// UI Components
import { LoadingScreen } from './components/ui/LoadingScreen';
import { HUD } from './components/ui/HUD';
import { NotificationToast } from './components/ui/NotificationToast';

// Menu Components
import { MainMenu } from './components/menus/MainMenu';
import { GameOverMenu } from './components/menus/GameOverMenu';
import { PauseMenu } from './components/menus/PauseMenu';
import { ShopModal } from './components/menus/ShopModal';
import { LeaderboardModal } from './components/menus/LeaderboardModal';
import { WeaponSelectorModal } from './components/menus/WeaponSelectorModal';
import { GuideModal } from './components/menus/GuideModal';
import { ProfileEditModal } from './components/menus/ProfileEditModal';

const App: React.FC = () => {
  // --- Game Local State ---
  const [gameState, setGameState] = useState<GameState>(GameState.START);
  const [score, setScore] = useState(0);
  const [shake, setShake] = useState(false);
  const [activePowerup, setActivePowerup] = useState<ActivePowerup | null>(null);
  
  const [gameMode, setGameMode] = useState<GameMode>('standard');
  const [bossInfo, setBossInfo] = useState<{ active: boolean; hp: number; maxHp: number }>({ active: false, hp: 0, maxHp: 0 });
  const [playerHealth, setPlayerHealth] = useState({ current: 0, max: 0 });
  const [initialPowerup, setInitialPowerup] = useState<PowerupType | null>(null);

  // --- Persistent Data & Auth (Hook) ---
  const { 
      user, isLoading, highScores, stats, unlockedSkins, currentSkinId, isMuted,
      setIsMuted, setCurrentSkinId, processGameEnd, updateProfile 
  } = useGameData();

  const [isNewHighScore, setIsNewHighScore] = useState(false);

  // --- Modal States ---
  const [isShopOpen, setIsShopOpen] = useState(false);
  const [isGuideOpen, setIsGuideOpen] = useState(false);
  const [isWeaponSelectOpen, setIsWeaponSelectOpen] = useState(false);
  const [isLeaderboardOpen, setIsLeaderboardOpen] = useState(false);
  const [isProfileEditOpen, setIsProfileEditOpen] = useState(false);
  
  // --- Notification System ---
  const [notificationQueue, setNotificationQueue] = useState<Array<{message: string, type: 'unlock' | 'info'}>>([]);
  const [notification, setNotification] = useState<{message: string, type: 'unlock' | 'info'} | null>(null);

  const showNotification = (msg: string, type: 'unlock' | 'info') => {
      setNotificationQueue(prev => [...prev, { message: msg, type }]);
  };

  // Process Notification Queue
  useEffect(() => {
    if (notification) return; // Busy showing one

    if (notificationQueue.length > 0) {
        const next = notificationQueue[0];
        setNotification(next);
        setNotificationQueue(prev => prev.slice(1));
    }
  }, [notification, notificationQueue]);

  // Auto-Dismiss Notification
  useEffect(() => {
      if (notification) {
          const timer = setTimeout(() => {
              setNotification(null);
          }, 3000);
          return () => clearTimeout(timer);
      }
  }, [notification]);

  // --- Actions ---

  const handleGameEnd = () => {
      const isRecord = processGameEnd(score, gameMode, (skinName) => {
          showNotification(`UNLOCKED: ${skinName}`, 'unlock');
      });
      setIsNewHighScore(isRecord);
      setBossInfo({ active: false, hp: 0, maxHp: 0 });
  };

  useEffect(() => {
    if (gameState === GameState.GAME_OVER) {
        handleGameEnd();
    }
  }, [gameState]);

  const startGame = useCallback((forcedPowerup: PowerupType | null = null, mode: GameMode = 'standard') => {
    audioService.init();
    setGameMode(mode);
    setInitialPowerup(forcedPowerup);
    setGameState(GameState.PLAYING);
    setIsNewHighScore(false);
    
    // Close menus
    setIsGuideOpen(false);
    setIsWeaponSelectOpen(false);
    setIsLeaderboardOpen(false);
    setIsProfileEditOpen(false);
    setIsShopOpen(false);
    
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
      setIsMuted(!isMuted);
  };

  const triggerShake = () => {
    setShake(true);
    setTimeout(() => setShake(false), 300);
  };

  const handleGoogleSignIn = async () => {
      await signInWithGoogle();
      setIsProfileEditOpen(false);
      showNotification("Account Linked Successfully!", 'info');
  };

  const handleSaveProfile = async (data: any) => {
      await updateProfile(data);
      showNotification("Profile Updated!", 'info');
  };

  // Global Key Handling
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (isLoading) return;
      if (isShopOpen || isGuideOpen || isWeaponSelectOpen || isLeaderboardOpen || isProfileEditOpen) return;
      
      if (e.code === 'Escape' || e.code === 'KeyP') togglePause();
      if (e.code === 'KeyM') toggleMute({ stopPropagation: () => {} } as React.MouseEvent);
      
      if (e.code === 'Space') {
        e.preventDefault(); 
        if (gameState === GameState.PAUSED) togglePause();
        else if (gameState === GameState.START || gameState === GameState.GAME_OVER) startGame(initialPowerup, gameMode);
      }
    };
    
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [togglePause, gameState, startGame, isShopOpen, isGuideOpen, isWeaponSelectOpen, isLeaderboardOpen, isProfileEditOpen, initialPowerup, gameMode, isMuted, isLoading]);

  if (isLoading) return <LoadingScreen />;

  const isMenuOpen = isShopOpen || isGuideOpen || isWeaponSelectOpen || isLeaderboardOpen || isProfileEditOpen;

  return (
    <div className={`relative w-full h-[100dvh] overflow-hidden ${shake ? 'animate-pulse' : ''}`}>
      {/* Game Engine Layer */}
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

      <NotificationToast notification={notification} />

      {/* Heads Up Display */}
      {!isMenuOpen && (
          <HUD 
             gameState={gameState}
             score={score}
             highScore={highScores[gameMode]}
             gameMode={gameMode}
             activePowerup={activePowerup}
             bossInfo={bossInfo}
             playerHealth={playerHealth}
             isMuted={isMuted}
             toggleMute={toggleMute}
             togglePause={togglePause}
          />
      )}

      {/* Menus & Modals */}
      {gameState === GameState.PAUSED && (
          <PauseMenu 
             onResume={togglePause} 
             onQuit={resetGame} 
             isMuted={isMuted} 
             toggleMute={toggleMute} 
          />
      )}

      {gameState === GameState.START && !isMenuOpen && (
          <MainMenu 
             startGame={startGame}
             setShopOpen={setIsShopOpen}
             setGuideOpen={setIsGuideOpen}
             setLeaderboardOpen={setIsLeaderboardOpen}
             setWeaponSelectOpen={setIsWeaponSelectOpen}
             setProfileOpen={setIsProfileEditOpen}
             user={user}
             handleGoogleSignIn={handleGoogleSignIn}
          />
      )}

      {gameState === GameState.GAME_OVER && !isMenuOpen && (
          <GameOverMenu 
              score={score}
              highScore={highScores[gameMode]}
              isNewHighScore={isNewHighScore}
              gameMode={gameMode}
              initialPowerup={initialPowerup}
              onRestart={startGame}
              onHome={resetGame}
          />
      )}

      {/* Content Modals */}
      <ShopModal 
          isOpen={isShopOpen} 
          onClose={() => setIsShopOpen(false)} 
          stats={stats}
          unlockedSkins={unlockedSkins}
          currentSkinId={currentSkinId}
          onEquip={setCurrentSkinId}
      />
      
      <LeaderboardModal 
          isOpen={isLeaderboardOpen} 
          onClose={() => setIsLeaderboardOpen(false)} 
          user={user}
      />

      <WeaponSelectorModal 
          isOpen={isWeaponSelectOpen} 
          onClose={() => setIsWeaponSelectOpen(false)} 
          onSelectWeapon={(weapon) => startGame(weapon, 'battle')} 
      />

      <GuideModal 
          isOpen={isGuideOpen} 
          onClose={() => setIsGuideOpen(false)} 
          onTryPowerup={(type) => startGame(type, 'playground')} 
      />

      <ProfileEditModal 
          isOpen={isProfileEditOpen} 
          onClose={() => setIsProfileEditOpen(false)} 
          user={user} 
          onSaveName={handleSaveProfile} 
      />
    </div>
  );
};

export default App;