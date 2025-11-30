
import React, { useState, useEffect, useCallback } from 'react';
import { GameEngine } from './components/GameEngine';
import { CityBackground, Ground } from './components/CityBackground';
import { GameState, ActivePowerup, SkinId, PowerupType, GameMode } from './types';
import { SKINS, ECONOMY } from './constants';
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
import { StreakModal } from './components/menus/StreakModal';
import { TutorialModal } from './components/menus/TutorialModal';

const App: React.FC = () => {
  // --- Game Local State ---
  const [gameState, setGameState] = useState<GameState>(GameState.START);
  const [score, setScore] = useState(0);
  const [runCoins, setRunCoins] = useState(0); // Coins collected in current run
  const [shake, setShake] = useState(false);
  const [activePowerup, setActivePowerup] = useState<ActivePowerup | null>(null);
  
  const [gameMode, setGameMode] = useState<GameMode>('standard');
  const [bossInfo, setBossInfo] = useState<{ active: boolean; hp: number; maxHp: number }>({ active: false, hp: 0, maxHp: 0 });
  const [playerHealth, setPlayerHealth] = useState({ current: 0, max: 0 });
  const [initialPowerup, setInitialPowerup] = useState<PowerupType | null>(null);
  const [reviveTrigger, setReviveTrigger] = useState(0);

  // --- Persistent Data & Auth (Hook) ---
  const { 
      user, isLoading, highScores, stats, unlockedSkins, purchasedItems, currentSkinId, coins, isMuted,
      setIsMuted, setCurrentSkinId, processGameEnd, updateProfile, streak, longestStreak, loginHistory, purchaseItem, spendCoins,
      tutorialSeen, markTutorialSeen, battleTutorialSeen, markBattleTutorialSeen
  } = useGameData();

  const [isNewHighScore, setIsNewHighScore] = useState(false);

  // --- Modal States ---
  const [isShopOpen, setIsShopOpen] = useState(false);
  const [isGuideOpen, setIsGuideOpen] = useState(false);
  const [isWeaponSelectOpen, setIsWeaponSelectOpen] = useState(false);
  const [isLeaderboardOpen, setIsLeaderboardOpen] = useState(false);
  const [isProfileEditOpen, setIsProfileEditOpen] = useState(false);
  const [isStreakModalOpen, setIsStreakModalOpen] = useState(false);
  
  // --- Tutorial State ---
  const [isTutorialOpen, setIsTutorialOpen] = useState(false);
  const [tutorialMode, setTutorialMode] = useState<'standard' | 'battle'>('standard');
  const [pendingGameStart, setPendingGameStart] = useState<{powerup: PowerupType | null, mode: GameMode} | null>(null);
  
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
      const isRecord = processGameEnd(score, runCoins, gameMode, (skinName) => {
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

  // Actual Game Launch Logic
  const launchGame = useCallback((forcedPowerup: PowerupType | null = null, mode: GameMode = 'standard') => {
    audioService.init();
    setGameMode(mode);
    setInitialPowerup(forcedPowerup);
    setGameState(GameState.PLAYING);
    setIsNewHighScore(false);
    setRunCoins(0);
    setReviveTrigger(0); // Reset revive trigger for new game
    
    // Close menus
    setIsGuideOpen(false);
    setIsWeaponSelectOpen(false);
    setIsLeaderboardOpen(false);
    setIsProfileEditOpen(false);
    setIsShopOpen(false);
    setIsStreakModalOpen(false);
    setIsTutorialOpen(false); // Ensure tutorial is closed
    
    setBossInfo({ active: false, hp: 0, maxHp: 0 });
    setPlayerHealth({ current: 1, max: 1 });
  }, []);

  // Wrapper to intercept for Tutorial
  const startGame = useCallback((forcedPowerup: PowerupType | null = null, mode: GameMode = 'standard') => {
    // Check if user has seen tutorial using persistent DB state
    if (mode === 'standard' && !tutorialSeen) {
        setPendingGameStart({ powerup: forcedPowerup, mode });
        setTutorialMode('standard');
        setIsTutorialOpen(true);
    } else {
        launchGame(forcedPowerup, mode);
    }
  }, [tutorialSeen, launchGame]);

  // Logic to handle battle mode click (checks tutorial first)
  const handleBattleModeInit = useCallback(() => {
      if (!battleTutorialSeen) {
          setTutorialMode('battle');
          setIsTutorialOpen(true);
      } else {
          setIsWeaponSelectOpen(true);
      }
  }, [battleTutorialSeen]);
  
  const handleTutorialComplete = () => {
      setIsTutorialOpen(false);
      
      if (tutorialMode === 'standard') {
          markTutorialSeen(); // Updates state and saves to DB
          if (pendingGameStart) {
              launchGame(pendingGameStart.powerup, pendingGameStart.mode);
              setPendingGameStart(null);
          } else {
              launchGame(null, 'standard');
          }
      } else if (tutorialMode === 'battle') {
          markBattleTutorialSeen();
          // After battle tutorial, open loadout
          setIsWeaponSelectOpen(true);
      }
  };

  const resetGame = () => {
    setGameState(GameState.START);
    setIsNewHighScore(false);
    setInitialPowerup(null);
    setRunCoins(0);
    setReviveTrigger(0); // Reset revive trigger
    setBossInfo({ active: false, hp: 0, maxHp: 0 });
  };
  
  const handleRevive = () => {
      if (spendCoins(ECONOMY.REVIVE_COST)) {
          setReviveTrigger(prev => prev + 1);
          setGameState(GameState.PLAYING); // Force state back to playing
      }
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
  
  const handleCoinCollected = (total: number) => {
      setRunCoins(total);
  };
  
  const handleEquipSkin = (id: string) => {
      // Check if needs purchase
      const skin = SKINS[id];
      if (purchasedItems.includes(id) || unlockedSkins.includes(id) || skin.price === 0) {
          setCurrentSkinId(id as SkinId);
      } else {
          // Attempt Purchase
          if (purchaseItem(id, skin.price || 0)) {
              showNotification(`Purchased ${skin.name}!`, 'unlock');
              setCurrentSkinId(id as SkinId);
          } else {
              showNotification("Not enough coins!", 'info');
          }
      }
  };
  
  const handleEquipWeapon = (id: string) => {
       startGame(id as PowerupType, 'battle');
  };

  // Global Key Handling
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (isLoading) return;
      if (isShopOpen || isGuideOpen || isWeaponSelectOpen || isLeaderboardOpen || isProfileEditOpen || isStreakModalOpen || isTutorialOpen) return;
      
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
  }, [togglePause, gameState, startGame, isShopOpen, isGuideOpen, isWeaponSelectOpen, isLeaderboardOpen, isProfileEditOpen, isStreakModalOpen, isTutorialOpen, initialPowerup, gameMode, isMuted, isLoading]);

  if (isLoading) return <LoadingScreen />;

  const isMenuOpen = isShopOpen || isGuideOpen || isWeaponSelectOpen || isLeaderboardOpen || isProfileEditOpen || isStreakModalOpen || isTutorialOpen;

  return (
    <div className={`relative w-full h-[100dvh] overflow-hidden ${shake ? 'animate-pulse' : ''}`}>
      
      {/* Background Layer */}
      <CityBackground />

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
          onCoinCollected={handleCoinCollected}
          reviveTrigger={reviveTrigger}
        />
      </div>

      {/* Ground Layer - Foreground */}
      <Ground />

      <NotificationToast notification={notification} />

      {/* Heads Up Display */}
      {!isMenuOpen && (
          <HUD 
             gameState={gameState}
             score={score}
             runCoins={runCoins}
             totalCoins={coins}
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
             setWeaponSelectOpen={handleBattleModeInit} 
             setProfileOpen={setIsProfileEditOpen}
             setStreakModalOpen={setIsStreakModalOpen}
             user={user}
             handleGoogleSignIn={handleGoogleSignIn}
             streak={streak}
             coins={coins}
             stats={stats}
          />
      )}

      {gameState === GameState.GAME_OVER && !isMenuOpen && (
          <GameOverMenu 
              score={score}
              runCoins={runCoins}
              totalCoins={coins}
              highScore={highScores[gameMode]}
              isNewHighScore={isNewHighScore}
              gameMode={gameMode}
              initialPowerup={initialPowerup}
              onRestart={(powerup, mode) => launchGame(powerup, mode)}
              onHome={resetGame}
              onRevive={handleRevive}
              canRevive={coins >= ECONOMY.REVIVE_COST}
          />
      )}

      {/* Content Modals */}
      <TutorialModal 
          isOpen={isTutorialOpen} 
          onClose={handleTutorialComplete}
          mode={tutorialMode}
      />

      <ShopModal 
          isOpen={isShopOpen} 
          onClose={() => setIsShopOpen(false)} 
          stats={stats}
          unlockedSkins={unlockedSkins}
          purchasedItems={purchasedItems}
          currentSkinId={currentSkinId}
          onEquip={handleEquipSkin}
          coins={coins}
      />
      
      <LeaderboardModal 
          isOpen={isLeaderboardOpen} 
          onClose={() => setIsLeaderboardOpen(false)} 
          user={user}
      />

      <WeaponSelectorModal 
          isOpen={isWeaponSelectOpen} 
          onClose={() => setIsWeaponSelectOpen(false)} 
          onSelectWeapon={handleEquipWeapon}
          purchasedItems={purchasedItems}
          coins={coins}
          onPurchase={purchaseItem}
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
      
      <StreakModal
          isOpen={isStreakModalOpen}
          onClose={() => setIsStreakModalOpen(false)}
          streak={streak}
          longestStreak={longestStreak}
          loginHistory={loginHistory}
      />
    </div>
  );
};

export default App;
