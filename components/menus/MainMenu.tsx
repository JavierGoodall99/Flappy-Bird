


import React from 'react';
import { Button } from '../Button';
import { GameMode, PowerupType } from '../../types';

interface MainMenuProps {
  startGame: (powerup: PowerupType | null, mode: GameMode) => void;
  setShopOpen: (open: boolean) => void;
  setGuideOpen: (open: boolean) => void;
  setLeaderboardOpen: (open: boolean) => void;
  setWeaponSelectOpen: (open: boolean) => void;
  setProfileOpen: (open: boolean) => void;
  setStreakModalOpen: (open: boolean) => void;
  user: any;
  handleGoogleSignIn: () => void;
  streak: number;
  coins: number;
  stats: { gamesPlayed: number; totalScore: number };
}

export const MainMenu: React.FC<MainMenuProps> = ({ 
  startGame, setShopOpen, setGuideOpen, setLeaderboardOpen, setWeaponSelectOpen, setProfileOpen, setStreakModalOpen, user, handleGoogleSignIn, streak, coins, stats
}) => {
  
  const shouldUseCustomAvatar = user && (user.useCustomAvatar || !user.photoURL);
  const avatarInitials = user ? (user.avatarText || user.displayName || 'G').substring(0, 2).toUpperCase() : 'G';
  const avatarColor = user?.avatarColor || '#6366F1';
  
  return (
    <>
      {/* UNIFIED PILL CONTAINER - TOP RIGHT */}
      <div className="absolute top-4 right-4 md:top-6 md:right-6 z-30 animate-fade-in select-none">
          <div className="glass-panel rounded-full p-1.5 pr-2 flex items-center shadow-2xl">
              
              {/* SECTION 1: COINS */}
              <div className="flex items-center gap-3 px-3 md:px-4 border-r border-white/10">
                  <div className="w-8 h-8 md:w-10 md:h-10 rounded-full bg-[#EAB308] flex items-center justify-center shadow-lg shadow-yellow-500/20 text-lg md:text-xl">
                     🪙
                  </div>
                  <span className="text-xl md:text-2xl font-black text-white font-['Outfit'] tracking-tight leading-none">{coins}</span>
              </div>

              {/* SECTION 2: STREAK */}
              <button 
                  onClick={() => setStreakModalOpen(true)}
                  className="flex items-center gap-3 px-3 md:px-4 border-r border-white/10 relative group cursor-pointer hover:bg-white/5 transition-colors" 
                  title="View Streak Details"
              >
                  <div className="relative">
                      <div className="w-8 h-8 md:w-10 md:h-10 rounded-full bg-[#D97706] flex items-center justify-center shadow-lg shadow-orange-500/20 text-lg md:text-xl text-white">
                          🔥
                      </div>
                      {streak > 0 && (
                          <div className="absolute -top-1 -right-1 w-3 h-3 bg-red-600 rounded-full border-2 border-[#1e293b] animate-pulse"></div>
                      )}
                  </div>
                  <div className="flex flex-col items-start leading-none">
                      <span className="text-lg md:text-xl font-black text-white">{streak}</span>
                      <span className="text-[9px] md:text-[10px] font-bold text-[#FCD34D] uppercase tracking-wider">DAY</span>
                  </div>
              </button>

              {/* SECTION 3: PROFILE */}
              <button 
                  onClick={() => user ? setProfileOpen(true) : handleGoogleSignIn()}
                  className="flex items-center gap-3 pl-3 md:pl-4 hover:opacity-80 transition-opacity text-left group"
              >
                  <div className="flex flex-col items-end hidden sm:flex">
                      <span className="text-white font-bold text-sm md:text-base leading-tight max-w-[120px] truncate">
                          {user ? (user.displayName || 'Guest') : 'Sign In'}
                      </span>
                  </div>
                  <div className="relative">
                      <div 
                        className="w-10 h-10 md:w-12 md:h-12 rounded-full border-2 border-indigo-500/50 flex items-center justify-center overflow-hidden bg-slate-800 transition-all group-hover:border-indigo-400"
                        style={{ backgroundColor: shouldUseCustomAvatar ? avatarColor : undefined }}
                      >
                           {!shouldUseCustomAvatar && user?.photoURL ? (
                              <img src={user.photoURL} alt="User" className="w-full h-full object-cover" />
                           ) : (
                              <span className="font-bold text-white text-sm md:text-base">{avatarInitials}</span>
                           )}
                      </div>
                      {/* Online Status Dot */}
                      <div className="absolute bottom-0 right-0 w-3 h-3 md:w-3.5 md:h-3.5 bg-green-500 border-2 border-[#1e293b] rounded-full"></div>
                  </div>
              </button>

          </div>
      </div>

      {/* MENU CENTER */}
      <div className="absolute inset-0 flex items-center justify-center z-20 bg-black/20 backdrop-blur-sm">
        <div className="glass-panel p-6 md:p-10 rounded-3xl text-center w-full max-w-md mx-4 shadow-2xl transform transition-all animate-fade-in-up max-h-[90vh] overflow-y-auto no-scrollbar touch-pan-y">
          <h1 className="text-5xl md:text-7xl font-black text-white mb-2 drop-shadow-xl tracking-tighter italic transform -rotate-2">
            Fliply
          </h1>
          <div className="text-amber-400 font-bold tracking-widest uppercase mb-4 md:mb-8 text-sm">Arcade Edition</div>
          
          <div className="flex flex-col gap-3 md:gap-4 mb-4 md:mb-6">
              <Button onClick={() => startGame(null, 'standard')} className="w-full text-lg md:text-xl py-3 md:py-4 shadow-xl">PLAY CLASSIC</Button>
              <button 
                onClick={() => setWeaponSelectOpen(true)}
                className="w-full py-3 md:py-4 rounded-full font-bold text-base md:text-lg text-white bg-gradient-to-r from-red-600 to-rose-600 border-b-4 border-red-800 active:scale-95 shadow-lg hover:brightness-110 transition-all flex items-center justify-center gap-2"
              >
                <span>⚔️</span> BATTLE MODE
              </button>
          </div>

          <div className="flex gap-3 md:gap-4 w-full mb-3">
            <button 
              onClick={() => setShopOpen(true)}
              className="flex-1 py-3 md:py-4 rounded-2xl font-bold text-base tracking-wide bg-white/5 text-white border border-white/10 hover:bg-white/15 hover:border-white/30 transition-all flex flex-col items-center justify-center gap-1 group"
            >
              <span className="text-2xl mb-1 group-hover:scale-110 transition-transform">🎨</span> 
              SKINS
            </button>
            <button 
              onClick={() => setGuideOpen(true)}
              className="flex-1 py-3 md:py-4 rounded-2xl font-bold text-base tracking-wide bg-white/5 text-white border border-white/10 hover:bg-white/15 hover:border-white/30 transition-all flex flex-col items-center justify-center gap-1 group"
            >
              <span className="text-2xl mb-1 group-hover:scale-110 transition-transform">⚡</span> 
              POWERS
            </button>
          </div>
          
          <button 
              onClick={() => setLeaderboardOpen(true)}
              className="w-full py-3 rounded-2xl font-bold text-base tracking-wide bg-gradient-to-r from-yellow-500/20 to-amber-500/20 text-amber-200 border border-amber-500/30 hover:bg-amber-500/30 hover:border-amber-500/50 transition-all flex items-center justify-center gap-2 group"
          >
              <span className="text-xl group-hover:scale-110 transition-transform">🏆</span>
              LEADERBOARD
          </button>

          <div className="text-white/30 text-xs uppercase tracking-widest mt-4 md:mt-6">Press Space to Start</div>
        </div>
      </div>
    </>
  );
};
