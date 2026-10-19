import React from 'react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  error?: string;
  helperText?: string;
}

export const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className, label, error, helperText, id, ...props }, ref) => {
    const generatedId = React.useId();
    const textareaId = id || generatedId;

    return (
      <div className="w-full flex flex-col gap-1.5">
        {label && (
          <label htmlFor={textareaId} className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
            {label}
          </label>
        )}
        <textarea
          id={textareaId}
          ref={ref}
          className={twMerge(
            clsx(
              'flex min-h-[80px] w-full rounded-lg border border-input-border bg-input-bg px-3 py-2 text-sm text-input-fg placeholder:text-input-placeholder transition-colors shadow-sm',
              'focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-input-focus-border',
              'disabled:cursor-not-allowed disabled:opacity-60 disabled:bg-input-disabled',
              error && '!border-destructive focus:!ring-destructive/40 focus:!border-destructive',
              className
            )
          )}
          {...props}
        />
        {error ? (
          <span className="text-xs font-medium text-destructive">{error}</span>
        ) : helperText ? (
          <span className="text-xs text-muted-foreground">{helperText}</span>
        ) : null}
      </div>
    );
  }
);

Textarea.displayName = 'Textarea';
