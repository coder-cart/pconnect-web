'use client';

import { ReactNode, useEffect, useRef } from 'react';
import { X } from 'lucide-react';
import { cn } from '@/lib/cn';
import { Button } from './Button';

interface ModalProps {
  open: boolean;
  title: string;
  description?: string;
  onClose: () => void;
  children: ReactNode;
  footer?: ReactNode;
  size?: 'md' | 'lg';
}

const FOCUSABLE_SELECTOR =
  'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])';

export function Modal({
  open,
  title,
  description,
  onClose,
  children,
  footer,
  size = 'md',
}: ModalProps) {
  const dialogRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;

    const previouslyFocused = document.activeElement as HTMLElement | null;

    function getFocusable(): HTMLElement[] {
      if (!dialogRef.current) return [];
      return Array.from(
        dialogRef.current.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR),
      ).filter((element) => element.offsetParent !== null);
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        onClose();
        return;
      }

      if (event.key !== 'Tab') return;

      const focusable = getFocusable();
      if (focusable.length === 0) return;

      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      const active = document.activeElement;

      if (event.shiftKey && active === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && active === last) {
        event.preventDefault();
        first.focus();
      }
    }

    document.addEventListener('keydown', handleKeyDown);

    // Move focus into the dialog on open.
    const focusable = getFocusable();
    (focusable[0] ?? dialogRef.current)?.focus();

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      previouslyFocused?.focus?.();
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <button
        type="button"
        className="absolute inset-0 bg-black/40 backdrop-blur-sm"
        aria-label="Close dialog"
        onClick={onClose}
      />
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-title"
        tabIndex={-1}
        className={cn(
          'relative z-10 max-h-[90vh] w-full overflow-y-auto rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--surface)] shadow-[var(--shadow-md)]',
          size === 'lg' ? 'max-w-2xl' : 'max-w-lg',
        )}
      >
        <div className="flex items-start justify-between border-b border-[var(--border)] px-5 py-4">
          <div>
            <h2 id="modal-title" className="text-base font-semibold text-[var(--foreground)]">
              {title}
            </h2>
            {description ? (
              <p className="mt-1 text-sm text-[var(--muted)]">{description}</p>
            ) : null}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-[var(--radius-md)] p-2 text-[var(--muted)] hover:bg-[var(--surface-muted)] hover:text-[var(--foreground)]"
            aria-label="Close"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="px-5 py-4">{children}</div>

        {footer ? (
          <div className="flex justify-end gap-2 border-t border-[var(--border)] px-5 py-4">
            {footer}
          </div>
        ) : null}
      </div>
    </div>
  );
}

interface ModalActionsProps {
  onCancel: () => void;
  onSubmit: () => void;
  submitLabel?: string;
  isSubmitting?: boolean;
  disabled?: boolean;
}

export function ModalActions({
  onCancel,
  onSubmit,
  submitLabel = 'Save',
  isSubmitting = false,
  disabled = false,
}: ModalActionsProps) {
  return (
    <>
      <Button variant="secondary" onClick={onCancel} disabled={isSubmitting}>
        Cancel
      </Button>
      <Button onClick={onSubmit} disabled={disabled || isSubmitting}>
        {isSubmitting ? 'Saving...' : submitLabel}
      </Button>
    </>
  );
}
