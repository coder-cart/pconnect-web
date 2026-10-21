'use client';

import { useEffect } from 'react';
import { CheckCircle2, CircleAlert, Info } from 'lucide-react';
import { cn } from '@/lib/cn';

export type StatusToastTone = 'success' | 'error' | 'info';

export interface StatusToastMessage {
  id: number;
  text: string;
  tone: StatusToastTone;
}

interface StatusToastProps {
  message: StatusToastMessage | null;
  onDismiss: () => void;
  durationMs?: number;
}

export function StatusToast({
  message,
  onDismiss,
  durationMs = 2800,
}: StatusToastProps) {
  useEffect(() => {
    if (!message) return;
    const timer = window.setTimeout(onDismiss, durationMs);
    return () => window.clearTimeout(timer);
  }, [message, onDismiss, durationMs]);

  if (!message) return null;

  const Icon =
    message.tone === 'success'
      ? CheckCircle2
      : message.tone === 'error'
        ? CircleAlert
        : Info;

  return (
    <div
      role="status"
      aria-live="polite"
      className={cn(
        'pointer-events-none fixed left-1/2 z-[60] w-[min(22rem,calc(100vw-1.5rem))] -translate-x-1/2 rounded-[var(--radius-lg)] border px-3 py-2.5 shadow-[var(--shadow-md)]',
        'top-[calc(3.75rem+var(--safe-top))] sm:top-[4.5rem]',
        message.tone === 'success' &&
          'border-[color-mix(in_srgb,var(--success)_35%,var(--border))] bg-[var(--surface)] text-[var(--foreground)]',
        message.tone === 'error' &&
          'border-[color-mix(in_srgb,var(--danger)_35%,var(--border))] bg-[var(--surface)] text-[var(--foreground)]',
        message.tone === 'info' &&
          'border-[var(--border)] bg-[var(--surface)] text-[var(--foreground)]',
      )}
    >
      <div className="flex items-start gap-2">
        <Icon
          className={cn(
            'mt-0.5 h-4 w-4 shrink-0',
            message.tone === 'success' && 'text-[var(--success)]',
            message.tone === 'error' && 'text-[var(--danger)]',
            message.tone === 'info' && 'text-[var(--primary)]',
          )}
          aria-hidden
        />
        <p className="text-sm font-medium leading-snug">{message.text}</p>
      </div>
    </div>
  );
}
