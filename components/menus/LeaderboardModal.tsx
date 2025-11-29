
import React, { useEffect, useState } from 'react';
import { getLeaderboard, LeaderboardEntry } from '../../services/firebase';

interface LeaderboardModalProps {
    isOpen: boolean;
    onClose: () => void;
    user: any;
}

export const LeaderboardModal: React.FC<LeaderboardModalProps> = ({ isOpen, onClose, user }) => {
    const [leaderboardTab, setLeaderboardTab] = useState<'standard' | 'battle'>('standard');
    const [leaderboardData, setLeaderboardData] = useState<LeaderboardEntry[]>([]);
    const [leaderboardLoading, setLeaderboardLoading] = useState(false);

    useEffect(() => {
        if (isOpen) {
            const fetchLeaderboard = async () => {
                setLeaderboardLoading(true);
                const data = await getLeaderboard(leaderboardTab);
                setLeaderboardData(data);
                setLeaderboardLoading(false);
            };
            fetchLeaderboard();
        }
    }, [isOpen, leaderboardTab]);

    if (!isOpen) return null;

    return (
        <div className="absolute inset-0 z-50 bg-slate-900/90 backdrop-blur-lg flex flex-col items-center justify-center p-6 animate-fade-in">
              <div className="w-full max-w-2xl h-full flex flex-col max-h-[85vh]">
                  <div className="flex justify-between items-center mb-4">
                      <div className="flex items-center gap-3">
                        <span className="text-4xl">🏆</span>
                        <h2 className="text-3xl font-black text-white italic tracking-tighter">LEADERBOARD</h2>
                      </div>
                      <button onClick={onClose} className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center text-white hover:bg-white/20 transition-colors">✕</button>
                  </div>

                  {/* MODE TOGGLE */}
                  <div className="flex bg-white/5 p-1 rounded-xl mb-6 border border-white/10 w-full max-w-sm self-center">
                      <button 
                          onClick={() => setLeaderboardTab('standard')}
                          className={`flex-1 py-2 rounded-lg text-xs font-bold uppercase tracking-widest transition-all ${leaderboardTab === 'standard' ? 'bg-amber-500 text-black shadow-lg scale-100' : 'text-slate-400 hover:text-white hover:bg-white/5'}`}
                      >
                          Classic
                      </button>
                      <button 
                          onClick={() => setLeaderboardTab('battle')}
                          className={`flex-1 py-2 rounded-lg text-xs font-bold uppercase tracking-widest transition-all ${leaderboardTab === 'battle' ? 'bg-red-600 text-white shadow-lg scale-100' : 'text-slate-400 hover:text-white hover:bg-white/5'}`}
                      >
                          Battle
                      </button>
                  </div>

                  <div className="flex-1 overflow-hidden bg-white/5 rounded-3xl border border-white/10 flex flex-col">
                      <div className="grid grid-cols-6 p-4 bg-white/5 font-bold text-xs uppercase tracking-widest text-slate-400 border-b border-white/10">
                          <div className="col-span-1 text-center">Rank</div>
                          <div className="col-span-4 pl-2">Player</div>
                          <div className="col-span-1 text-right">Score</div>
                      </div>
                      
                      <div className="flex-1 overflow-y-auto no-scrollbar relative">
                          {leaderboardLoading ? (
                               <div className="absolute inset-0 flex items-center justify-center">
                                   <div className="w-8 h-8 border-2 border-amber-400 border-t-transparent rounded-full animate-spin"></div>
                               </div>
                          ) : (
                               <div className="flex flex-col">
                                   {leaderboardData.length === 0 ? (
                                       <div className="text-center p-8 text-white/30 italic">No records found yet.</div>
                                   ) : (
                                       leaderboardData.map((entry, index) => {
                                           const isMe = user && entry.uid === user.uid;
                                           return (
                                               <div 
                                                   key={entry.uid} 
                                                   className={`grid grid-cols-6 p-4 items-center border-b border-white/5 hover:bg-white/5 transition-colors
                                                      ${isMe ? 'bg-amber-500/10 hover:bg-amber-500/20' : ''}
                                                   `}
                                               >
                                                   <div className="col-span-1 flex justify-center">
                                                       {index < 3 ? (
                                                           <div className={`w-8 h-8 rounded-full flex items-center justify-center text-lg shadow-lg
                                                               ${index === 0 ? 'bg-yellow-400 text-yellow-900' : 
                                                                 index === 1 ? 'bg-slate-300 text-slate-800' : 'bg-orange-400 text-orange-900'}
                                                           `}>
                                                               {index === 0 ? '🥇' : index === 1 ? '🥈' : '🥉'}
                                                           </div>
                                                       ) : (
                                                           <span className="text-slate-400 font-bold text-lg">#{index + 1}</span>
                                                       )}
                                                   </div>
                                                   <div className="col-span-4 flex items-center gap-3 pl-2">
                                                       <div className="w-10 h-10 rounded-full bg-slate-700 overflow-hidden border border-white/20 flex-shrink-0">
                                                           {entry.photoURL ? (
                                                               <img src={entry.photoURL} alt="avi" className="w-full h-full object-cover" />
                                                           ) : (
                                                               <div className="w-full h-full flex items-center justify-center text-white/50 font-bold bg-gradient-to-br from-indigo-500 to-purple-600">
                                                                   {entry.displayName ? entry.displayName.charAt(0).toUpperCase() : '?'}
                                                               </div>
                                                           )}
                                                       </div>
                                                       <div className="flex flex-col">
                                                           <span className={`font-bold text-sm truncate ${isMe ? 'text-amber-300' : 'text-white'}`}>
                                                               {entry.displayName} {isMe && '(You)'}
                                                           </span>
                                                       </div>
                                                   </div>
                                                   <div className="col-span-1 text-right font-black text-xl text-white tracking-wide">
                                                       {entry.score}
                                                   </div>
                                               </div>
                                           );
                                       })
                                   )}
                               </div>
                          )}
                      </div>
                  </div>
              </div>
        </div>
    );
};
