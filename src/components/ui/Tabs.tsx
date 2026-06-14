'use client';

import { cn } from '@/lib/cn';

interface TabItem {
  id: string;
  label: string;
  badge?: number;
}

interface TabsProps {
  items: TabItem[];
  activeId: string;
  onChange: (id: string) => void;
  className?: string;
}

export function Tabs({ items, activeId, onChange, className }: TabsProps) {
  return (
    <div
      role="tablist"
      className={cn(
        'flex flex-wrap gap-1 border-b border-[var(--border)]',
        className,
      )}
    >
      {items.map((item) => {
        const isActive = item.id === activeId;

        return (
          <button
            key={item.id}
            type="button"
            role="tab"
            aria-selected={isActive}
            onClick={() => onChange(item.id)}
            className={cn(
              'relative -mb-px inline-flex items-center gap-2 px-3 py-2.5 text-sm font-medium transition-colors',
              isActive
                ? 'text-[var(--primary)]'
                : 'text-[var(--muted)] hover:text-[var(--foreground)]',
            )}
          >
            {item.label}
            {item.badge ? (
              <span className="rounded-full bg-[var(--danger-soft)] px-1.5 py-0.5 text-[10px] font-semibold text-[var(--danger)]">
                {item.badge}
              </span>
            ) : null}
            {isActive ? (
              <span className="absolute inset-x-0 -bottom-px h-0.5 rounded-full bg-[var(--primary)]" />
            ) : null}
          </button>
        );
      })}
    </div>
  );
}
