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

  if (!orderId) return null;

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <button
        type="button"
        className="absolute inset-0 bg-black/30"
        aria-label="Close order"
        onClick={onClose}
      />
      <aside
        className={cn(
          'relative flex h-full w-full flex-col border-l border-[var(--border)] bg-[var(--background)] shadow-[var(--shadow-md)]',
          fullScreen ? 'max-w-none' : 'max-w-6xl',
        )}
      >
        <div className="flex items-center justify-end gap-2 border-b border-[var(--border)] px-4 py-2">
          <button
            type="button"
            onClick={() => setFullScreen((current) => !current)}
            className="inline-flex items-center gap-1.5 rounded-[var(--radius-md)] px-2.5 py-1.5 text-sm font-medium text-[var(--foreground)] hover:bg-[var(--surface-muted)]"
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
            className="inline-flex items-center gap-1.5 rounded-[var(--radius-md)] px-2.5 py-1.5 text-sm font-medium text-[var(--foreground)] hover:bg-[var(--surface-muted)]"
          >
            <SquareArrowOutUpRight className="h-4 w-4" />
            Open in page
          </Link>
          <button
            type="button"
            onClick={onClose}
            className="rounded-[var(--radius-md)] p-2 text-[var(--muted)] hover:bg-[var(--surface-muted)]"
            aria-label="Close order"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto px-4 py-4 sm:px-6">
          <OrderDetailView orderId={orderId} embedded onClose={onClose} />
        </div>
      </aside>
    </div>
  );
}
