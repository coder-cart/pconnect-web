import { ChevronDown } from 'lucide-react';

interface DateSeparatorProps {
  label: string;
}

export function DateSeparator({ label }: DateSeparatorProps) {
  return (
    <div className="relative flex items-center justify-center py-2">
      <div className="absolute inset-x-0 top-1/2 border-t border-[var(--border)]" />
      <span className="relative inline-flex items-center gap-1 rounded-full border border-[var(--border)] bg-[var(--surface)] px-3 py-1 text-xs font-medium text-[var(--muted-foreground)] shadow-sm">
        {label}
        <ChevronDown className="h-3 w-3" />
      </span>
    </div>
  );
}
