'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Maximize2, Minimize2, SquareArrowOutUpRight, X } from 'lucide-react';
import { OrderDetailView } from '@/app/(app)/orders/[id]/page';
import { cn } from '@/lib/cn';

export function OrderDetailDrawer({
  orderId,
  onClose,
}: {
  orderId: string | null;
  onClose: () => void;
}) {
  const [fullScreen, setFullScreen] = useState(false);

  useEffect(() => {
    setFullScreen(false);
  }, [orderId]);

  useEffect(() => {
    if (!orderId) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = previous;
    };
  }, [orderId]);

  if (!orderId) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-stretch justify-end">
      <button
        type="button"
        className="absolute inset-0 bg-black/30"
        aria-label="Close order"
        onClick={onClose}
      />
      <aside
        className={cn(
          'relative flex h-[100dvh] max-h-[100dvh] w-full flex-col border-l border-[var(--border)] bg-[var(--background)] shadow-[var(--shadow-md)]',
          fullScreen ? 'max-w-none' : 'max-w-6xl lg:max-w-[min(72rem,100vw)]',
        )}
      >
        <div
          className="flex flex-wrap items-center justify-end gap-1 border-b border-[var(--border)] px-2 py-2 sm:gap-2 sm:px-4"
          style={{ paddingTop: 'max(0.5rem, var(--safe-top))' }}
        >
          <button
            type="button"
            onClick={() => setFullScreen((current) => !current)}
            className="hidden min-h-touch items-center gap-1.5 rounded-[var(--radius-md)] px-2.5 py-1.5 text-sm font-medium text-[var(--foreground)] hover:bg-[var(--surface-muted)] sm:inline-flex"
          >
            {fullScreen ? (
              <Minimize2 className="h-4 w-4" />
            ) : (
              <Maximize2 className="h-4 w-4" />
            )}
            {fullScreen ? 'Minimize' : 'Full screen'}
          </button>
          <Link
            href={`/orders/${orderId}`}
            className="inline-flex min-h-touch items-center gap-1.5 rounded-[var(--radius-md)] px-2.5 py-1.5 text-sm font-medium text-[var(--foreground)] hover:bg-[var(--surface-muted)]"
          >
            <SquareArrowOutUpRight className="h-4 w-4" />
            <span className="hidden sm:inline">Open in page</span>
            <span className="sm:hidden">Open</span>
          </Link>
          <button
            type="button"
            onClick={onClose}
            className="inline-flex min-h-touch min-w-touch items-center justify-center rounded-[var(--radius-md)] text-[var(--muted)] hover:bg-[var(--surface-muted)]"
            aria-label="Close order"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        <div
          className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-3 py-4 sm:px-6"
          style={{ paddingBottom: 'max(1rem, var(--safe-bottom))' }}
        >
          <OrderDetailView orderId={orderId} embedded onClose={onClose} />
        </div>
      </aside>
    </div>
  );
}
