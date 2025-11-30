
import React from 'react';

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
                <div className="flex justify-between items-center px-1">
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
            </div>
        </div>
    );
};
