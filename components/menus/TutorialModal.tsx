
import React from 'react';
import { Button } from '../Button';

interface TutorialModalProps {
    isOpen: boolean;
    onClose: () => void;
    mode?: 'standard' | 'battle';
}

export const TutorialModal: React.FC<TutorialModalProps> = ({ isOpen, onClose, mode = 'standard' }) => {
    if (!isOpen) return null;

    const isBattle = mode === 'battle';

    return (
        <div className="absolute inset-0 z-50 bg-slate-900/95 backdrop-blur-lg flex items-center justify-center p-6 animate-fade-in">
            <div className={`glass-panel p-8 rounded-3xl max-w-sm w-full text-center shadow-2xl border ${isBattle ? 'border-red-500/30' : 'border-white/20'} relative overflow-hidden`}>
                {/* Decorative Background Elements */}
                <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none opacity-20">
                    <div className={`absolute top-[-20%] left-[-20%] w-40 h-40 ${isBattle ? 'bg-red-600' : 'bg-blue-500'} rounded-full blur-3xl`}></div>
                    <div className={`absolute bottom-[-20%] right-[-20%] w-40 h-40 ${isBattle ? 'bg-orange-500' : 'bg-purple-500'} rounded-full blur-3xl`}></div>
                </div>

                <div className="relative z-10 flex flex-col items-center gap-6">
                    <div className="text-5xl animate-bounce">{isBattle ? '⚔️' : '🎓'}</div>
                    
                    <div className="space-y-2">
                        <h2 className="text-3xl font-black text-white tracking-wide uppercase italic">{isBattle ? 'Battle Training' : 'How to Play'}</h2>
                        <p className="text-slate-300 font-medium">{isBattle ? 'Prepare for combat!' : 'Master the skies in seconds!'}</p>
                    </div>

                    <div className="bg-white/5 border border-white/10 rounded-2xl p-6 w-full space-y-6">
                        {isBattle ? (
                             <>
                                {/* Step 1: Loadout */}
                                <div className="flex items-center gap-4 text-left">
                                    <div className="w-12 h-12 rounded-full bg-orange-500/20 flex items-center justify-center text-2xl border border-orange-500/30 shrink-0">
                                        🔫
                                    </div>
                                    <div>
                                        <h3 className="text-white font-bold text-lg leading-tight mb-1">Weapon Loadout</h3>
                                        <p className="text-slate-400 text-xs leading-relaxed">Choose your weapon wisely before every battle. Each has unique stats.</p>
                                    </div>
                                </div>

                                {/* Step 2: Combat */}
                                <div className="flex items-center gap-4 text-left">
                                    <div className="w-12 h-12 rounded-full bg-red-500/20 flex items-center justify-center text-2xl border border-red-500/30 shrink-0">
                                        🔥
                                    </div>
                                    <div>
                                        <h3 className="text-white font-bold text-lg leading-tight mb-1">Combat</h3>
                                        <p className="text-slate-400 text-xs leading-relaxed">You shoot automatically. Tap to fly, dodge enemies, and defeat the Boss!</p>
                                    </div>
                                </div>
                             </>
                        ) : (
                             <>
                                {/* Step 1: Controls */}
                                <div className="flex items-center gap-4 text-left">
                                    <div className="w-12 h-12 rounded-full bg-indigo-500/20 flex items-center justify-center text-2xl border border-indigo-500/30 shrink-0">
                                        👆
                                    </div>
                                    <div>
                                        <h3 className="text-white font-bold text-lg leading-tight mb-1">Controls</h3>
                                        <p className="text-slate-400 text-xs leading-relaxed">Tap screen, Click mouse, or press Spacebar to jump.</p>
                                    </div>
                                </div>

                                {/* Step 2: Objective */}
                                <div className="flex items-center gap-4 text-left">
                                    <div className="w-12 h-12 rounded-full bg-emerald-500/20 flex items-center justify-center text-2xl border border-emerald-500/30 shrink-0">
                                        🚧
                                    </div>
                                    <div>
                                        <h3 className="text-white font-bold text-lg leading-tight mb-1">Objective</h3>
                                        <p className="text-slate-400 text-xs leading-relaxed">Dodge pipes and collect coins to unlock cool skins!</p>
                                    </div>
                                </div>
                             </>
                        )}
                    </div>

                    <Button onClick={onClose} className="w-full py-4 text-lg shadow-xl shadow-amber-500/20">
                        {isBattle ? 'TO THE ARMORY!' : "I'M READY!"}
                    </Button>
                </div>
            </div>
        </div>
    );
};
