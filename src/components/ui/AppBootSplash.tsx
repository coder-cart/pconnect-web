'use client';

import { BRAND } from '@/lib/branding';
import { cn } from '@/lib/cn';

/** Compact boot splash used while the authenticated shell loads. */
export function AppBootSplash({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        'flex min-h-screen flex-col items-center justify-center gap-4 bg-[var(--background)] px-6',
        className,
      )}
    >
      <img
        src={BRAND.mark}
        alt={BRAND.name}
        width={48}
        height={48}
        className="h-12 w-12 object-contain"
      />
      <div
        className="h-5 w-5 animate-spin rounded-full border-2 border-[var(--border)] border-t-[var(--primary)]"
        role="status"
        aria-label="Loading"
      />
      <p className="text-xs text-[var(--muted)]">Loading workspace…</p>
    </div>
  );
}
