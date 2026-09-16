import React from 'react';
import { cn } from '../../utils/cn';

interface CardProps extends React.ComponentProps<"div"> {
  children?: React.ReactNode;
}

export function Card({ children, className, ...props }: CardProps) {
  return (
    <div 
      className={cn("bg-game-panel border border-gray-800 rounded-lg p-6 shadow-xl", className)}
      {...props}
    >
      {children}
    </div>
  );
}
