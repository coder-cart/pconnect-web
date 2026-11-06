'use client';

import { ReactNode, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { cn } from '@/lib/cn';
import { clampFixedMenuPosition } from '@/lib/viewport-menu';

const LONG_PRESS_MS = 480;
const LONG_PRESS_MOVE_PX = 10;
const IGNORE_OUTSIDE_CLOSE_MS = 320;

interface ContextMenuProps {
  children: ReactNode;
  menu: ReactNode;
  className?: string;
  /** Imperatively open the menu at a client point (e.g. action button). */
  openSignal?: { x: number; y: number; key: number } | null;
}

export function ContextMenu({
  children,
  menu,
  className,
  openSignal = null,
}: ContextMenuProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const longPressTimerRef = useRef<number | null>(null);
  const touchStartRef = useRef<{ x: number; y: number } | null>(null);
  const longPressOpenedRef = useRef(false);
  const ignoreOutsideUntilRef = useRef(0);
  const [open, setOpen] = useState(false);
  const [position, setPosition] = useState({ left: 0, top: 0 });
  const [anchor, setAnchor] = useState({ x: 0, y: 0 });

  function openAt(x: number, y: number) {
    ignoreOutsideUntilRef.current = Date.now() + IGNORE_OUTSIDE_CLOSE_MS;
    setAnchor({ x, y });
    setPosition({ left: x, top: y });
    setOpen(true);
  }

  function clearLongPress() {
    if (longPressTimerRef.current != null) {
      window.clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }
    touchStartRef.current = null;
  }

  useLayoutEffect(() => {
    if (!open || !menuRef.current) return;
    const rect = menuRef.current.getBoundingClientRect();
    setPosition(
      clampFixedMenuPosition(anchor.x, anchor.y, rect.width, rect.height),
    );
  }, [open, anchor.x, anchor.y, menu]);

  useEffect(() => {
    if (!openSignal) return;
    openAt(openSignal.x, openSignal.y);
    // openSignal.key changes on each request
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [openSignal]);

  useEffect(() => {
    if (!open) return;

    // Close on any pointer outside the menu panel itself (not the whole message
    // row). Opening gesture is ignored briefly via ignoreOutsideUntilRef.
    function handlePointerOutside(event: Event) {
      if (Date.now() < ignoreOutsideUntilRef.current) {
        return;
      }
      const target = event.target as Node | null;
      if (!target || !menuRef.current) return;
      if (menuRef.current.contains(target)) return;
      setOpen(false);
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') setOpen(false);
    }

    function handleResize() {
      setOpen(false);
    }

    // Capture phase so chat/composer stopPropagation cannot keep the menu open.
    document.addEventListener('pointerdown', handlePointerOutside, true);
    document.addEventListener('mousedown', handlePointerOutside, true);
    document.addEventListener('touchstart', handlePointerOutside, {
      capture: true,
      passive: true,
    });
    document.addEventListener('keydown', handleKeyDown);
    window.addEventListener('resize', handleResize);
    return () => {
      document.removeEventListener('pointerdown', handlePointerOutside, true);
      document.removeEventListener('mousedown', handlePointerOutside, true);
      document.removeEventListener('touchstart', handlePointerOutside, true);
      document.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('resize', handleResize);
    };
  }, [open]);

  function handleContextMenu(event: React.MouseEvent) {
    event.preventDefault();
    openAt(event.clientX, event.clientY);
  }

  function handleTouchStart(event: React.TouchEvent) {
    if (event.touches.length !== 1) return;
    const touch = event.touches[0];
    longPressOpenedRef.current = false;
    touchStartRef.current = { x: touch.clientX, y: touch.clientY };
    clearLongPress();
    longPressTimerRef.current = window.setTimeout(() => {
      const start = touchStartRef.current;
      if (!start) return;
      longPressOpenedRef.current = true;
      openAt(start.x, start.y);
      if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
        try {
          navigator.vibrate(10);
        } catch {
          // ignore
        }
      }
      longPressTimerRef.current = null;
    }, LONG_PRESS_MS);
  }

  function handleTouchMove(event: React.TouchEvent) {
    const start = touchStartRef.current;
    if (!start || event.touches.length !== 1) return;
    const touch = event.touches[0];
    const dx = Math.abs(touch.clientX - start.x);
    const dy = Math.abs(touch.clientY - start.y);
    if (dx > LONG_PRESS_MOVE_PX || dy > LONG_PRESS_MOVE_PX) {
      clearLongPress();
    }
  }

  function handleTouchEnd(event: React.TouchEvent) {
    clearLongPress();
    if (longPressOpenedRef.current) {
      event.preventDefault();
      longPressOpenedRef.current = false;
    }
  }

  return (
    <div
      ref={containerRef}
      className={cn('relative', className)}
      onContextMenu={handleContextMenu}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      onTouchCancel={handleTouchEnd}
    >
      {children}
      {open
        ? createPortal(
            <div
              ref={menuRef}
              className="fixed z-[90] min-w-52 max-w-[min(20rem,calc(100vw-1rem))] rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--surface)] py-1 shadow-[var(--shadow-md)]"
              style={{ left: position.left, top: position.top }}
              onClick={() => setOpen(false)}
            >
              {menu}
            </div>,
            document.body,
          )
        : null}
    </div>
  );
}

export function ContextMenuItem({
  children,
  onClick,
  disabled = false,
  destructive = false,
  shortcut,
}: {
  children: ReactNode;
  onClick?: () => void;
  disabled?: boolean;
  destructive?: boolean;
  shortcut?: string;
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className={cn(
        'flex min-h-touch w-full items-center justify-between gap-4 px-3 py-2.5 text-left text-sm transition-colors sm:min-h-0 sm:py-2',
        disabled && 'cursor-not-allowed opacity-50',
        destructive
          ? 'text-[var(--danger)] hover:bg-[var(--danger-soft)]'
          : 'text-[var(--foreground)] hover:bg-[var(--surface-muted)]',
      )}
    >
      <span className="flex items-center gap-2">{children}</span>
      {shortcut ? (
        <span className="hidden text-xs text-[var(--muted)] sm:inline">
          {shortcut}
        </span>
      ) : null}
    </button>
  );
}

export function ContextMenuSeparator() {
  return <div className="my-1 border-t border-[var(--border)]" />;
}
