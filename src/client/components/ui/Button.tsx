import React from 'react';
import { soundEngine } from '../../audio/SoundEngine.js';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  fullWidth?: boolean;
}

export const Button: React.FC<ButtonProps> = ({
  children,
  variant = 'primary',
  size = 'md',
  fullWidth = false,
  className = '',
  onClick,
  disabled,
  ...props
}) => {
  const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
    if (!disabled) {
      soundEngine.playClick();
      if (onClick) onClick(e);
    }
  };

  const variantClass = {
    primary: 'btn-primary',
    secondary: 'btn-secondary',
    ghost: 'btn-ghost',
    danger: 'px-6 py-3 rounded-xl font-display font-bold tracking-wider uppercase transition-all duration-300 bg-red-600/80 hover:bg-red-500 text-white shadow-lg shadow-red-900/40 hover:shadow-red-500/50 hover:scale-[1.02] active:scale-[0.98]',
  }[variant];

  const sizeClass = {
    sm: 'text-xs py-2 px-4',
    md: 'text-sm py-3 px-6',
    lg: 'text-base py-4 px-8',
  }[size];

  return (
    <button
      className={`${variantClass} ${sizeClass} ${fullWidth ? 'w-full' : ''} ${className}`}
      onClick={handleClick}
      disabled={disabled}
      {...props}
    >
      {children}
    </button>
  );
};
