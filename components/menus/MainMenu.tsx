
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
  user: any;
  handleGoogleSignIn: () => void;
}

export const MainMenu: React.FC<MainMenuProps> = ({ 
  startGame, setShopOpen, setGuideOpen, setLeaderboardOpen, setWeaponSelectOpen, setProfileOpen, user, handleGoogleSignIn 
}) => {
  return (
    <>
      {/* USER PROFILE - TOP RIGHT */}
      <div className="absolute top-6 right-6 md:top-8 md:right-8 z-30 animate-fade-in select-none">
          {user ? (
              <button 
                  onClick={() => setProfileOpen(true)}
                  className="group flex items-center gap-3 bg-[#1a1b26]/90 p-1.5 pr-5 rounded-full shadow-2xl border border-white/10 backdrop-blur-md hover:border-white/20 transition-all hover:scale-105 active:scale-95 cursor-pointer"
              >
                  <div className="relative w-10 h-10 rounded-full bg-slate-800 overflow-hidden border border-white/10 shadow-inner shrink-0">
                        {user.photoURL ? (
                            <img src={user.photoURL} alt="User" className="w-full h-full object-cover" />
                        ) : (
                            <div className="w-full h-full flex items-center justify-center text-sm font-bold bg-gradient-to-br from-indigo-500 to-purple-600 text-white">
                                {user.displayName ? user.displayName.charAt(0).toUpperCase() : 'G'}
                            </div>
                        )}
                  </div>
                  <div className="flex flex-col items-start">
                      <span className="text-white font-bold text-sm leading-tight font-['Outfit'] max-w-[100px] truncate">
                          {user.displayName || 'Guest'}
                      </span>
                      <span className="text-[10px] text-white/50 font-bold uppercase tracking-wider leading-none">
                          EDIT PROFILE
                      </span>
                  </div>
                  <div className="text-white/40 group-hover:text-white transition-colors ml-1">✏️</div>
              </button>
          ) : (
              <button 
                  onClick={handleGoogleSignIn}
                  className="group relative px-6 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 rounded-full font-bold text-white text-sm tracking-wider shadow-lg hover:shadow-indigo-500/50 hover:scale-105 active:scale-95 transition-all flex items-center gap-2 overflow-hidden border border-white/20"
              >
                  <span className="relative">SIGN IN WITH GOOGLE</span>
              </button>
          )}
      </div>

      {/* MENU CENTER */}
      <div className="absolute inset-0 flex items-center justify-center z-20 bg-black/20 backdrop-blur-sm">
        <div className="glass-panel p-6 md:p-10 rounded-3xl text-center w-full max-w-md mx-4 shadow-2xl transform transition-all animate-fade-in-up max-h-[90vh] overflow-y-auto no-scrollbar">
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
