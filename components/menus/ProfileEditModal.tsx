import React, { useState, useEffect } from 'react';
import { signInWithGoogle, logout } from '../../services/firebase';

interface ProfileEditModalProps {
    isOpen: boolean;
    onClose: () => void;
    user: any;
    onSaveName: (data: any) => void;
}

const AVATAR_COLORS = [
    '#6366F1', // Indigo
    '#EF4444', // Red
    '#F59E0B', // Amber
    '#10B981', // Emerald
    '#3B82F6', // Blue
    '#EC4899', // Pink
    '#8B5CF6', // Violet
    '#14B8A6', // Teal
    '#111827', // Slate
];

export const ProfileEditModal: React.FC<ProfileEditModalProps> = ({ isOpen, onClose, user, onSaveName }) => {
    const [editNameValue, setEditNameValue] = useState("");
    const [avatarColor, setAvatarColor] = useState('#6366F1');
    const [avatarText, setAvatarText] = useState("");
    const [useCustom, setUseCustom] = useState(false);

    useEffect(() => {
        if (isOpen && user) {
            setEditNameValue(user.displayName || "");
            setAvatarColor(user.avatarColor || '#6366F1');
            setAvatarText(user.avatarText || "");
            setUseCustom(!!user.useCustomAvatar);
        }
    }, [isOpen, user]);

    const handleSave = () => {
        if (editNameValue.trim().length > 0) {
            onSaveName({
                displayName: editNameValue,
                avatarColor,
                avatarText: avatarText.toUpperCase(),
                useCustomAvatar: useCustom
            });
            onClose();
        }
    };

    const handleGoogleSignIn = async () => {
        await signInWithGoogle();
        onClose();
    };

    if (!isOpen) return null;

    const displayInitials = (avatarText || editNameValue || 'GU').substring(0, 2).toUpperCase();

    return (
        <div className="absolute inset-0 z-50 bg-black/40 backdrop-blur-sm flex flex-col items-center justify-center p-6 animate-fade-in">
              <div className="w-full max-w-sm glass-panel p-6 rounded-3xl shadow-2xl relative max-h-[90vh] overflow-y-auto no-scrollbar touch-pan-y">
                  <h2 className="text-xl font-black text-white mb-6 text-center tracking-wide drop-shadow-md">PROFILE SETTINGS</h2>
                  
                  {/* Avatar Preview */}
                  <div className="flex flex-col items-center mb-6">
                      <div className="relative group cursor-pointer transition-transform active:scale-95" onClick={() => user?.photoURL && setUseCustom(!useCustom)}>
                          <div 
                            className="w-24 h-24 rounded-full border-4 border-white/20 flex items-center justify-center overflow-hidden shadow-inner transition-colors duration-300"
                            style={{ backgroundColor: (useCustom || !user?.photoURL) ? avatarColor : 'transparent' }}
                          >
                               {!useCustom && user?.photoURL ? (
                                   <img src={user.photoURL} alt="User" className="w-full h-full object-cover" />
                               ) : (
                                   <div className="text-3xl font-bold text-white tracking-wider">
                                       {displayInitials}
                                   </div>
                               )}
                          </div>
                          {user?.photoURL && (
                            <div className="absolute bottom-0 right-0 w-8 h-8 bg-black/60 backdrop-blur-md rounded-full border border-white/20 flex items-center justify-center text-white text-[10px] shadow-lg">
                                {useCustom ? '📷' : '🎨'}
                            </div>
                          )}
                      </div>
                      {user?.photoURL && (
                          <button 
                            onClick={() => setUseCustom(!useCustom)}
                            className="mt-2 text-[10px] font-bold uppercase tracking-widest text-white/50 hover:text-white transition-colors"
                          >
                              {useCustom ? 'Switch to Google Photo' : 'Use Custom Avatar'}
                          </button>
                      )}
                  </div>
                  
                  {/* Customization Options */}
                  {(useCustom || !user?.photoURL) && (
                      <div className="mb-6 bg-black/20 p-4 rounded-2xl">
                          <label className="text-[10px] font-bold text-white/70 uppercase tracking-widest mb-3 block">Avatar Color</label>
                          <div className="flex flex-wrap gap-2 mb-4 justify-center">
                              {AVATAR_COLORS.map(c => (
                                  <button
                                      key={c}
                                      onClick={() => setAvatarColor(c)}
                                      className={`w-6 h-6 rounded-full border-2 transition-all hover:scale-110 ${avatarColor === c ? 'border-white scale-110 shadow-lg' : 'border-transparent opacity-70 hover:opacity-100'}`}
                                      style={{ backgroundColor: c }}
                                  />
                              ))}
                          </div>
                          <label className="text-[10px] font-bold text-white/70 uppercase tracking-widest mb-2 block">Custom Initials (Optional)</label>
                          <input 
                             type="text" 
                             value={avatarText}
                             onChange={(e) => setAvatarText(e.target.value.substring(0, 2))}
                             maxLength={2}
                             className="w-full bg-black/20 border border-white/10 rounded-xl px-4 py-2 text-white font-bold outline-none text-center tracking-widest uppercase placeholder-white/20"
                             placeholder={displayInitials}
                          />
                      </div>
                  )}
                  
                  <div className="mb-6">
                      <label className="text-[10px] font-bold text-white/70 uppercase tracking-widest mb-2 block">Display Name</label>
                      <div className="relative">
                          <input 
                             type="text" 
                             value={editNameValue}
                             onChange={(e) => setEditNameValue(e.target.value)}
                             maxLength={20}
                             className="w-full bg-black/20 border border-white/10 rounded-xl px-4 py-3 text-white font-bold outline-none focus:border-[#6366F1] transition-colors pr-16 placeholder-white/30 focus:bg-black/30"
                             placeholder="Enter name"
                          />
                          <div className="absolute right-4 top-1/2 -translate-y-1/2 text-xs font-bold text-white/50">
                              {editNameValue.length}/20
                          </div>
                      </div>
                  </div>
                  
                  <div className="mb-8 border-t border-white/10 pt-6">
                      <label className="text-[10px] font-bold text-white/70 uppercase tracking-widest mb-3 block">Account</label>
                      
                      {user && user.isAnonymous ? (
                           <button 
                               onClick={handleGoogleSignIn}
                               className="w-full py-3 rounded-xl font-bold bg-white text-slate-900 shadow-lg flex items-center justify-center gap-3 hover:bg-slate-100 transition-all active:scale-95"
                           >
                               <div className="w-5 h-5">
                                  <svg viewBox="0 0 24 24" className="w-full h-full">
                                      <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                                      <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                                      <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                                      <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                                  </svg>
                               </div>
                               Link Google Account
                           </button>
                      ) : (
                           <div className="flex gap-2">
                               <div className="flex-1 py-3 rounded-xl bg-green-500/20 border border-green-500/30 text-green-300 font-bold text-center text-sm flex items-center justify-center gap-2">
                                   <span>✓</span> Linked
                               </div>
                               <button 
                                   onClick={() => { logout(); onClose(); }}
                                   className="px-4 py-3 rounded-xl font-bold bg-red-500/10 text-red-300 border border-red-500/20 hover:bg-red-500/20 transition-all text-sm"
                               >
                                   Log Out
                               </button>
                           </div>
                      )}
                  </div>

                  <div className="flex gap-4">
                      <button 
                         onClick={onClose}
                         className="flex-1 py-3.5 rounded-xl font-bold bg-white/10 hover:bg-white/20 text-white border border-white/10 transition-all text-sm tracking-wide"
                      >
                         CANCEL
                      </button>
                      <button 
                         onClick={handleSave}
                         className="flex-1 py-3.5 rounded-xl font-bold bg-gradient-to-r from-amber-500 to-orange-600 text-white shadow-lg hover:shadow-orange-500/20 transition-all active:scale-95 text-sm tracking-wide"
                      >
                         SAVE
                      </button>
                  </div>
              </div>
          </div>
    );
};