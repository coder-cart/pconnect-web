'use client';

import Link from 'next/link';
import { OrderLifecycleSummary } from '@/lib/orders';
import { cn } from '@/lib/cn';

export function OrderLifecycleBoard({
  summary,
  activeStage,
}: {
  summary: OrderLifecycleSummary;
  activeStage?: string;
}) {
  const cards = [
    { stage: '', label: 'Total', count: summary.total, href: '/orders' },
    ...summary.groups.map((group) => ({
      stage: group.stage,
      label: group.label,
      count: group.count,
      href: `/orders?lifecycleStage=${group.stage}`,
    })),
  ];

  return (
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
      {cards.map((card) => {
        const selected = activeStage === card.stage || (!activeStage && card.stage === '');
        return (
          <Link
            key={card.label}
            href={card.href}
            className={cn(
              'rounded-[var(--radius-md)] border bg-[var(--surface)] px-4 py-3 hover:bg-[var(--surface-muted)]',
              selected
                ? 'border-[var(--primary)]'
                : 'border-[var(--border)]',
            )}
          >
            <p className="text-xs font-medium uppercase tracking-wide text-[var(--muted)]">
              {card.label}
            </p>
            <p className="mt-1 text-2xl font-semibold text-[var(--foreground)]">
              {card.count}
            </p>
          </Link>
        );
      })}
    </div>
  );
}
