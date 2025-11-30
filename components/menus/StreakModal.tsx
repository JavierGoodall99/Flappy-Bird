


import React from 'react';
import { STREAK_REWARDS } from '../../constants';

interface StreakModalProps {
    isOpen: boolean;
    onClose: () => void;
    streak: number;
    longestStreak: number;
    loginHistory: string[];
}

export const StreakModal: React.FC<StreakModalProps> = ({ isOpen, onClose, streak, longestStreak, loginHistory }) => {
    if (!isOpen) return null;

    const getWeekDays = () => {
        const days = [];
        const today = new Date();
        for (let i = 6; i >= 0; i--) {
            const d = new Date(today);
            d.setDate(today.getDate() - i);
            days.push(d);
        }
        return days;
    };

    const weekDays = getWeekDays();
    // Use simple date string for comparison to avoid time issues
    const activeDaysSet = new Set(loginHistory.map(d => new Date(d).toDateString()));
    const todayStr = new Date().toDateString();

    let nextFound = false;

    return (
        <div className="absolute inset-0 z-50 bg-black/40 backdrop-blur-sm flex flex-col items-center justify-center p-6 animate-fade-in">
            {/* Matches ProfileEditModal container styles EXACTLY as requested */}
            <div className="w-full max-w-sm glass-panel p-6 rounded-3xl shadow-2xl relative max-h-[90vh] overflow-y-auto no-scrollbar touch-pan-y">
                
                {/* Header */}
                <div className="relative mb-6 text-center">
                    <h2 className="text-xl font-black text-white tracking-wide drop-shadow-md uppercase">Streak Activity</h2>
                    <button 
                        onClick={onClose} 
                        className="absolute -right-2 -top-2 w-8 h-8 rounded-full bg-white/10 flex items-center justify-center text-white hover:bg-white/20 transition-colors"
                    >
                        ✕
                    </button>
                </div>

                {/* Stats */}
                <div className="flex justify-between items-end mb-10 px-4">
                    <div className="flex flex-col items-start">
                        <span className="text-6xl font-black text-white leading-none tracking-tighter">
                            {streak}
                        </span>
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-2">
                            Current Streak
                        </span>
                    </div>
                    
                    <div className="flex flex-col items-end">
                         <div className="flex items-center gap-2">
                            <span className="text-3xl font-black text-white">{longestStreak}</span>
                            <span className="text-2xl">🏆</span>
                        </div>
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-2">
                            Longest Streak
                        </span>
                    </div>
                </div>

                {/* Calendar Viz */}
                <div className="flex justify-between items-center px-1 mb-8">
                    {weekDays.map((date, i) => {
                        const dateStr = date.toDateString();
                        const isActive = activeDaysSet.has(dateStr);
                        const isToday = dateStr === todayStr;
                        // Get first letter of day
                        const dayLabel = date.toLocaleDateString('en-US', { weekday: 'narrow' }); 

                        return (
                            <div key={i} className="flex flex-col items-center gap-3 relative">
                                {isToday && (
                                     <div className="absolute -top-5 left-1/2 transform -translate-x-1/2 text-pink-500 text-[10px]">
                                        ▼
                                     </div>
                                )}
                                <div className={`w-10 h-10 rounded-full flex items-center justify-center border-2 transition-all duration-300
                                    ${isActive 
                                        ? 'bg-rose-500 border-rose-500 shadow-lg shadow-rose-500/30' 
                                        : 'bg-transparent border-white/10'
                                    }
                                    ${!isActive && isToday ? 'border-white/50' : ''}
                                `}>
                                    {isActive ? (
                                        <span className="text-lg">🔥</span>
                                    ) : (
                                        <div className={`w-1.5 h-1.5 rounded-full ${isToday ? 'bg-white/80' : 'bg-white/10'}`}></div>
                                    )}
                                </div>
                                <span className={`text-[10px] font-bold ${isToday ? 'text-white' : 'text-slate-500'}`}>
                                    {dayLabel}
                                </span>
                            </div>
                        );
                    })}
                </div>

                {/* UPCOMING REWARDS */}
                <div className="border-t border-white/10 pt-6">
                    <h3 className="text-xs font-black text-white/50 uppercase tracking-widest mb-4">Upcoming Rewards</h3>
                    <div className="space-y-3">
                        {Object.entries(STREAK_REWARDS).map(([dayStr, reward]) => {
                            const day = parseInt(dayStr);
                            const isCompleted = streak >= day;
                            const isNext = streak < day && (!nextFound);
                            if (isNext) nextFound = true;
                            
                            return (
                                 <div key={day} className={`relative p-3 rounded-xl border flex items-center justify-between transition-all duration-300
                                      ${isCompleted ? 'bg-green-500/10 border-green-500/30' : 
                                        isNext ? 'bg-amber-500/10 border-amber-500 shadow-[0_0_15px_rgba(245,158,11,0.2)] scale-[1.02]' : 
                                        'bg-white/5 border-white/5 opacity-60'}
                                 `}>
                                      <div className="flex items-center gap-3">
                                          <div className={`w-10 h-10 rounded-full flex items-center justify-center font-black text-xs border
                                              ${isCompleted ? 'bg-green-500 text-white border-green-400' : 
                                                isNext ? 'bg-amber-500 text-black border-amber-400 animate-pulse' : 'bg-white/5 text-white/50 border-white/10'}
                                          `}>
                                              {day}d
                                          </div>
                                          <div className="flex flex-col">
                                              <span className={`text-[10px] font-bold uppercase tracking-widest ${isCompleted ? 'text-green-400' : isNext ? 'text-white' : 'text-slate-400'}`}>
                                                  {reward.label}
                                              </span>
                                              <div className="flex items-center gap-1.5">
                                                  <span className="text-sm">🪙</span>
                                                  <span className={`text-sm font-bold font-mono ${isCompleted || isNext ? 'text-white' : 'text-white/50'}`}>{reward.coins}</span>
                                              </div>
                                          </div>
                                      </div>
                                      
                                      {isCompleted && <div className="text-green-500 text-lg bg-green-500/20 w-8 h-8 rounded-full flex items-center justify-center">✓</div>}
                                      {isNext && <div className="text-[10px] font-bold text-amber-500 uppercase px-3 py-1 rounded-full bg-amber-500/20 border border-amber-500/30">Next</div>}
                                      {!isCompleted && !isNext && <div className="text-white/20 text-lg">🔒</div>}
                                 </div>
                            )
                        })}
                    </div>
                </div>

            </div>
        </div>
    );
};