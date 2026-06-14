import { InputHTMLAttributes, ReactNode, forwardRef } from 'react';
import { cn } from '@/lib/cn';

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  hint?: string;
  leadingIcon?: ReactNode;
  trailingIcon?: ReactNode;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  (
    {
      className,
      label,
      error,
      hint,
      leadingIcon,
      trailingIcon,
      id,
      ...props
    },
    ref,
  ) => {
    const inputId = id ?? props.name;

    return (
      <label className="block space-y-1.5">
        {label ? (
          <span className="text-sm font-medium text-[var(--foreground)]">
            {label}
          </span>
        ) : null}

        <div className="relative">
          {leadingIcon ? (
            <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[var(--muted)]">
              {leadingIcon}
            </span>
          ) : null}

          <input
            ref={ref}
            id={inputId}
            aria-invalid={Boolean(error)}
            aria-describedby={
              error ? `${inputId}-error` : hint ? `${inputId}-hint` : undefined
            }
            className={cn(
              'h-11 w-full rounded-[var(--radius-md)] border bg-[var(--surface)] px-3 text-sm text-[var(--foreground)] transition-colors placeholder:text-[var(--muted)] focus:border-[var(--primary)] focus:outline-none focus:ring-2 focus:ring-[var(--primary-soft)]',
              leadingIcon ? 'pl-10' : '',
              trailingIcon ? 'pr-10' : '',
              error
                ? 'border-[var(--danger)] focus:border-[var(--danger)] focus:ring-[var(--danger-soft)]'
                : 'border-[var(--border)]',
              className,
            )}
            {...props}
          />

          {trailingIcon ? (
            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--muted)]">
              {trailingIcon}
            </span>
          ) : null}
        </div>

        {error ? (
          <span
            id={`${inputId}-error`}
            className="text-xs text-[var(--danger)]"
            role="alert"
          >
            {error}
          </span>
        ) : null}

        {!error && hint ? (
          <span id={`${inputId}-hint`} className="text-xs text-[var(--muted)]">
            {hint}
          </span>
        ) : null}
      </label>
    );
  },
);

Input.displayName = 'Input';
