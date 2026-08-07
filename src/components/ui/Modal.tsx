'use client';

import { ReactNode, useEffect, useId, useRef } from 'react';
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
  const onCloseRef = useRef(onClose);
  const titleId = useId();

  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  useEffect(() => {
    if (!open) return;

    const previouslyFocused = document.activeElement as HTMLElement | null;

    function getFocusable(): HTMLElement[] {
      if (!dialogRef.current) return [];
      return Array.from(
        dialogRef.current.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR),
      ).filter((element) => {
        if (
          element.hasAttribute('disabled') ||
          element.getAttribute('aria-hidden') === 'true'
        ) {
          return false;
        }
        const style = window.getComputedStyle(element);
        return style.visibility !== 'hidden' && style.display !== 'none';
      });
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        event.preventDefault();
        onCloseRef.current();
        return;
      }

      if (event.key !== 'Tab' || !dialogRef.current) return;

      const focusable = getFocusable();
      if (focusable.length === 0) {
        event.preventDefault();
        dialogRef.current.focus();
        return;
      }

      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      const active = document.activeElement as HTMLElement | null;
      const activeInside = active ? dialogRef.current.contains(active) : false;

      if (!activeInside) {
        event.preventDefault();
        first.focus();
        return;
      }

      if (event.shiftKey && active === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && active === last) {
        event.preventDefault();
        first.focus();
      }
    }

    document.addEventListener('keydown', handleKeyDown);

    // Prefer first field input over dismiss/header buttons so typing works immediately.
    const focusable = getFocusable();
    const preferred =
      focusable.find((el) => {
        const tag = el.tagName.toLowerCase();
        return tag === 'input' || tag === 'textarea' || tag === 'select';
      }) ?? focusable[0];
    preferred?.focus();

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      previouslyFocused?.focus?.();
    };
    // Intentionally omit onClose — use onCloseRef so parent re-renders don't remount focus.
  }, [open]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-black/40 backdrop-blur-sm"
        aria-hidden="true"
        onMouseDown={(event) => {
          // Only close on direct backdrop press (not bubbled from dialog).
          if (event.target === event.currentTarget) {
            onCloseRef.current();
          }
        }}
      />
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
        className={cn(
          'relative z-10 max-h-[90vh] w-full overflow-y-auto rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--surface)] shadow-[var(--shadow-md)] outline-none',
          size === 'lg' ? 'max-w-2xl' : 'max-w-lg',
        )}
        onMouseDown={(event) => event.stopPropagation()}
      >
        <div className="relative border-b border-[var(--border)] px-5 py-4 pr-12">
          <div>
            <h2
              id={titleId}
              className="text-base font-semibold text-[var(--foreground)]"
            >
              {title}
            </h2>
            {description ? (
              <p className="mt-1 text-sm text-[var(--muted)]">{description}</p>
            ) : null}
          </div>
        </div>

        <div className="px-5 py-4">{children}</div>

        {footer ? (
          <div className="flex justify-end gap-2 border-t border-[var(--border)] px-5 py-4">
            {footer}
          </div>
        ) : null}

        {/* Close last in DOM/tab order so Tab from the first field does not land on dismiss. */}
        <button
          type="button"
          onClick={() => onCloseRef.current()}
          className="absolute right-3 top-3 rounded-[var(--radius-md)] p-2 text-[var(--muted)] hover:bg-[var(--surface-muted)] hover:text-[var(--foreground)]"
          aria-label="Close"
        >
          <X className="h-4 w-4" />
        </button>
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
      <Button
        type="button"
        variant="secondary"
        onClick={onCancel}
        disabled={isSubmitting}
      >
        Cancel
      </Button>
      <Button
        type="button"
        onClick={onSubmit}
        disabled={disabled || isSubmitting}
      >
        {isSubmitting ? 'Saving...' : submitLabel}
      </Button>
    </>
  );
}
