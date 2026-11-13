import { ChevronDown } from 'lucide-react';

interface DateSeparatorProps {
  label: string;
}

export function DateSeparator({ label }: DateSeparatorProps) {
  return (
    <div className="relative flex items-center justify-center py-2">
      <div className="absolute inset-x-2 top-1/2 border-t border-[var(--border)] sm:inset-x-3" />
      <span className="relative inline-flex items-center gap-1 rounded-full border border-[var(--border)] bg-[var(--surface)] px-2.5 py-0.5 text-[11px] font-medium text-[var(--muted-foreground)] shadow-sm sm:px-3 sm:py-1 sm:text-xs">
        {label}
        <ChevronDown className="h-3 w-3" />
      </span>
    </div>
  );
}
