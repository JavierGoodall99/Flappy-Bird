
import { useState, useEffect, useRef } from 'react';
import { subscribeToAuth, loadUserGameData, saveGameData, signIn, updateUserProfile } from '../services/firebase';
import { GameMode, SkinId } from '../types';
import { SKINS } from '../constants';
import { audioService } from '../services/audioService';

export interface GameStats {
  gamesPlayed: number;
  totalScore: number;
}

export const useGameData = () => {
  const [user, setUser] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [highScores, setHighScores] = useState<Record<GameMode, number>>({ 
      standard: 0, battle: 0, danger: 0, playground: 0 
  });
  const [stats, setStats] = useState<GameStats>({ gamesPlayed: 0, totalScore: 0 });
  const [unlockedSkins, setUnlockedSkins] = useState<SkinId[]>(['default']);
  const [currentSkinId, setCurrentSkinId] = useState<SkinId>('default');
  const [isMuted, setIsMuted] = useState(false);
  
  const isSyncing = useRef(false);

  // Auth & Load
  useEffect(() => {
    const handleAuthChange = async (authUser: any) => {
        setIsLoading(true);
        if (authUser) {
            setUser(authUser);
            const userProfile = {
                displayName: authUser.displayName,
                email: authUser.email,
                photoURL: authUser.photoURL
            };
            const cloudData = await loadUserGameData(authUser.uid, userProfile);
            
            if (cloudData) {
                isSyncing.current = true;
                setHighScores(cloudData.highScores);
                setUnlockedSkins(cloudData.unlockedSkins);
                setCurrentSkinId(cloudData.currentSkinId as SkinId);
                setStats(cloudData.stats);
                setIsMuted(cloudData.muted);
                audioService.setMuted(cloudData.muted);

                if (cloudData.displayName) {
                    setUser((prev: any) => ({ 
                        ...prev, 
                        displayName: cloudData.displayName, 
                        photoURL: cloudData.photoURL,
                        avatarColor: cloudData.avatarColor,
                        avatarText: cloudData.avatarText,
                        useCustomAvatar: cloudData.useCustomAvatar
                    }));
                }
                setTimeout(() => { isSyncing.current = false; }, 100);
            }
            setIsLoading(false);
        } else {
            setUser(null);
            signIn(); 
        }
    };
    const unsubscribe = subscribeToAuth(handleAuthChange);
    return () => unsubscribe();
  }, []);

  // Persistence Effects
  useEffect(() => { if (!isSyncing.current && user) saveGameData(user.uid, { highScores }); }, [highScores, user]);
  useEffect(() => { if (!isSyncing.current && user) saveGameData(user.uid, { stats }); }, [stats, user]);
  useEffect(() => { if (!isSyncing.current && user) saveGameData(user.uid, { unlockedSkins }); }, [unlockedSkins, user]);
  useEffect(() => { if (!isSyncing.current && user) saveGameData(user.uid, { currentSkinId }); }, [currentSkinId, user]);
  useEffect(() => { if (!isSyncing.current && user) saveGameData(user.uid, { muted: isMuted }); }, [isMuted, user]);

  const updateProfileName = async (name: string) => {
      // Deprecated, mapped to updateProfile for backward compatibility if needed
      await updateProfile({ displayName: name });
  };

  const updateProfile = async (data: { displayName?: string, avatarColor?: string, avatarText?: string, useCustomAvatar?: boolean }) => {
      if (user) {
          const newData = { ...data };
          if (newData.displayName && newData.displayName.trim().length === 0) delete newData.displayName;
          
          await updateUserProfile(user.uid, newData);
          setUser((prev: any) => ({ ...prev, ...newData }));
      }
  };

  const processGameEnd = (score: number, gameMode: GameMode, onUnlock: (name: string) => void) => {
      let newStats = { ...stats };
      let newHighScores = { ...highScores };
      let isNewRecord = false;

      // Update Stats
      if (gameMode !== 'playground') {
           newStats = {
               gamesPlayed: stats.gamesPlayed + 1,
               totalScore: stats.totalScore + score
           };
           setStats(newStats);
      }

      // Update High Scores
      if (gameMode !== 'playground') {
        const currentHigh = highScores[gameMode];
        if (score > currentHigh) {
          newHighScores = { ...highScores, [gameMode]: score };
          setHighScores(newHighScores);
          isNewRecord = true;
        }
      }

      // Check Unlocks
      const newUnlockedSkins = [...unlockedSkins];
      let hasUnlock = false;

      Object.values(SKINS).forEach(skin => {
          if (newUnlockedSkins.includes(skin.id)) return;
          let unlocked = false;
          const condition = skin.unlockCondition;
          
          if (condition.type === 'score') {
               if (score >= condition.value && gameMode === 'standard') unlocked = true;
               if (newHighScores.standard >= condition.value) unlocked = true;
          } else if (condition.type === 'battle_score') {
               if (score >= condition.value && gameMode === 'battle') unlocked = true;
               if (newHighScores.battle >= condition.value) unlocked = true;
          } else if (condition.type === 'games_played') {
               if (newStats.gamesPlayed >= condition.value) unlocked = true;
          } else if (condition.type === 'total_score') {
               if (newStats.totalScore >= condition.value) unlocked = true;
          }

          if (unlocked) {
              newUnlockedSkins.push(skin.id);
              hasUnlock = true;
              onUnlock(skin.name);
          }
      });

      if (hasUnlock) {
          setUnlockedSkins(newUnlockedSkins);
          audioService.playScore();
      }

      return isNewRecord;
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
      updateProfileName,
      updateProfile
  };
};
