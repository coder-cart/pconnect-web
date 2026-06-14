import { Search } from 'lucide-react';
import { InputHTMLAttributes } from 'react';
import { cn } from '@/lib/cn';

interface SearchInputProps extends InputHTMLAttributes<HTMLInputElement> {
  containerClassName?: string;
}

export function SearchInput({
  className,
  containerClassName,
  placeholder = 'Search anything...',
  ...props
}: SearchInputProps) {
  return (
    <div className={cn('relative w-full', containerClassName)}>
      <Search
        className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--muted)]"
        aria-hidden
      />
      <input
        type="search"
        placeholder={placeholder}
        className={cn(
          'h-10 w-full rounded-full border border-[var(--border)] bg-[var(--surface-muted)] pl-10 pr-4 text-sm text-[var(--foreground)] transition-all placeholder:text-[var(--muted)] focus:border-[var(--primary)] focus:bg-[var(--surface)] focus:outline-none focus:ring-2 focus:ring-[var(--primary-soft)]',
          className,
        )}
        {...props}
      />
    </div>
  );
}
