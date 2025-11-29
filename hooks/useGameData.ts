
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
      updateProfile
  };
};
