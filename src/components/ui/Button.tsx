import React from 'react';
import { cn } from '../../utils/cn';

interface ButtonProps extends React.ComponentProps<"button"> {
  children?: React.ReactNode;
  variant?: 'primary' | 'secondary' | 'ghost';
  size?: 'sm' | 'md' | 'lg' | string;
  isLoading?: boolean;
}

export function Button({ 
  children, 
  variant = 'primary', 
  isLoading, 
  className, 
  disabled, 
  ...props 
}: ButtonProps) {
  const baseStyles = "inline-flex items-center justify-center px-4 py-2 text-sm font-bold uppercase tracking-wider transition-colors duration-200 border rounded focus:outline-none focus:ring-2 focus:ring-game-primary focus:ring-offset-2 focus:ring-offset-game-bg disabled:opacity-50 disabled:cursor-not-allowed";
  
  const variants = {
    primary: "bg-game-primary text-black border-game-primary hover:bg-yellow-600 hover:border-yellow-600",
    secondary: "bg-game-secondary text-white border-game-secondary hover:bg-red-800 hover:border-red-800",
    ghost: "bg-transparent text-game-primary border-transparent hover:bg-game-panel hover:text-yellow-500",
  };

  return (
    <button 
      className={cn(baseStyles, variants[variant], className)}
      disabled={disabled || isLoading}
      {...props}
    >
      {isLoading ? (
        <span className="mr-2 inline-block h-4 w-4 animate-spin rounded-full border-2 border-solid border-current border-r-transparent align-[-0.125em]" />
      ) : null}
      {children}
    </button>
  );
}
