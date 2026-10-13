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
  size?: 'md' | 'lg' | 'xl';
}

const FOCUSABLE_SELECTOR =
  'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])';

const SIZE_CLASS: Record<NonNullable<ModalProps['size']>, string> = {
  md: 'sm:max-w-lg',
  lg: 'sm:max-w-2xl',
  xl: 'sm:max-w-3xl',
};

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
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

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

    const focusable = getFocusable();
    const preferred =
      focusable.find((el) => {
        const tag = el.tagName.toLowerCase();
        return tag === 'input' || tag === 'textarea' || tag === 'select';
      }) ?? focusable[0];
    preferred?.focus();

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = previousOverflow;
      previouslyFocused?.focus?.();
    };
  }, [open]);

  if (!open) return null;

  return (
    <div
      className={cn(
        'fixed inset-0 z-50 flex justify-center',
        // Mobile/PWA: bottom sheet; desktop: centered dialog
        'items-end p-0 sm:items-center sm:p-4',
      )}
      style={{
        paddingBottom: 'env(safe-area-inset-bottom, 0px)',
      }}
    >
      <div
        className="absolute inset-0 bg-black/35 backdrop-blur-[2px]"
        aria-hidden="true"
        onMouseDown={(event) => {
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
          'relative z-10 flex w-full flex-col overflow-hidden border border-[var(--border)] bg-[var(--surface)] shadow-[var(--shadow-md)] outline-none',
          // Full-height sheet on phones (PWA); constrained card on desktop
          'h-[100dvh] max-h-[100dvh] rounded-none sm:h-auto sm:max-h-[min(90dvh,90vh)] sm:rounded-[var(--radius-lg)]',
          SIZE_CLASS[size],
        )}
      >
        <div
          className="relative shrink-0 border-b border-[var(--border)] bg-[var(--surface)] px-4 py-3 pr-14 sm:px-5 sm:py-4 sm:pr-12"
          style={{ paddingTop: 'max(0.75rem, env(safe-area-inset-top, 0px))' }}
        >
          {/* Drag affordance for mobile sheet */}
          <div
            className="mx-auto mb-2 h-1 w-10 rounded-full bg-[var(--border)] sm:hidden"
            aria-hidden="true"
          />
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

        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 py-4 sm:px-5">
          {children}
        </div>

        {footer ? (
          <div
            className="flex shrink-0 flex-col gap-2 border-t border-[var(--border)] bg-[var(--surface)] px-4 py-3 sm:flex-row sm:justify-end sm:gap-2 sm:px-5 sm:py-4"
            style={{
              paddingBottom:
                'max(0.75rem, env(safe-area-inset-bottom, 0px))',
            }}
          >
            {footer}
          </div>
        ) : null}

        <button
          type="button"
          onClick={() => onCloseRef.current()}
          className="absolute right-2 top-2 z-10 flex h-11 w-11 items-center justify-center rounded-[var(--radius-md)] text-[var(--muted)] hover:bg-[var(--surface-muted)] hover:text-[var(--foreground)] sm:right-3 sm:top-3 sm:h-9 sm:w-9"
          style={{
            top: 'max(0.5rem, env(safe-area-inset-top, 0px))',
          }}
          aria-label="Close"
        >
          <X className="h-5 w-5 sm:h-4 sm:w-4" />
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
        className="h-11 w-full sm:h-10 sm:w-auto"
        onClick={onCancel}
        disabled={isSubmitting}
      >
        Cancel
      </Button>
      <Button
        type="button"
        className="h-11 w-full sm:h-10 sm:w-auto"
        onClick={onSubmit}
        disabled={disabled || isSubmitting}
      >
        {isSubmitting ? 'Saving...' : submitLabel}
      </Button>
    </>
  );
}
