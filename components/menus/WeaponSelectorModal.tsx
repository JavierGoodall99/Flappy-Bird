
import React from 'react';
import { WEAPON_LOADOUTS } from '../../constants';
import { PowerupType } from '../../types';

interface WeaponSelectorModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSelectWeapon: (weaponId: string) => void;
    purchasedItems: string[];
    coins: number;
    onPurchase: (id: string, cost: number) => boolean;
}

export const WeaponSelectorModal: React.FC<WeaponSelectorModalProps> = ({ isOpen, onClose, onSelectWeapon, purchasedItems, coins, onPurchase }) => {
    if (!isOpen) return null;

    return (
        <div className="absolute inset-0 z-50 bg-slate-900/95 backdrop-blur-lg flex flex-col items-center justify-center p-3 md:p-6 animate-fade-in">
              <div className="w-full max-w-5xl h-full flex flex-col relative max-h-[95vh]">
                  <div className="flex justify-between items-center mb-4 flex-shrink-0 px-2">
                     <h2 className="text-xl md:text-3xl font-black text-white italic tracking-tighter">LOADOUT</h2>
                     <div className="flex items-center gap-4">
                         <div className="flex items-center gap-2 bg-black/40 px-3 py-1 rounded-full border border-yellow-500/30">
                              <span className="text-yellow-400">🪙</span>
                              <span className="text-white font-bold font-mono">{coins}</span>
                         </div>
                         <button onClick={onClose} className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center text-white hover:bg-white/20 transition-colors">✕</button>
                     </div>
                  </div>
                  
                  <div className="flex-1 overflow-y-auto no-scrollbar w-full touch-pan-y">
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 md:gap-4 pb-20 px-1">
                          {WEAPON_LOADOUTS.map((weapon) => {
                              const isOwned = purchasedItems.includes(weapon.id) || weapon.price === 0;
                              const canAfford = coins >= (weapon.price || 0);

                              return (
                                  <div 
                                     key={weapon.id}
                                     role="button"
                                     onClick={() => {
                                         if (isOwned) {
                                             onSelectWeapon(weapon.id);
                                         } else if (canAfford) {
                                             if (onPurchase(weapon.id, weapon.price || 0)) {
                                                 // onSelectWeapon(weapon.id); // Optionally auto-equip
                                             }
                                         }
                                     }}
                                     className={`bg-white/5 border border-white/10 rounded-2xl p-4 cursor-pointer transition-all flex flex-col h-full group
                                        ${isOwned ? 'hover:bg-white/10 hover:border-white/30 hover:-translate-y-1' : ''}
                                        ${!isOwned && !canAfford ? 'opacity-60' : ''}
                                     `}
                                  >
                                     <div className="flex items-center gap-3 mb-2">
                                         <div 
                                            className="w-12 h-12 rounded-xl shadow-lg flex-shrink-0 flex items-center justify-center text-2xl transition-transform group-hover:scale-105"
                                            style={{ backgroundColor: weapon.color }}
                                         >
                                            {weapon.id === 'gun' ? '🔫' : weapon.id.includes('gun') ? '🦅' : '⚔️'}
                                         </div>
                                         <div>
                                             <h3 className="text-lg font-bold text-white leading-tight">{weapon.name}</h3>
                                             <div className="text-[10px] text-white/50 uppercase tracking-widest font-bold">Ranged Weapon</div>
                                         </div>
                                     </div>
                                     
                                     <p className="text-xs text-slate-300 mb-3 flex-grow leading-relaxed">{weapon.description}</p>
                                     
                                     <div className="bg-black/20 rounded-lg p-2.5 mb-3">
                                         <div className="text-[10px] font-mono text-white/70 whitespace-pre-wrap leading-tight">{weapon.stats}</div>
                                     </div>

                                     {isOwned ? (
                                         <div className="w-full py-2.5 bg-green-500/20 rounded-lg text-center font-bold text-xs tracking-widest text-green-300 border border-green-500/30 uppercase">
                                             Equip
                                         </div>
                                     ) : (
                                         <div className={`w-full py-2.5 rounded-lg text-center font-bold text-xs tracking-widest border uppercase flex items-center justify-center gap-2 transition-colors
                                            ${canAfford ? 'bg-amber-500/20 text-amber-300 border-amber-500/30 hover:bg-amber-500/30' : 'bg-red-500/10 text-red-400 border-red-500/20'}
                                         `}>
                                             <span>🪙</span> {weapon.price}
                                         </div>
                                     )}
                                  </div>
                              );
                          })}
                      </div>
                  </div>
              </div>
          </div>
    );
};
