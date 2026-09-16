import React from 'react';
import { Flame, Sparkles } from 'lucide-react';
import { cn } from '../../utils/cn';

interface SpiritSpinnerProps {
  size?: 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
  label?: string;
}

export const SpiritSpinner: React.FC<SpiritSpinnerProps> = ({
  size = 'md',
  className,
  label
}) => {
  const sizeMap = {
    sm: 'w-5 h-5',
    md: 'w-8 h-8',
    lg: 'w-12 h-12',
    xl: 'w-16 h-16'
  };

  const ringSizeMap = {
    sm: 'w-6 h-6 border-2',
    md: 'w-10 h-10 border-2',
    lg: 'w-16 h-16 border-3',
    xl: 'w-20 h-20 border-4'
  };

  return (
    <div className={cn("inline-flex flex-col items-center justify-center gap-3", className)}>
      <div className="relative flex items-center justify-center">
        {/* Outer glowing spinning ring */}
        <div 
          className={cn(
            "rounded-full border-solid border-amber-500/20 border-t-amber-400 border-r-indigo-500 animate-spin",
            ringSizeMap[size]
          )} 
        />
        
        {/* Center mythological spirit flame */}
        <div className="absolute inset-0 flex items-center justify-center">
          <Flame 
            className={cn(
              "text-amber-400 animate-pulse drop-shadow-[0_0_8px_rgba(245,158,11,0.6)]",
              sizeMap[size]
            )} 
          />
        </div>
      </div>

      {label && (
        <p className="text-xs sm:text-sm font-semibold tracking-wider text-amber-300/90 uppercase animate-pulse">
          {label}
        </p>
      )}
    </div>
  );
};

interface SpiritLoadingScreenProps {
  message?: string;
  subMessage?: string;
  fullScreen?: boolean;
}

export const SpiritLoadingScreen: React.FC<SpiritLoadingScreenProps> = ({
  message = "Đang kết nối Thần Điện...",
  subMessage = "Đang xác thực thông tin linh hồn và linh thú bảo hộ",
  fullScreen = true
}) => {
  return (
    <div 
      className={cn(
        "flex flex-col items-center justify-center bg-slate-950 text-slate-100 p-6 select-none",
        fullScreen ? "fixed inset-0 z-50 min-h-screen" : "w-full py-16"
      )}
    >
      {/* Background ambient lighting */}
      <div className="absolute w-72 h-72 rounded-full bg-amber-500/10 blur-3xl pointer-events-none -top-10 -left-10" />
      <div className="absolute w-72 h-72 rounded-full bg-indigo-600/10 blur-3xl pointer-events-none -bottom-10 -right-10" />

      <div className="relative z-10 flex flex-col items-center max-w-sm text-center">
        {/* Animated Spirit Core */}
        <div className="relative mb-6">
          <div className="w-20 h-20 rounded-2xl bg-gradient-to-tr from-amber-500 to-indigo-600 p-0.5 shadow-2xl shadow-amber-500/20 animate-pulse">
            <div className="w-full h-full bg-slate-900 rounded-[14px] flex items-center justify-center">
              <Flame className="w-10 h-10 text-amber-400 drop-shadow-[0_0_12px_rgba(245,158,11,0.8)]" />
            </div>
          </div>
          <div className="absolute -top-1 -right-1">
            <Sparkles className="w-5 h-5 text-indigo-400 animate-spin" />
          </div>
        </div>

        {/* Status Message */}
        <h3 className="text-base sm:text-lg font-black tracking-wider bg-gradient-to-r from-amber-200 via-white to-amber-400 bg-clip-text text-transparent uppercase mb-2">
          {message}
        </h3>
        <p className="text-xs sm:text-sm text-slate-400 font-medium">
          {subMessage}
        </p>

        {/* Subtle horizontal loader line */}
        <div className="w-44 h-1 bg-slate-800 rounded-full mt-6 overflow-hidden">
          <div className="h-full bg-gradient-to-r from-amber-400 via-indigo-500 to-amber-400 rounded-full animate-[shimmer_1.5s_infinite_linear] w-full" />
        </div>
      </div>
    </div>
  );
};

export const TopProgressBar: React.FC<{ isVisible: boolean }> = ({ isVisible }) => {
  if (!isVisible) return null;

  return (
    <div className="fixed top-0 left-0 right-0 z-50 h-1 bg-transparent overflow-hidden pointer-events-none">
      <div className="h-full bg-gradient-to-r from-amber-400 via-rose-500 to-indigo-500 w-full animate-pulse shadow-[0_0_10px_rgba(245,158,11,0.8)]" />
    </div>
  );
};

// ================= Skeleton Placeholders =================

interface SkeletonProps extends React.HTMLAttributes<HTMLDivElement> {
  className?: string;
}

export const Skeleton: React.FC<SkeletonProps> = ({ className, ...props }) => {
  return (
    <div
      className={cn(
        "animate-pulse rounded-xl bg-slate-800/60 border border-slate-700/40",
        className
      )}
      {...props}
    />
  );
};

export const CardSkeleton: React.FC<{ className?: string }> = ({ className }) => {
  return (
    <div className={cn("p-5 rounded-2xl bg-slate-900/80 border border-slate-800 flex flex-col gap-3", className)}>
      <div className="flex items-center justify-between">
        <Skeleton className="h-5 w-32" />
        <Skeleton className="h-8 w-8 rounded-full" />
      </div>
      <Skeleton className="h-4 w-48" />
      <div className="mt-4 flex gap-2">
        <Skeleton className="h-8 flex-1 rounded-lg" />
        <Skeleton className="h-8 w-20 rounded-lg" />
      </div>
    </div>
  );
};

export const PageSkeleton: React.FC = () => {
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 w-full flex flex-col gap-6">
      {/* Header skeleton */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex flex-col gap-2">
          <Skeleton className="h-8 w-48 sm:w-64" />
          <Skeleton className="h-4 w-36 sm:w-48" />
        </div>
        <Skeleton className="h-10 w-32 rounded-xl" />
      </div>

      {/* Hero card skeleton */}
      <Skeleton className="h-48 sm:h-64 w-full rounded-2xl" />

      {/* Grid skeleton */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
        <CardSkeleton />
        <CardSkeleton />
        <CardSkeleton />
      </div>
    </div>
  );
};
