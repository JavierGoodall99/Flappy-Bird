
import React from 'react';
import { WORLDS } from '../../constants';
import { World } from '../../types';

interface WorldSelectModalProps {
    isOpen: boolean;
    onClose: () => void;
    currentWorldId: string;
    onSelectWorld: (id: string) => void;
}

export const WorldSelectModal: React.FC<WorldSelectModalProps> = ({ isOpen, onClose, currentWorldId, onSelectWorld }) => {
    if (!isOpen) return null;

    return (
        <div className="absolute inset-0 z-50 bg-slate-900/90 backdrop-blur-lg flex flex-col items-center justify-center p-4 animate-fade-in">
           <div className="w-full max-w-4xl h-full flex flex-col max-h-[90vh]">
              <div className="flex justify-between items-center mb-6 flex-shrink-0">
                  <h2 className="text-3xl font-black text-white italic tracking-tighter">SELECT WORLD</h2>
                  <button onClick={onClose} className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center text-white hover:bg-white/20 transition-colors">✕</button>
              </div>

              <div className="flex-1 overflow-y-auto grid grid-cols-1 sm:grid-cols-2 gap-4 pb-8 no-scrollbar content-start touch-pan-y">
                 {WORLDS.map((world) => {
                     const isSelected = currentWorldId === world.id;
                     
                     return (
                         <div 
                            key={world.id}
                            role="button"
                            onClick={() => onSelectWorld(world.id)}
                            className={`relative rounded-2xl overflow-hidden border-2 transition-all cursor-pointer group h-40 md:h-48
                                ${isSelected ? 'border-amber-400 scale-[1.02] shadow-[0_0_20px_rgba(251,191,36,0.3)]' : 'border-white/10 hover:border-white/30 hover:scale-[1.01]'}
                            `}
                         >
                            {/* Background Preview */}
                            <div 
                                className="absolute inset-0 w-full h-full"
                                style={{ backgroundColor: world.skyColor }}
                            >
                                <div 
                                    className="absolute inset-0 w-full h-full opacity-80"
                                    style={{ 
                                        backgroundImage: `url(${world.cityImage})`,
                                        backgroundSize: 'auto 100%',
                                        backgroundPosition: 'center bottom',
                                        backgroundRepeat: 'repeat-x',
                                        filter: world.filter 
                                    }}
                                />
                            </div>

                            {/* Content Overlay */}
                            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent p-4 flex flex-col justify-end">
                                <div className="flex justify-between items-end">
                                    <div>
                                        <h3 className="text-xl font-bold text-white mb-1 shadow-black drop-shadow-md">{world.name}</h3>
                                        <p className="text-xs text-white/70 font-medium max-w-[80%]">{world.description}</p>
                                    </div>
                                    {isSelected && (
                                        <div className="px-3 py-1 bg-amber-500 text-black font-bold text-xs uppercase rounded-full shadow-lg">
                                            Selected
                                        </div>
                                    )}
                                </div>
                            </div>
                         </div>
                     );
                 })}
              </div>
           </div>
        </div>
    );
};
