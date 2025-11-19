import React from 'react';

interface ButtonProps {
  onClick: () => void;
  children: React.ReactNode;
  variant?: 'primary' | 'secondary';
  className?: string;
}

export const Button: React.FC<ButtonProps> = ({ onClick, children, variant = 'primary', className = '' }) => {
  const baseStyles = "px-8 py-3 rounded-full font-bold text-lg transform transition-all duration-200 active:scale-95 shadow-lg hover:shadow-xl";
  const variants = {
    primary: "bg-gradient-to-r from-amber-400 to-orange-500 text-white border-b-4 border-orange-600 hover:brightness-110",
    secondary: "bg-white text-slate-800 border-b-4 border-slate-300 hover:bg-slate-50",
  };

  return (
    <button 
      onClick={onClick} 
      className={`${baseStyles} ${variants[variant]} ${className}`}
    >
      {children}
    </button>
  );
};