
import { useState, useEffect, useRef } from 'react';
import { subscribeToAuth, loadUserGameData, saveGameData, signIn, updateUserProfile, subscribeToGameData } from '../services/firebase';
import { GameMode, SkinId } from '../types';
import { SKINS, WEAPON_LOADOUTS, ECONOMY, STREAK_REWARDS, WORLDS } from '../constants';
import { audioService } from '../services/audioService';

export interface GameStats {
  gamesPlayed: number;
  totalScore: number;
}

// Helper to safely read from localStorage
const getLocal = <T>(key: string, fallback: T): T => {
    try {
        const item = localStorage.getItem(key);
        return item ? JSON.parse(item) : fallback;
    } catch {
        return fallback;
    }
};

export const useGameData = () => {
  // Initialize state from Local Storage for instant render
  const [highScores, setHighScores] = useState<Record<GameMode, number>>(() => 
      getLocal('fliply_highScores', { standard: 0, battle: 0, danger: 0, playground: 0 })
  );
  const [stats, setStats] = useState<GameStats>(() => 
      getLocal('fliply_stats', { gamesPlayed: 0, totalScore: 0 })
  );
  const [unlockedSkins, setUnlockedSkins] = useState<string[]>(() => 
      getLocal('fliply_unlockedSkins', ['default'])
  );
  const [purchasedItems, setPurchasedItems] = useState<string[]>(() => 
      getLocal('fliply_purchasedItems', ['default'])
  );
  const [currentSkinId, setCurrentSkinId] = useState<SkinId>(() => 
      getLocal('fliply_currentSkinId', 'default')
  );
  const [currentWorldId, setCurrentWorldId] = useState<string>(() => 
      getLocal('fliply_currentWorldId', 'city_day')
  );
  const [coins, setCoins] = useState<number>(() => 
      getLocal('fliply_coins', 0)
  );
  const [isMuted, setIsMuted] = useState(() => 
      getLocal('fliply_muted', false)
  );
  const [streak, setStreak] = useState(() => 
      getLocal('fliply_streak', 0)
  );
  const [longestStreak, setLongestStreak] = useState(() => 
      getLocal('fliply_longestStreak', 0)
  );
  const [loginHistory, setLoginHistory] = useState<string[]>(() => 
      getLocal('fliply_loginHistory', [])
  );
  const [lastLoginDate, setLastLoginDate] = useState(() => 
      getLocal('fliply_lastLoginDate', '')
  );
  const [tutorialSeen, setTutorialSeen] = useState(() => 
      getLocal('fliply_tutorialSeen', false)
  );
  const [battleTutorialSeen, setBattleTutorialSeen] = useState(() => 
      getLocal('fliply_battleTutorialSeen', false)
  );
  
  // Optimistic User Loading
  const [user, setUser] = useState<any>(() => 
      getLocal('fliply_user_cache', null)
  );

  const [isLoading, setIsLoading] = useState(() => {
       return !localStorage.getItem('fliply_user_cache'); 
  });
  
  // Use a ref to track if an update came from the server (to avoid infinite save loops)
  const isRemoteUpdate = useRef(false);
  // Track which UID we have fully loaded data for to prevent overwriting cloud data during user switches
  const loadedUid = useRef<string | null>(null);
  
  // Store the unsubscribe function for the snapshot listener
  const unsubSnapshot = useRef<(() => void) | null>(null);

  // Auth & Load
  useEffect(() => {
    // Ensure audio service matches muted state immediately
    audioService.setMuted(isMuted);

    const handleAuthChange = async (authUser: any) => {
        // Cleanup previous snapshot listener if it exists
        if (unsubSnapshot.current) {
            unsubSnapshot.current();
            unsubSnapshot.current = null;
        }

        if (!authUser) {
             // User is not signed in (Logged out or first visit)
             
             // Clear local user state
             setUser(null);
             loadedUid.current = null;
             localStorage.removeItem('fliply_user_cache');
             
             // Reset game data to defaults (locally only, don't save to cloud yet)
             isRemoteUpdate.current = true; 
             setHighScores({ standard: 0, battle: 0, danger: 0, playground: 0 });
             setStats({ gamesPlayed: 0, totalScore: 0 });
             setUnlockedSkins(['default']);
             setPurchasedItems(['default']);
             setCurrentSkinId('default');
             setCurrentWorldId('city_day');
             setCoins(0);
             setStreak(0);
             setLongestStreak(0);
             setLoginHistory([]);
             setLastLoginDate('');
             setTutorialSeen(false);
             setBattleTutorialSeen(false);
             
             // Automatically sign in anonymously to ensure game functionality
             signIn(); 
             return;
        }

        // We have an authUser (Anonymous or Google)
        const userProfile = {
            displayName: authUser.displayName,
            email: authUser.email,
            photoURL: authUser.photoURL
        };

        // 1. Initial Load to ensure document exists (and create if needed)
        await loadUserGameData(authUser.uid, userProfile);
        
        // 2. Subscribe to real-time updates to handle multiple tabs
        unsubSnapshot.current = subscribeToGameData(authUser.uid, (data) => {
            if (!data) return;
            
            // Mark that we are processing a remote update for this specific UID
            loadedUid.current = authUser.uid;
            isRemoteUpdate.current = true;
            
            setTimeout(() => {
                isRemoteUpdate.current = false;
            }, 300);

            // STREAK & HISTORY LOGIC Calculation
            const today = new Date().toDateString();
            let currentStreak = data.streak || 0;
            let currentLastLogin = data.lastLoginDate || '';
            let currentLongest = data.longestStreak || currentStreak;
            let history = [...(data.loginHistory || [])];
            let newCoins = data.coins || 0;

            // If history is empty but we have streak, init history with today
            if (history.length === 0 && currentStreak > 0) {
                 // Try to backfill simple history if missing
                 history.push(today);
            }

            // If the date stored in cloud is different from today, we need to process streak
            if (currentLastLogin !== today) {
                // It's a new day
                
                // Add to history if not present
                if (!history.includes(today)) {
                    history.push(today);
                    // Keep last 60 days
                    if (history.length > 60) history = history.slice(history.length - 60);
                }

                const yesterday = new Date();
                yesterday.setDate(yesterday.getDate() - 1);
                
                if (currentLastLogin === yesterday.toDateString()) {
                    currentStreak += 1;
                    
                    // REWARD LOGIC
                    const reward = STREAK_REWARDS[currentStreak as keyof typeof STREAK_REWARDS];
                    if (reward) {
                         newCoins += reward.coins;
                    }
                } else {
                    currentStreak = 1;
                }
                
                if (currentStreak > currentLongest) {
                    currentLongest = currentStreak;
                }
                
                currentLastLogin = today;
            }

            setHighScores(prev => ({
                standard: Math.max(prev.standard, data.highScores?.standard || 0),
                battle: Math.max(prev.battle, data.highScores?.battle || 0),
                danger: Math.max(prev.danger, data.highScores?.danger || 0),
                playground: Math.max(prev.playground, data.highScores?.playground || 0),
            }));

            setStats(prev => ({
                gamesPlayed: Math.max(prev.gamesPlayed, data.stats?.gamesPlayed || 0),
                totalScore: Math.max(prev.totalScore, data.stats?.totalScore || 0)
            }));

            setUnlockedSkins(prev => {
                const combined = new Set([...prev, ...(data.unlockedSkins || [])]);
                return Array.from(combined);
            });
            
            setPurchasedItems(prev => {
                const combined = new Set([...prev, ...(data.purchasedItems || [])]);
                return Array.from(combined);
            });

            if (data.currentSkinId) setCurrentSkinId(data.currentSkinId as SkinId);
            if (data.currentWorldId) setCurrentWorldId(data.currentWorldId);
            
            setCoins(newCoins);
            
            if (data.muted !== undefined) {
                setIsMuted(data.muted);
                audioService.setMuted(data.muted);
            }

            if (data.tutorialSeen !== undefined) {
                setTutorialSeen(data.tutorialSeen);
            }

            if (data.battleTutorialSeen !== undefined) {
                setBattleTutorialSeen(data.battleTutorialSeen);
            }
            
            setStreak(currentStreak);
            setLongestStreak(currentLongest);
            setLoginHistory(history);
            setLastLoginDate(currentLastLogin);

            setUser((prev: any) => ({ 
                ...prev, 
                uid: authUser.uid,
                displayName: data.displayName || prev?.displayName, 
                photoURL: data.photoURL || prev?.photoURL,
                avatarColor: data.avatarColor || prev?.avatarColor,
                avatarText: data.avatarText || prev?.avatarText,
                useCustomAvatar: data.useCustomAvatar ?? prev?.useCustomAvatar,
                isAnonymous: authUser.isAnonymous
            }));
        });
        
        setIsLoading(false);
    };

    const unsubscribe = subscribeToAuth(handleAuthChange);
    return () => {
        unsubscribe();
        if (unsubSnapshot.current) unsubSnapshot.current();
    };
  }, []);

  const shouldSaveToCloud = (currentUser: any) => {
      if (isRemoteUpdate.current) return false;
      if (!currentUser || currentUser.uid !== loadedUid.current) return false;
      return true;
  };

  useEffect(() => { 
      localStorage.setItem('fliply_highScores', JSON.stringify(highScores));
      if (shouldSaveToCloud(user)) saveGameData(user.uid, { highScores }); 
  }, [highScores, user]);

  useEffect(() => { 
      localStorage.setItem('fliply_stats', JSON.stringify(stats));
      if (shouldSaveToCloud(user)) saveGameData(user.uid, { stats }); 
  }, [stats, user]);

  useEffect(() => { 
      localStorage.setItem('fliply_unlockedSkins', JSON.stringify(unlockedSkins));
      if (shouldSaveToCloud(user)) saveGameData(user.uid, { unlockedSkins }); 
  }, [unlockedSkins, user]);

  useEffect(() => { 
      localStorage.setItem('fliply_purchasedItems', JSON.stringify(purchasedItems));
      if (shouldSaveToCloud(user)) saveGameData(user.uid, { purchasedItems }); 
  }, [purchasedItems, user]);

  useEffect(() => { 
      localStorage.setItem('fliply_currentSkinId', JSON.stringify(currentSkinId));
      if (shouldSaveToCloud(user)) saveGameData(user.uid, { currentSkinId }); 
  }, [currentSkinId, user]);

  useEffect(() => { 
      localStorage.setItem('fliply_currentWorldId', JSON.stringify(currentWorldId));
      if (shouldSaveToCloud(user)) saveGameData(user.uid, { currentWorldId }); 
  }, [currentWorldId, user]);

  useEffect(() => { 
      localStorage.setItem('fliply_muted', JSON.stringify(isMuted));
      if (shouldSaveToCloud(user)) saveGameData(user.uid, { muted: isMuted }); 
  }, [isMuted, user]);
  
  useEffect(() => {
      localStorage.setItem('fliply_coins', JSON.stringify(coins));
      if (shouldSaveToCloud(user)) saveGameData(user.uid, { coins });
  }, [coins, user]);

  useEffect(() => {
      localStorage.setItem('fliply_streak', JSON.stringify(streak));
      localStorage.setItem('fliply_longestStreak', JSON.stringify(longestStreak));
      localStorage.setItem('fliply_loginHistory', JSON.stringify(loginHistory));
      localStorage.setItem('fliply_lastLoginDate', JSON.stringify(lastLoginDate));
      
      if (user && user.uid === loadedUid.current) {
          saveGameData(user.uid, { streak, longestStreak, loginHistory, lastLoginDate });
      }
  }, [streak, longestStreak, loginHistory, lastLoginDate, user]);

  useEffect(() => {
    localStorage.setItem('fliply_tutorialSeen', JSON.stringify(tutorialSeen));
    if (shouldSaveToCloud(user)) saveGameData(user.uid, { tutorialSeen });
  }, [tutorialSeen, user]);

  useEffect(() => {
    localStorage.setItem('fliply_battleTutorialSeen', JSON.stringify(battleTutorialSeen));
    if (shouldSaveToCloud(user)) saveGameData(user.uid, { battleTutorialSeen });
  }, [battleTutorialSeen, user]);

  useEffect(() => {
      if (user) {
          const cacheUser = {
              uid: user.uid,
              displayName: user.displayName,
              photoURL: user.photoURL,
              avatarColor: user.avatarColor,
              avatarText: user.avatarText,
              useCustomAvatar: user.useCustomAvatar
          };
          localStorage.setItem('fliply_user_cache', JSON.stringify(cacheUser));
      }
  }, [user]);

  // Actions
  const processGameEnd = (score: number, earnedCoins: number, mode: GameMode, onUnlock: (name: string) => void) => {
      let isRecord = false;
      const newStats = { ...stats };
      newStats.gamesPlayed += 1;
      newStats.totalScore += score;
      setStats(newStats);
      
      // Earn coins from run
      if (earnedCoins > 0) {
          setCoins(prev => prev + earnedCoins);
      }

      if (score > highScores[mode]) {
          setHighScores(prev => ({ ...prev, [mode]: score }));
          isRecord = true;
      }

      // Check Unlocks
      const newUnlocks: string[] = [];
      Object.values(SKINS).forEach(skin => {
          if (unlockedSkins.includes(skin.id)) return;
          
          let unlocked = false;
          const cond = skin.unlockCondition;
          
          if (cond.type === 'score' && mode === 'standard' && score >= cond.value) unlocked = true;
          if (cond.type === 'battle_score' && mode === 'battle' && score >= cond.value) unlocked = true;
          if (cond.type === 'games_played' && newStats.gamesPlayed >= cond.value) unlocked = true;
          if (cond.type === 'total_score' && newStats.totalScore >= cond.value) unlocked = true;
          // Coins unlocking handled via purchase function

          if (unlocked) {
              newUnlocks.push(skin.id);
              onUnlock(skin.name);
          }
      });

      if (newUnlocks.length > 0) {
          setUnlockedSkins(prev => [...prev, ...newUnlocks]);
      }
      
      return isRecord;
  };

  const updateProfile = async (data: any) => {
      setUser((prev: any) => ({ ...prev, ...data }));
      if (user?.uid) {
          await updateUserProfile(user.uid, data);
      }
  };
  
  const purchaseItem = (itemId: string, cost: number) => {
      if (coins >= cost) {
          setCoins(prev => prev - cost);
          setUnlockedSkins(prev => [...prev, itemId]);
          setPurchasedItems(prev => [...prev, itemId]);
          return true;
      }
      return false;
  };
  
  const spendCoins = (amount: number) => {
      if (coins >= amount) {
          setCoins(prev => prev - amount);
          return true;
      }
      return false;
  };

  const markTutorialSeen = () => {
    setTutorialSeen(true);
  };

  const markBattleTutorialSeen = () => {
    setBattleTutorialSeen(true);
  };

  return {
      user,
      isLoading,
      highScores,
      stats,
      unlockedSkins,
      purchasedItems,
      currentSkinId,
      currentWorldId,
      setCurrentWorldId,
      coins,
      isMuted,
      setIsMuted,
      setCurrentSkinId,
      processGameEnd,
      updateProfile,
      streak,
      longestStreak,
      loginHistory,
      purchaseItem,
      spendCoins,
      tutorialSeen,
      markTutorialSeen,
      battleTutorialSeen,
      markBattleTutorialSeen
  };
};
