
import { useState, useEffect, useRef } from 'react';
import { subscribeToAuth, loadUserGameData, saveGameData, signIn, updateUserProfile } from '../services/firebase';
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
  
  // Optimistic User Loading: Load cached user immediately to skip "Loading..." screen
  const [user, setUser] = useState<any>(() => 
      getLocal('fliply_user_cache', null)
  );

  // Only show loading if we have absolutely no user data cached
  const [isLoading, setIsLoading] = useState(() => {
       return !localStorage.getItem('fliply_user_cache'); 
  });
  
  const isSyncing = useRef(false);

  // Auth & Load
  useEffect(() => {
    // Ensure audio service matches muted state immediately
    audioService.setMuted(isMuted);

    const handleAuthChange = async (authUser: any) => {
        if (!authUser) {
             // User is not signed in (Logged out or first visit)
             
             // Clear local user state
             setUser(null);
             localStorage.removeItem('fliply_user_cache');
             
             // Reset game data to defaults to prevent leaking previous user data
             setHighScores({ standard: 0, battle: 0, danger: 0, playground: 0 });
             setStats({ gamesPlayed: 0, totalScore: 0 });
             setUnlockedSkins(['default']);
             setCurrentSkinId('default');
             
             // Automatically sign in anonymously to ensure game functionality
             signIn(); 
             return;
        }

        // We have an authUser (Anonymous or Google)
        
        // Merge authUser properties into our user state locally first
        setUser((prev: any) => {
            if (!prev) return authUser;
            return { ...prev, uid: authUser.uid, email: authUser.email }; 
        });

        const userProfile = {
            displayName: authUser.displayName,
            email: authUser.email,
            photoURL: authUser.photoURL
        };

        // Fetch Cloud Data
        const cloudData = await loadUserGameData(authUser.uid, userProfile);
        
        if (cloudData) {
            isSyncing.current = true;
            
            // SMART MERGE: Cloud vs Local
            // We take the max of high scores/stats to prevent data loss if played offline
            // or if local data is newer than what was just fetched.
            setHighScores(prev => ({
                standard: Math.max(prev.standard, cloudData.highScores.standard || 0),
                battle: Math.max(prev.battle, cloudData.highScores.battle || 0),
                danger: Math.max(prev.danger, cloudData.highScores.danger || 0),
                playground: Math.max(prev.playground, cloudData.highScores.playground || 0),
            }));

            setStats(prev => ({
                gamesPlayed: Math.max(prev.gamesPlayed, cloudData.stats.gamesPlayed || 0),
                totalScore: Math.max(prev.totalScore, cloudData.stats.totalScore || 0)
            }));

            // Merge unlocked skins
            setUnlockedSkins(prev => {
                const combined = new Set([...prev, ...(cloudData.unlockedSkins || [])]);
                return Array.from(combined);
            });

            // For preferences, Cloud wins if set, otherwise keep Local
            if (cloudData.currentSkinId) setCurrentSkinId(cloudData.currentSkinId as SkinId);
            if (cloudData.muted !== undefined) {
                setIsMuted(cloudData.muted);
                audioService.setMuted(cloudData.muted);
            }

            // Update User Profile Data
            setUser((prev: any) => ({ 
                ...prev, 
                uid: authUser.uid,
                displayName: cloudData.displayName || prev?.displayName, 
                photoURL: cloudData.photoURL || prev?.photoURL,
                avatarColor: cloudData.avatarColor || prev?.avatarColor,
                avatarText: cloudData.avatarText || prev?.avatarText,
                useCustomAvatar: cloudData.useCustomAvatar ?? prev?.useCustomAvatar,
                isAnonymous: authUser.isAnonymous
            }));
            
            // Allow persistence to resume after state settles
            setTimeout(() => { isSyncing.current = false; }, 100);
        }
        
        // Hide loading screen if it was still showing
        setIsLoading(false);
    };

    const unsubscribe = subscribeToAuth(handleAuthChange);
    return () => unsubscribe();
  }, []); // Run once on mount

  // Persistence Effects (Save to LocalStorage AND Cloud)
  useEffect(() => { 
      localStorage.setItem('fliply_highScores', JSON.stringify(highScores));
      if (!isSyncing.current && user) saveGameData(user.uid, { highScores }); 
  }, [highScores, user]);

  useEffect(() => { 
      localStorage.setItem('fliply_stats', JSON.stringify(stats));
      if (!isSyncing.current && user) saveGameData(user.uid, { stats }); 
  }, [stats, user]);

  useEffect(() => { 
      localStorage.setItem('fliply_unlockedSkins', JSON.stringify(unlockedSkins));
      if (!isSyncing.current && user) saveGameData(user.uid, { unlockedSkins }); 
  }, [unlockedSkins, user]);

  useEffect(() => { 
      localStorage.setItem('fliply_currentSkinId', JSON.stringify(currentSkinId));
      if (!isSyncing.current && user) saveGameData(user.uid, { currentSkinId }); 
  }, [currentSkinId, user]);

  useEffect(() => { 
      localStorage.setItem('fliply_muted', JSON.stringify(isMuted));
      if (!isSyncing.current && user) saveGameData(user.uid, { muted: isMuted }); 
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
