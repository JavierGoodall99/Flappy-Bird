
import React from 'react';
import { POWERUP_INFO } from '../../constants';
import { PowerupType } from '../../types';

interface GuideModalProps {
    isOpen: boolean;
    onClose: () => void;
    onTryPowerup: (type: PowerupType) => void;
}

export const GuideModal: React.FC<GuideModalProps> = ({ isOpen, onClose, onTryPowerup }) => {
    if (!isOpen) return null;

    return (
        <div className="absolute inset-0 z-50 bg-slate-900/90 backdrop-blur-lg flex flex-col items-center justify-center p-6 animate-fade-in">
             <div className="w-full max-w-lg h-full max-h-[80vh] flex flex-col">
                <div className="flex justify-between items-center mb-6">
                    <h2 className="text-3xl font-black text-white">POWER-UPS</h2>
                    <button onClick={onClose} className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center text-white hover:bg-white/20">✕</button>
                </div>
                
                <div className="flex-1 overflow-y-auto flex flex-col gap-3 no-scrollbar">
                   {POWERUP_INFO.map(p => (
                      <div key={p.type} className="bg-white/5 border border-white/10 rounded-2xl p-4 flex items-center gap-4 hover:bg-white/10 transition-colors">
                          <div className="w-12 h-12 rounded-full shadow-lg flex-shrink-0" style={{ backgroundColor: p.color }}></div>
                          <div className="flex-1">
                             <h3 className="text-xl font-bold text-white mb-1">{p.name}</h3>
                             <p className="text-sm text-slate-300 leading-tight">{p.desc}</p>
                          </div>
                          <button 
                             onClick={() => onTryPowerup(p.type as PowerupType)}
                             className="px-4 py-2 bg-white/20 hover:bg-white/30 rounded-full text-xs font-bold text-white tracking-wide border border-white/20 transition-all active:scale-95"
                          >
                             TRY OUT
                          </button>
                      </div>
                   ))}
                </div>
                <div className="mt-6 text-center text-white/40 text-sm">
                   Click TRY OUT to start a run with the power-up active!
                </div>
             </div>
         </div>
    );
};
