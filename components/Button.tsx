
import React from 'react';

interface ButtonProps {
  onClick: () => void;
  children: React.ReactNode;
  variant?: 'primary' | 'secondary';
  className?: string;
  disabled?: boolean;
}

export const Button: React.FC<ButtonProps> = ({ onClick, children, variant = 'primary', className = '', disabled = false }) => {
  const baseStyles = "px-8 py-3 rounded-full font-bold text-lg transform transition-all duration-200 shadow-lg flex items-center justify-center";
  
  // Styles for active state
  const activeStyles = "active:scale-95 hover:shadow-xl hover:brightness-110";
  // Styles for disabled state
  const disabledStyles = "opacity-50 cursor-not-allowed grayscale pointer-events-none";

  const variants = {
    primary: "bg-gradient-to-r from-amber-400 to-orange-500 text-white border-b-4 border-orange-600",
    secondary: "bg-white text-slate-800 border-b-4 border-slate-300 hover:bg-slate-50",
  };

  return (
    <button 
      onClick={disabled ? undefined : onClick} 
      disabled={disabled}
      className={`${baseStyles} ${variants[variant]} ${className} ${disabled ? disabledStyles : activeStyles}`}
    >
      {children}
    </button>
  );
};
