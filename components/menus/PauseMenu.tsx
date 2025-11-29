
import React from 'react';
import { Button } from '../Button';

interface PauseMenuProps {
    onResume: () => void;
    onQuit: () => void;
    isMuted: boolean;
    toggleMute: (e: React.MouseEvent) => void;
}

export const PauseMenu: React.FC<PauseMenuProps> = ({ onResume, onQuit, isMuted, toggleMute }) => {
    return (
        <div className="absolute inset-0 flex items-center justify-center z-40 bg-slate-900/40 backdrop-blur-md">
          <div className="glass-panel p-6 md:p-8 rounded-3xl text-center min-w-[300px] md:min-w-[320px] shadow-2xl border border-white/10 max-h-[90vh] overflow-y-auto no-scrollbar mx-4">
             <h2 className="text-3xl md:text-4xl font-black text-white tracking-wide drop-shadow-sm mb-6 md:mb-8">PAUSED</h2>
             <div className="flex flex-col gap-4">
                <Button onClick={onResume} className="w-full">RESUME</Button>
                <Button 
                   onClick={(e) => toggleMute(e as any)} 
                   variant="secondary" 
                   className="w-full"
                >
                   <div className="flex items-center justify-center gap-2">
                       <span>{isMuted ? 'UNMUTE SOUND' : 'MUTE SOUND'}</span>
                       <span className="text-xl">{isMuted ? '🔇' : '🔊'}</span>
                   </div>
                </Button>
                <Button onClick={onQuit} variant="secondary" className="w-full">QUIT</Button>
             </div>
          </div>
        </div>
    );
};
