'use client';

import { isStagingApp } from '@/lib/app-env';

/** Slim shell chip so staging is never mistaken for production. */
export function StagingBadge() {
  if (!isStagingApp()) {
    return null;
  }

  return (
    <span
      className="inline-flex shrink-0 items-center rounded-[var(--radius-sm)] border border-amber-400/50 bg-amber-500/20 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-amber-100"
      title="Staging / development environment — not production"
      data-testid="staging-badge"
    >
      Staging
    </span>
  );
}
