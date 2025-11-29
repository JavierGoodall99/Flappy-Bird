
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
        <div className="absolute inset-0 z-50 bg-slate-900/90 backdrop-blur-lg flex flex-col items-center justify-center p-4 md:p-6 animate-fade-in">
              <div className="w-full max-w-5xl h-full flex flex-col relative">
                  <div className="flex justify-between items-center mb-6 flex-shrink-0 px-2">
                     <h2 className="text-2xl md:text-4xl font-black text-white italic tracking-tighter">CHOOSE YOUR WEAPON</h2>
                     <button onClick={onClose} className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center text-white hover:bg-white/20 transition-colors">✕</button>
                  </div>
                  
                  <div className="flex-1 overflow-y-auto no-scrollbar w-full">
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6 pb-20 px-2">
                          {WEAPON_LOADOUTS.map((weapon) => (
                              <div 
                                 key={weapon.id}
                                 onClick={() => onSelectWeapon(weapon.id as PowerupType)}
                                 className="bg-white/5 hover:bg-white/10 border border-white/10 hover:border-white/30 rounded-3xl p-6 cursor-pointer transition-all hover:-translate-y-2 group flex flex-col h-full"
                              >
                                 <div className="flex items-center gap-4 mb-4">
                                     <div 
                                        className="w-16 h-16 rounded-2xl shadow-lg flex-shrink-0 flex items-center justify-center text-3xl transition-transform group-hover:scale-110"
                                        style={{ backgroundColor: weapon.color }}
                                     >
                                        {weapon.id === 'gun' ? '🔫' : weapon.id.includes('gun') ? '🦅' : '⚔️'}
                                     </div>
                                     <h3 className="text-2xl font-bold text-white leading-none">{weapon.name}</h3>
                                 </div>
                                 
                                 <p className="text-sm text-slate-300 mb-4 flex-grow">{weapon.description}</p>
                                 
                                 <div className="bg-black/20 rounded-xl p-3 mb-4">
                                     <div className="text-xs font-mono text-white/70 whitespace-pre-wrap">{weapon.stats}</div>
                                 </div>

                                 <div className="w-full py-3 bg-white/10 rounded-xl text-center font-bold text-sm tracking-widest text-white group-hover:bg-white/20 transition-colors uppercase">
                                     Select
                                 </div>
                              </div>
                          ))}
                      </div>
                  </div>
              </div>
          </div>
    );
};
