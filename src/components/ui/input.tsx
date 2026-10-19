import React from 'react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  helperText?: string;
  startAdornment?: React.ReactNode;
  endAdornment?: React.ReactNode;
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type = 'text', label, error, helperText, startAdornment, endAdornment, id, ...props }, ref) => {
    const generatedId = React.useId();
    const inputId = id || generatedId;

    return (
      <div className="w-full flex flex-col gap-1.5">
        {label && (
          <label htmlFor={inputId} className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
            {label}
          </label>
        )}
        <div className="relative flex items-center">
          {startAdornment && (
            <div className="absolute left-3 flex items-center pointer-events-none text-input-placeholder">
              {startAdornment}
            </div>
          )}
          <input
            id={inputId}
            type={type}
            ref={ref}
            className={twMerge(
              clsx(
                'flex h-10 w-full rounded-lg border border-input-border bg-input-bg px-3 py-2 text-sm text-input-fg placeholder:text-input-placeholder transition-colors shadow-sm',
                'focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-input-focus-border',
                'disabled:cursor-not-allowed disabled:opacity-60 disabled:bg-input-disabled',
                startAdornment && 'pl-9',
                endAdornment && 'pr-9',
                error && '!border-destructive focus:!ring-destructive/40 focus:!border-destructive',
                className
              )
            )}
            {...props}
          />
          {endAdornment && (
            <div className="absolute right-3 flex items-center pointer-events-none text-input-placeholder">
              {endAdornment}
            </div>
          )}
        </div>
        {error ? (
          <span className="text-xs font-medium text-destructive">{error}</span>
        ) : helperText ? (
          <span className="text-xs text-muted-foreground">{helperText}</span>
        ) : null}
      </div>
    );
  }
);

Input.displayName = 'Input';
