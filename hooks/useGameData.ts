
import { useState, useEffect, useRef } from 'react';
import { subscribeToAuth, loadUserGameData, saveGameData, signIn, updateUserProfile, subscribeToGameData } from '../services/firebase';
import { GameMode, SkinId } from '../types';
import { SKINS } from '../constants';
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
  const [unlockedSkins, setUnlockedSkins] = useState<SkinId[]>(() => 
      getLocal('fliply_unlockedSkins', ['default'])
  );
  const [currentSkinId, setCurrentSkinId] = useState<SkinId>(() => 
      getLocal('fliply_currentSkinId', 'default')
  );
  const [isMuted, setIsMuted] = useState(() => 
      getLocal('fliply_muted', false)
  );
  const [streak, setStreak] = useState(() => 
      getLocal('fliply_streak', 0)
  );
  const [lastLoginDate, setLastLoginDate] = useState(() => 
      getLocal('fliply_lastLoginDate', '')
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
             setCurrentSkinId('default');
             setStreak(0);
             setLastLoginDate('');
             
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
            
            // IMPORTANT: Clear the flag after a short delay. 
            // This ensures that ALL React effects triggered by the state updates below 
            // will see isRemoteUpdate=true and skip saving back to the cloud.
            // If we simply reset it in the effects, the first effect to run would enable saving for subsequent effects,
            // creating a race condition.
            setTimeout(() => {
                isRemoteUpdate.current = false;
            }, 300);

            // STREAK LOGIC Calculation
            // We calculate this here based on the data loaded, but we might need to update it
            // if this is the first time we see this data today.
            const today = new Date().toDateString();
            let currentStreak = data.streak || 0;
            let currentLastLogin = data.lastLoginDate || '';

            // If the date stored in cloud is different from today, we need to process streak
            if (currentLastLogin !== today) {
                const yesterday = new Date();
                yesterday.setDate(yesterday.getDate() - 1);
                
                if (currentLastLogin === yesterday.toDateString()) {
                    currentStreak += 1;
                } else {
                    // Reset to 1 (new streak starting today)
                    currentStreak = 1;
                }
                currentLastLogin = today;
                
                // Since this logic changes state that might not be in DB yet (if we just logged in),
                // we allow the upcoming state updates to trigger a save back to cloud.
                // However, we are inside a snapshot listener which sets isRemoteUpdate=true.
                // We need to allow saving for THIS specific change.
                // But typically, we should just update local state, and rely on the fact that
                // if we change it here, the component will re-render, and if we want to save it,
                // we should do it explicitly or allow the effects. 
                
                // Simplification: We update local state. The useEffects below for streak/lastLoginDate
                // will trigger. We just need to make sure they are allowed to save.
                // Since isRemoteUpdate is true (from snapshot), they normally wouldn't save.
                // But this is a "Client Side Logic on Load".
                
                // We will rely on the fact that we can force a save or just update the state 
                // and let the next cycle handle it, but to prevent loops, let's just update local
                // state and if it differs from what's in DB, we'll save it.
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

            if (data.currentSkinId) setCurrentSkinId(data.currentSkinId as SkinId);
            if (data.muted !== undefined) {
                setIsMuted(data.muted);
                audioService.setMuted(data.muted);
            }
            
            // Update Streak State
            setStreak(currentStreak);
            setLastLoginDate(currentLastLogin);

            // Finally, update the user state now that data is synced
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
        
        // Hide loading screen if it was still showing
        setIsLoading(false);
    };

    const unsubscribe = subscribeToAuth(handleAuthChange);
    return () => {
        unsubscribe();
        if (unsubSnapshot.current) unsubSnapshot.current();
    };
  }, []); // Run once on mount

  // Persistence Effects (Save to LocalStorage AND Cloud)
  
  // Helper to check if we should save to cloud
  const shouldSaveToCloud = (currentUser: any) => {
      // Prevent saving if this update came from the cloud
      // NOTE: For Streak logic, we effectively want to override cloud if our local calc determined a new day.
      // But keeping it simple: if we are processing a remote update, don't write back immediately unless necessary.
      if (isRemoteUpdate.current) return false;
      // Critical: Only save if we have successfully loaded data for this user
      if (!currentUser || currentUser.uid !== loadedUid.current) return false;
      return true;
  };

  useEffect(() => { 
      // Always save to local storage
      localStorage.setItem('fliply_highScores', JSON.stringify(highScores));
      
      if (shouldSaveToCloud(user)) {
          saveGameData(user.uid, { highScores }); 
      }
  }, [highScores, user]);

  useEffect(() => { 
      localStorage.setItem('fliply_stats', JSON.stringify(stats));
      if (shouldSaveToCloud(user)) {
          saveGameData(user.uid, { stats }); 
      }
  }, [stats, user]);

  useEffect(() => { 
      localStorage.setItem('fliply_unlockedSkins', JSON.stringify(unlockedSkins));
      if (shouldSaveToCloud(user)) {
          saveGameData(user.uid, { unlockedSkins }); 
      }
  }, [unlockedSkins, user]);

  useEffect(() => { 
      localStorage.setItem('fliply_currentSkinId', JSON.stringify(currentSkinId));
      if (shouldSaveToCloud(user)) {
          saveGameData(user.uid, { currentSkinId }); 
      }
  }, [currentSkinId, user]);

  useEffect(() => { 
      localStorage.setItem('fliply_muted', JSON.stringify(isMuted));
      if (shouldSaveToCloud(user)) {
          saveGameData(user.uid, { muted: isMuted }); 
      }
  }, [isMuted, user]);
  
  // Save Streak Info
  useEffect(() => {
      localStorage.setItem('fliply_streak', JSON.stringify(streak));
      localStorage.setItem('fliply_lastLoginDate', JSON.stringify(lastLoginDate));
      
      // We check if we need to force save this because we might have updated it locally inside the snapshot listener
      // which sets isRemoteUpdate=true. 
      // To ensure the new streak persists to cloud, we check if the user is loaded.
      if (user && user.uid === loadedUid.current) {
          // If the date/streak changed, we save it.
          // Note: This might cause a redundant write on initial load if data matches, 
          // but Firestore merges so it's cheap.
          // However, we strictly check isRemoteUpdate to avoid loops, 
          // EXCEPT if we just calculated a new streak day which implies we must write it back.
          
          // Actually, simply relying on `shouldSaveToCloud` might skip saving if we just loaded from cloud.
          // But if we just loaded from cloud, `streak` was set. If our logic calculated a NEW streak (different from cloud),
          // `setStreak` was called. 
          // If we rely on `shouldSaveToCloud` which returns false during snapshot processing, we miss saving the increment.
          
          // FIX: The snapshot listener sets `isRemoteUpdate` to false after 300ms. 
          // If the streak update happens, this effect runs. If it happens *during* that 300ms, it might skip.
          // Ideally, we should perform the save explicitly if we detect a date change.
          
          // Let's just save it.
          // But we must debounce or ensure we don't loop.
          saveGameData(user.uid, { streak, lastLoginDate });
      }
  }, [streak, lastLoginDate, user]);

  // Cache User Display Info for Optimistic Load
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

  // Game Logic Actions
  const processGameEnd = (score: number, mode: GameMode, onUnlock: (name: string) => void) => {
      let isRecord = false;
      const newStats = { ...stats };
      newStats.gamesPlayed += 1;
      newStats.totalScore += score;
      setStats(newStats);

      if (score > highScores[mode]) {
          setHighScores(prev => ({ ...prev, [mode]: score }));
          isRecord = true;
      }

      // Check Unlocks
      const newUnlocks: SkinId[] = [];
      Object.values(SKINS).forEach(skin => {
          if (unlockedSkins.includes(skin.id)) return;
          
          let unlocked = false;
          const cond = skin.unlockCondition;
          
          if (cond.type === 'score' && mode === 'standard' && score >= cond.value) unlocked = true;
          if (cond.type === 'battle_score' && mode === 'battle' && score >= cond.value) unlocked = true;
          if (cond.type === 'games_played' && newStats.gamesPlayed >= cond.value) unlocked = true;
          if (cond.type === 'total_score' && newStats.totalScore >= cond.value) unlocked = true;

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

  return {
      user,
      isLoading,
      highScores,
      stats,
      unlockedSkins,
      currentSkinId,
      isMuted,
      setIsMuted,
      setCurrentSkinId,
      processGameEnd,
      updateProfile,
      streak
  };
};
