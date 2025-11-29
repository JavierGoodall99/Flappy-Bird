
import React from 'react';
import { WEAPON_LOADOUTS } from '../../constants';
import { PowerupType } from '../../types';

interface WeaponSelectorModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSelectWeapon: (weaponId: PowerupType) => void;
}

export const WeaponSelectorModal: React.FC<WeaponSelectorModalProps> = ({ isOpen, onClose, onSelectWeapon }) => {
    if (!isOpen) return null;

    return (
        <div className="absolute inset-0 z-50 bg-slate-900/95 backdrop-blur-lg flex flex-col items-center justify-center p-3 md:p-6 animate-fade-in">
              <div className="w-full max-w-5xl h-full flex flex-col relative max-h-[95vh]">
                  <div className="flex justify-between items-center mb-4 flex-shrink-0 px-2">
                     <h2 className="text-xl md:text-3xl font-black text-white italic tracking-tighter">LOADOUT</h2>
                     <button onClick={onClose} className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center text-white hover:bg-white/20 transition-colors">✕</button>
                  </div>
                  
                  <div className="flex-1 overflow-y-auto no-scrollbar w-full">
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 md:gap-4 pb-20 px-1">
                          {WEAPON_LOADOUTS.map((weapon) => (
                              <div 
                                 key={weapon.id}
                                 onClick={() => onSelectWeapon(weapon.id as PowerupType)}
                                 className="bg-white/5 hover:bg-white/10 border border-white/10 hover:border-white/30 rounded-2xl p-4 cursor-pointer transition-all hover:-translate-y-1 group flex flex-col h-full"
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

                                 <div className="w-full py-2.5 bg-white/10 rounded-lg text-center font-bold text-xs tracking-widest text-white group-hover:bg-white/20 transition-colors uppercase">
                                     Equip
                                 </div>
                              </div>
                          ))}
                      </div>
                  </div>
              </div>
          </div>
    );
};
