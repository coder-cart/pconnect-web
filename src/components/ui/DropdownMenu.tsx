'use client';

import Link from 'next/link';
import {
  ReactNode,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from 'react';
import { createPortal } from 'react-dom';
import { cn } from '@/lib/cn';
import { clampFixedMenuPosition } from '@/lib/viewport-menu';

interface DropdownMenuProps {
  trigger: ReactNode;
  children: ReactNode;
  align?: 'left' | 'right';
  side?: 'top' | 'bottom';
  className?: string;
  menuClassName?: string;
}

export function DropdownMenu({
  trigger,
  children,
  align = 'right',
  side = 'bottom',
  className,
  menuClassName,
}: DropdownMenuProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLDivElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const [menuPos, setMenuPos] = useState({ left: 0, top: 0 });
  const [positioned, setPositioned] = useState(false);

  useLayoutEffect(() => {
    if (!open) {
      setPositioned(false);
      return;
    }
    if (!triggerRef.current || !menuRef.current) return;

    const trigger = triggerRef.current.getBoundingClientRect();
    const menu = menuRef.current.getBoundingClientRect();
    const preferredX =
      align === 'right' ? trigger.right - menu.width : trigger.left;
    const preferredY =
      side === 'top' ? trigger.top - menu.height - 4 : trigger.bottom + 4;

    setMenuPos(
      clampFixedMenuPosition(
        preferredX,
        preferredY,
        menu.width,
        menu.height,
      ),
    );
    setPositioned(true);
  }, [open, align, side, children]);

  useEffect(() => {
    if (!open) return;

    function handleClickOutside(event: MouseEvent) {
      const target = event.target as Node;
      if (
        containerRef.current?.contains(target) ||
        menuRef.current?.contains(target)
      ) {
        return;
      }
      setOpen(false);
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') setOpen(false);
    }

    function handleViewportChange() {
      setOpen(false);
    }

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleKeyDown);
    window.addEventListener('resize', handleViewportChange);
    window.addEventListener('scroll', handleViewportChange, true);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('resize', handleViewportChange);
      window.removeEventListener('scroll', handleViewportChange, true);
    };
  }, [open]);

  return (
    <div ref={containerRef} className={cn('relative', className)}>
      <div ref={triggerRef} onClick={() => setOpen((value) => !value)}>
        {trigger}
      </div>
      {open
        ? createPortal(
            <div
              ref={menuRef}
              className={cn(
                'shell-overlay-panel fixed z-[80] max-h-[min(24rem,70dvh)] min-w-44 max-w-[calc(100vw-1.5rem)] overflow-y-auto overscroll-contain rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--surface)] py-1 text-[var(--foreground)] shadow-[var(--shadow-md)]',
                menuClassName,
              )}
              style={{
                left: menuPos.left,
                top: menuPos.top,
                visibility: positioned ? 'visible' : 'hidden',
              }}
              onClick={() => setOpen(false)}
            >
              {children}
            </div>,
            document.body,
          )
        : null}
    </div>
  );
}

const itemClassName = (
  disabled: boolean,
  destructive: boolean,
  className?: string,
) =>
  cn(
    'flex min-h-touch w-full items-center gap-2 px-3 py-2 text-left text-sm transition-colors sm:min-h-0',
    disabled && 'cursor-not-allowed opacity-50',
    destructive
      ? 'text-[var(--danger)] hover:bg-[var(--danger-soft)]'
      : 'text-[var(--foreground)] hover:bg-[var(--surface-muted)]',
    className,
  );

export function DropdownMenuItem({
  children,
  onClick,
  href,
  disabled = false,
  destructive = false,
  className,
}: {
  children: ReactNode;
  onClick?: () => void;
  href?: string;
  disabled?: boolean;
  destructive?: boolean;
  className?: string;
}) {
  if (href && !disabled) {
    return (
      <Link
        href={href}
        className={itemClassName(disabled, destructive, className)}
        onClick={onClick}
      >
        {children}
      </Link>
    );
  }

  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className={itemClassName(disabled, destructive, className)}
    >
      {children}
    </button>
  );
}

export function DropdownMenuSeparator() {
  return <div className="my-1 border-t border-[var(--border)]" />;
}

export function DropdownMenuLabel({ children }: { children: ReactNode }) {
  return (
    <p className="px-3 py-1.5 text-xs font-semibold uppercase tracking-wide text-[var(--muted)]">
      {children}
    </p>
  );
}
