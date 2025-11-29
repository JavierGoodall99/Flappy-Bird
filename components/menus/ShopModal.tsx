import React from 'react';
import { SKINS } from '../../constants';
import { SkinId, Skin } from '../../types';

interface ShopModalProps {
    isOpen: boolean;
    onClose: () => void;
    stats: { gamesPlayed: number, totalScore: number };
    unlockedSkins: SkinId[];
    currentSkinId: SkinId;
    onEquip: (id: SkinId) => void;
}

export const ShopModal: React.FC<ShopModalProps> = ({ isOpen, onClose, stats, unlockedSkins, currentSkinId, onEquip }) => {
    if (!isOpen) return null;

    return (
        <div className="absolute inset-0 z-50 bg-slate-900/90 backdrop-blur-lg flex flex-col items-center justify-center p-4 animate-fade-in">
           <div className="w-full max-w-4xl h-full flex flex-col max-h-[95vh]">
              <div className="flex justify-between items-center mb-4 flex-shrink-0">
                  <h2 className="text-2xl md:text-3xl font-black text-white">SKIN SHOP</h2>
                  <div className="flex items-center gap-2 md:gap-4">
                      {/* Stats Display in Shop */}
                      <div className="bg-black/30 px-3 py-1 rounded-full flex flex-col md:flex-row md:gap-4 text-[10px] md:text-xs font-bold border border-white/10 text-right md:text-left">
                          <div className="text-slate-300">GAMES: <span className="text-white">{stats.gamesPlayed}</span></div>
                          <div className="text-slate-300">SCORE: <span className="text-amber-400">{stats.totalScore}</span></div>
                      </div>
                      <button onClick={onClose} className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center text-white hover:bg-white/20">✕</button>
                  </div>
              </div>

              <div className="flex-1 overflow-y-auto grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 pb-8 no-scrollbar content-start touch-pan-y">
                 {Object.values(SKINS).map((skin) => {
                     const isUnlocked = unlockedSkins.includes(skin.id);
                     const isEquipped = currentSkinId === skin.id;

                     return (
                         <div key={skin.id} 
                              role="button"
                              onClick={() => isUnlocked && onEquip(skin.id)}
                              className={`relative p-3 rounded-xl border transition-all cursor-pointer group flex items-center sm:block
                                ${isEquipped ? 'bg-amber-500/20 border-amber-500' : 'bg-white/5 border-white/10 hover:border-white/30'}
                                ${!isUnlocked && 'opacity-60 grayscale'}
                              `}
                         >
                             {/* Mobile Layout: Flex Row */}
                             <div className="sm:hidden mr-4 relative">
                                  <div className="w-12 h-12 rounded-full shadow-lg relative shrink-0" style={{ backgroundColor: '#' + skin.colors.body.toString(16) }}>
                                     <div className="absolute right-[-4px] top-[14px] w-6 h-4 rounded-full bg-white"></div>
                                     <div className="absolute right-[-8px] top-[18px] w-4 h-3" style={{ backgroundColor: '#' + skin.colors.beak.toString(16) }}></div>
                                  </div>
                             </div>

                             {/* Desktop/Tablet Layout: Top Status Bar */}
                             <div className="flex justify-between items-start mb-2 w-full sm:w-auto">
                                <div className="flex flex-col sm:block">
                                    <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded uppercase self-start
                                        ${skin.rarity === 'Legendary' ? 'bg-yellow-500 text-black' : 
                                        skin.rarity === 'Epic' ? 'bg-purple-500 text-white' :
                                        skin.rarity === 'Rare' ? 'bg-blue-500 text-white' : 'bg-slate-600 text-slate-200'}
                                    `}>{skin.rarity}</span>
                                    
                                    {/* Name Logic for Mobile Row */}
                                    <h3 className="text-sm font-bold text-white mt-1 sm:hidden">{skin.name}</h3>
                                    <div className={`text-[10px] font-bold sm:hidden ${isUnlocked ? 'text-green-400' : 'text-red-400'}`}>
                                        {isUnlocked ? 'Unlocked' : `🔒 ${skin.unlockCondition.value} ${skin.unlockCondition.type.replace('_',' ')}`}
                                    </div>
                                </div>
                                {isEquipped && <span className="text-[10px] text-amber-400 font-bold whitespace-nowrap ml-2">EQUIPPED</span>}
                             </div>
                             
                             {/* Desktop/Tablet: Visual Center */}
                             <div className="hidden sm:flex h-16 items-center justify-center mb-2">
                                 <div className="w-10 h-10 rounded-full shadow-lg relative" style={{ backgroundColor: '#' + skin.colors.body.toString(16) }}>
                                     <div className="absolute right-[-4px] top-[12px] w-5 h-3 rounded-full bg-white"></div>
                                     <div className="absolute right-[-7px] top-[15px] w-3 h-2" style={{ backgroundColor: '#' + skin.colors.beak.toString(16) }}></div>
                                 </div>
                             </div>

                             {/* Desktop/Tablet: Name & Unlock Info */}
                             <div className="hidden sm:block text-center">
                                 <h3 className="text-sm font-bold text-white mb-0.5 truncate">{skin.name}</h3>
                                 <div className={`text-[10px] font-bold truncate ${isUnlocked ? 'text-green-400' : 'text-red-400'}`}>
                                     {isUnlocked ? 'Unlocked' : `🔒 ${skin.unlockCondition.description}`}
                                 </div>
                             </div>
                             
                             {!isUnlocked && (
                                 <div className="absolute inset-0 bg-black/40 flex items-center justify-center rounded-xl backdrop-blur-[1px] z-10">
                                     <span className="text-xl">🔒</span>
                                 </div>
                             )}
                         </div>
                     );
                 })}
              </div>
           </div>
        </div>
    );
};