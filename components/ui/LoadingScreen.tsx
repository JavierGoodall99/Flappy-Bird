
import React from 'react';

export const LoadingScreen: React.FC = () => {
    return (
        <div className="w-full h-screen bg-slate-900 flex flex-col items-center justify-center">
            <div className="w-16 h-16 border-4 border-amber-400 border-t-transparent rounded-full animate-spin mb-4"></div>
            <h1 className="text-2xl font-bold text-white tracking-widest animate-pulse">LOADING PROFILE...</h1>
        </div>
    );
};
