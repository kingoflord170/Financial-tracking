import React, { useRef } from 'react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { Calendar, Clock, Sparkles } from 'lucide-react';

export interface DateTimePickerProps {
  label?: string;
  value: string; // ISO string or 'YYYY-MM-DDTHH:mm'
  onChange: (value: string) => void;
  required?: boolean;
  error?: string;
  helperText?: string;
  className?: string;
  disabled?: boolean;
}

export function DateTimePicker({
  label = 'Date & Time',
  value,
  onChange,
  required,
  error,
  helperText,
  className,
  disabled,
}: DateTimePickerProps) {
  const dateInputRef = useRef<HTMLInputElement>(null);
  const timeInputRef = useRef<HTMLInputElement>(null);

  // Parse date and time components
  let datePart = '';
  let timePart = '';

  if (value) {
    if (value.includes('T')) {
      const parts = value.split('T');
      datePart = parts[0];
      timePart = parts[1]?.slice(0, 5) || '12:00';
    } else if (value.includes(' ')) {
      const parts = value.split(' ');
      datePart = parts[0];
      timePart = parts[1]?.slice(0, 5) || '12:00';
    } else {
      datePart = value.slice(0, 10);
      timePart = '12:00';
    }
  } else {
    const now = new Date();
    const localIso = new Date(now.getTime() - now.getTimezoneOffset() * 60000).toISOString();
    datePart = localIso.slice(0, 10);
    timePart = localIso.slice(11, 16);
  }

  const handleDateChange = (newDate: string) => {
    if (!newDate) return;
    onChange(`${newDate}T${timePart || '12:00'}`);
  };

  const handleTimeChange = (newTime: string) => {
    if (!newTime) return;
    onChange(`${datePart || new Date().toISOString().slice(0, 10)}T${newTime}`);
  };

  const handleSetCurrentNow = () => {
    const now = new Date();
    const localIso = new Date(now.getTime() - now.getTimezoneOffset() * 60000).toISOString();
    onChange(localIso.slice(0, 16));
  };

  const openDatePicker = () => {
    if (disabled) return;
    try {
      dateInputRef.current?.showPicker();
    } catch {
      dateInputRef.current?.focus();
    }
  };

  const openTimePicker = () => {
    if (disabled) return;
    try {
      timeInputRef.current?.showPicker();
    } catch {
      timeInputRef.current?.focus();
    }
  };

  return (
    <div className={twMerge('w-full flex flex-col gap-1.5', className)}>
      {label && (
        <div className="flex items-center justify-between">
          <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
            {label}
            {required && <span className="text-destructive">*</span>}
          </label>
          <button
            type="button"
            onClick={handleSetCurrentNow}
            disabled={disabled}
            className="text-[11px] text-primary hover:text-primary-hover hover:underline flex items-center gap-1 font-medium transition-colors"
            title="Set to Current Date & Time"
          >
            <Sparkles className="h-3 w-3" />
            <span>Set to Now</span>
          </button>
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
        {/* Calendar Date Picker */}
        <div className="relative flex items-center">
          <button
            type="button"
            onClick={openDatePicker}
            disabled={disabled}
            tabIndex={-1}
            className="absolute left-3 p-0.5 text-primary hover:text-primary-hover transition-colors z-10 cursor-pointer"
            title="Open Calendar Date Picker"
          >
            <Calendar className="h-4 w-4" />
          </button>
          <input
            ref={dateInputRef}
            type="date"
            value={datePart}
            onChange={e => handleDateChange(e.target.value)}
            disabled={disabled}
            required={required}
            className={clsx(
              'flex h-10 w-full rounded-lg border border-input-border bg-input-bg pl-10 pr-3 py-2 text-sm text-input-fg font-medium transition-colors shadow-sm cursor-pointer',
              'focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-input-focus-border',
              'disabled:cursor-not-allowed disabled:opacity-60 disabled:bg-input-disabled',
              error && '!border-destructive focus:!ring-destructive/40 focus:!border-destructive'
            )}
          />
        </div>

        {/* Clock Time Picker */}
        <div className="relative flex items-center">
          <button
            type="button"
            onClick={openTimePicker}
            disabled={disabled}
            tabIndex={-1}
            className="absolute left-3 p-0.5 text-cyan-400 hover:text-cyan-300 transition-colors z-10 cursor-pointer"
            title="Open Clock Time Picker"
          >
            <Clock className="h-4 w-4" />
          </button>
          <input
            ref={timeInputRef}
            type="time"
            value={timePart}
            onChange={e => handleTimeChange(e.target.value)}
            disabled={disabled}
            required={required}
            className={clsx(
              'flex h-10 w-full rounded-lg border border-input-border bg-input-bg pl-10 pr-3 py-2 text-sm text-input-fg font-medium transition-colors shadow-sm cursor-pointer',
              'focus:outline-none focus:ring-2 focus:ring-cyan-500/40 focus:border-cyan-500',
              'disabled:cursor-not-allowed disabled:opacity-60 disabled:bg-input-disabled',
              error && '!border-destructive focus:!ring-destructive/40 focus:!border-destructive'
            )}
          />
        </div>
      </div>

      {error ? (
        <span className="text-xs font-medium text-destructive">{error}</span>
      ) : helperText ? (
        <span className="text-xs text-muted-foreground">{helperText}</span>
      ) : null}
    </div>
  );
}
