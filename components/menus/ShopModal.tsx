
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
        <div className="absolute inset-0 z-50 bg-slate-900/90 backdrop-blur-lg flex flex-col items-center justify-center p-6 animate-fade-in">
           <div className="w-full max-w-4xl h-full flex flex-col">
              <div className="flex justify-between items-center mb-8">
                  <h2 className="text-4xl font-black text-white">SKIN SHOP</h2>
                  <div className="flex items-center gap-4">
                      {/* Stats Display in Shop */}
                      <div className="bg-black/30 px-4 py-1.5 rounded-full flex gap-4 text-xs font-bold border border-white/10">
                          <div className="text-slate-300">GAMES: <span className="text-white">{stats.gamesPlayed}</span></div>
                          <div className="text-slate-300">LIFETIME SCORE: <span className="text-amber-400">{stats.totalScore}</span></div>
                      </div>
                      <button onClick={onClose} className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center text-white hover:bg-white/20">✕</button>
                  </div>
              </div>

              <div className="flex-1 overflow-y-auto grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 pb-8 no-scrollbar">
                 {Object.values(SKINS).map((skin) => {
                     const isUnlocked = unlockedSkins.includes(skin.id);
                     const isEquipped = currentSkinId === skin.id;

                     return (
                         <div key={skin.id} 
                              onClick={() => isUnlocked && onEquip(skin.id)}
                              className={`relative p-4 rounded-2xl border transition-all cursor-pointer group
                                ${isEquipped ? 'bg-amber-500/20 border-amber-500' : 'bg-white/5 border-white/10 hover:border-white/30'}
                                ${!isUnlocked && 'opacity-60 grayscale'}
                              `}
                         >
                             <div className="flex justify-between items-start mb-2">
                                <span className={`text-xs font-bold px-2 py-1 rounded uppercase
                                    ${skin.rarity === 'Legendary' ? 'bg-yellow-500 text-black' : 
                                      skin.rarity === 'Epic' ? 'bg-purple-500 text-white' :
                                      skin.rarity === 'Rare' ? 'bg-blue-500 text-white' : 'bg-slate-600 text-slate-200'}
                                `}>{skin.rarity}</span>
                                {isEquipped && <span className="text-xs text-amber-400 font-bold">EQUIPPED</span>}
                             </div>
                             
                             <div className="h-24 flex items-center justify-center mb-2">
                                 {/* Minimal CSS representation of skin */}
                                 <div className="w-12 h-12 rounded-full shadow-lg relative" style={{ backgroundColor: '#' + skin.colors.body.toString(16) }}>
                                     <div className="absolute right-[-4px] top-[14px] w-6 h-4 rounded-full bg-white"></div>
                                     <div className="absolute right-[-8px] top-[18px] w-4 h-3 bg-orange-500" style={{ backgroundColor: '#' + skin.colors.beak.toString(16) }}></div>
                                 </div>
                             </div>

                             <h3 className="text-lg font-bold text-white mb-1">{skin.name}</h3>
                             <div className={`text-xs font-bold ${isUnlocked ? 'text-green-400' : 'text-red-400'}`}>
                                 {isUnlocked ? 'Unlocked' : `🔒 ${skin.unlockCondition.description}`}
                             </div>
                             
                             {!isUnlocked && (
                                 <div className="absolute inset-0 bg-black/40 flex items-center justify-center rounded-2xl backdrop-blur-[1px]">
                                     <span className="text-2xl">🔒</span>
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
