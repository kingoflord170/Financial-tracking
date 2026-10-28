import React, { useState, useRef, useEffect } from 'react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { ChevronDown, Check } from 'lucide-react';

export interface SelectOption {
  label: string;
  value: string | number;
  disabled?: boolean;
}

export interface SelectProps extends Omit<React.SelectHTMLAttributes<HTMLSelectElement>, 'options'> {
  label?: string;
  error?: string;
  placeholder?: string;
  options?: SelectOption[];
}

export const Select = React.forwardRef<HTMLSelectElement, SelectProps>(
  ({ className, label, error, options, children, id, value, onChange, disabled, placeholder, ...props }, ref) => {
    const generatedId = React.useId();
    const selectId = id || generatedId;
    const [isOpen, setIsOpen] = useState(false);
    const containerRef = useRef<HTMLDivElement>(null);
    const nativeSelectRef = useRef<HTMLSelectElement | null>(null);

    // Combine forwarded ref and internal ref for the hidden native select
    const handleRef = (el: HTMLSelectElement | null) => {
      nativeSelectRef.current = el;
      if (typeof ref === 'function') {
        ref(el);
      } else if (ref) {
        (ref as React.MutableRefObject<HTMLSelectElement | null>).current = el;
      }
    };

    // Extract options from either props.options or props.children (<option>)
    const parsedOptions: SelectOption[] = React.useMemo(() => {
      if (options && options.length > 0) return options;

      const opts: SelectOption[] = [];
      React.Children.forEach(children, child => {
        if (React.isValidElement(child) && child.type === 'option') {
          const optProps = child.props as React.OptionHTMLAttributes<HTMLOptionElement>;
          opts.push({
            value: (optProps.value !== undefined ? optProps.value : child.props.children) as string | number,
            label: String(child.props.children || optProps.label || optProps.value || ''),
            disabled: optProps.disabled,
          });
        }
      });
      return opts;
    }, [options, children]);

    // Determine currently selected option label
    const selectedOption = parsedOptions.find(opt => String(opt.value) === String(value));
    const displayLabel = selectedOption?.label || (value ? String(value) : placeholder || (parsedOptions[0]?.label ?? 'Select an option'));

    // Close on click outside
    useEffect(() => {
      const handleClickOutside = (event: MouseEvent) => {
        if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
          setIsOpen(false);
        }
      };

      if (isOpen) {
        document.addEventListener('mousedown', handleClickOutside);
      }
      return () => {
        document.removeEventListener('mousedown', handleClickOutside);
      };
    }, [isOpen]);

    // Handle selecting an option
    const handleSelect = (opt: SelectOption) => {
      if (opt.disabled || disabled) return;
      setIsOpen(false);

      if (nativeSelectRef.current) {
        nativeSelectRef.current.value = String(opt.value);
      }

      if (onChange) {
        const syntheticEvent = {
          target: {
            name: props.name || '',
            value: String(opt.value),
          },
          currentTarget: {
            name: props.name || '',
            value: String(opt.value),
          },
        } as unknown as React.ChangeEvent<HTMLSelectElement>;

        onChange(syntheticEvent);
      }
    };

    // Keyboard navigation
    const handleKeyDown = (e: React.KeyboardEvent) => {
      if (disabled) return;
      if (e.key === 'Enter' || e.key === ' ' || e.key === 'ArrowDown') {
        e.preventDefault();
        setIsOpen(prev => !prev);
      } else if (e.key === 'Escape') {
        setIsOpen(false);
      }
    };

    return (
      <div className="w-full flex flex-col gap-1.5" ref={containerRef}>
        {label && (
          <label htmlFor={selectId} className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
            {label}
          </label>
        )}

        <div className="relative">
          {/* Hidden native select for form accessibility and validity checks */}
          <select
            id={selectId}
            ref={handleRef}
            value={value}
            onChange={onChange}
            disabled={disabled}
            className="sr-only"
            tabIndex={-1}
            aria-hidden="true"
            {...props}
          >
            {parsedOptions.map(opt => (
              <option key={String(opt.value)} value={opt.value} disabled={opt.disabled}>
                {opt.label}
              </option>
            ))}
          </select>

          {/* Custom Animated Dropdown Trigger */}
          <button
            type="button"
            id={`${selectId}-button`}
            aria-haspopup="listbox"
            aria-expanded={isOpen}
            disabled={disabled}
            onClick={() => setIsOpen(prev => !prev)}
            onKeyDown={handleKeyDown}
            className={twMerge(
              clsx(
                'flex h-10 w-full items-center justify-between rounded-lg border border-input-border bg-input-bg px-3 py-2 text-sm text-input-fg shadow-sm transition-all duration-200 cursor-pointer text-left',
                'focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-input-focus-border',
                'hover:border-input-focus-border/70',
                isOpen && 'ring-2 ring-primary/40 border-input-focus-border',
                disabled && 'cursor-not-allowed opacity-60 bg-input-disabled hover:border-input-border',
                error && '!border-destructive focus:!ring-destructive/40 focus:!border-destructive',
                className
              )
            )}
          >
            <span className="truncate pr-2 font-medium">
              {displayLabel}
            </span>
            <ChevronDown
              className={clsx(
                'h-4 w-4 shrink-0 text-input-placeholder transition-transform duration-200 ease-out',
                isOpen && 'rotate-180 text-primary'
              )}
            />
          </button>

          {/* Animated Dropdown Menu Popover */}
          {isOpen && (
            <div
              role="listbox"
              className={clsx(
                'absolute left-0 top-[calc(100%+4px)] z-50 w-full max-h-60 overflow-y-auto rounded-xl border border-border bg-card-elevated/95 backdrop-blur-md p-1 shadow-2xl',
                'animate-dropdown-open origin-top'
              )}
            >
              {parsedOptions.map(opt => {
                const isSelected = String(opt.value) === String(value);

                return (
                  <div
                    key={String(opt.value)}
                    role="option"
                    aria-selected={isSelected}
                    onClick={() => handleSelect(opt)}
                    className={clsx(
                      'group flex items-center justify-between px-3 py-2 text-xs rounded-lg transition-all duration-150',
                      opt.disabled
                        ? 'cursor-not-allowed opacity-40 text-muted-foreground'
                        : 'cursor-pointer hover:bg-primary/15 hover:text-primary active:scale-[0.99]',
                      isSelected ? 'bg-primary/20 text-primary font-bold' : 'text-foreground font-medium'
                    )}
                  >
                    <span className="truncate pr-2">{opt.label}</span>
                    {isSelected && (
                      <Check className="h-3.5 w-3.5 shrink-0 text-primary animate-fade-in" />
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {error && <span className="text-xs font-medium text-destructive">{error}</span>}
      </div>
    );
  }
);

Select.displayName = 'Select';
