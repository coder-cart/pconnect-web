import { SelectHTMLAttributes, forwardRef } from 'react';
import { cn } from '@/lib/cn';

interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  error?: string;
  options: Array<{ value: string; label: string }>;
}

export const Select = forwardRef<HTMLSelectElement, SelectProps>(
  ({ className, label, error, options, id, ...props }, ref) => {
    const selectId = id ?? props.name;

    return (
      <label className="block space-y-1.5">
        {label ? (
          <span className="text-sm font-medium text-[var(--foreground)]">{label}</span>
        ) : null}
        <select
          ref={ref}
          id={selectId}
          className={cn(
            'h-11 w-full rounded-[var(--radius-md)] border bg-[var(--surface)] px-3 text-sm text-[var(--foreground)] focus:border-[var(--primary)] focus:outline-none focus:ring-2 focus:ring-[var(--primary-soft)]',
            error ? 'border-[var(--danger)]' : 'border-[var(--border)]',
            className,
          )}
          {...props}
        >
          {options.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
        {error ? <span className="text-xs text-[var(--danger)]">{error}</span> : null}
      </label>
    );
  },
);

Select.displayName = 'Select';
