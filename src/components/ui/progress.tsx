import React from 'react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export interface ProgressProps extends React.HTMLAttributes<HTMLDivElement> {
  value: number; // 0 to 100+
  max?: number;
  indicatorClassName?: string;
  variant?: 'default' | 'success' | 'warning' | 'danger' | 'gradient';
}

export function Progress({
  value,
  max = 100,
  variant = 'default',
  indicatorClassName,
  className,
  ...props
}: ProgressProps) {
  const percentage = Math.min(Math.max(0, (value / max) * 100), 100);

  const variantStyles = {
    default: 'bg-primary',
    success: 'bg-emerald-500',
    warning: 'bg-amber-500',
    danger: 'bg-rose-500',
    gradient: 'bg-gradient-to-r from-blue-500 via-indigo-500 to-cyan-400',
  };

  return (
    <div
      role="progressbar"
      aria-valuenow={value}
      aria-valuemin={0}
      aria-valuemax={max}
      className={twMerge(clsx('relative h-2 w-full overflow-hidden rounded-full bg-secondary', className))}
      {...props}
    >
      <div
        className={twMerge(
          clsx('h-full w-full flex-1 transition-all duration-300 rounded-full', variantStyles[variant], indicatorClassName)
        )}
        style={{ transform: `translateX(-${100 - percentage}%)` }}
      />
    </div>
  );
}
