
import React from 'react';

interface NotificationToastProps {
  notification: { message: string, type: 'unlock' | 'info' } | null;
}

export const NotificationToast: React.FC<NotificationToastProps> = ({ notification }) => {
  if (!notification) return null;
  
  return (
      <div className="absolute top-24 left-1/2 transform -translate-x-1/2 z-50 animate-fade-in-up pointer-events-none">
          <div className={`px-6 py-3 rounded-full shadow-2xl flex items-center gap-3 border backdrop-blur-md
              ${notification.type === 'unlock' ? 'bg-amber-500/90 border-amber-200' : 'bg-blue-500/90 border-blue-200'}
          `}>
              <span className="text-2xl">{notification.type === 'unlock' ? '🎁' : 'ℹ️'}</span>
              <span className="text-white font-black uppercase tracking-wide text-sm drop-shadow-md">
                  {notification.message}
              </span>
          </div>
      </div>
  );
};
