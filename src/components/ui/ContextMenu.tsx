'use client';

import { ReactNode, useEffect, useRef, useState } from 'react';
import { cn } from '@/lib/cn';

interface ContextMenuProps {
  children: ReactNode;
  menu: ReactNode;
  className?: string;
}

export function ContextMenu({ children, menu, className }: ContextMenuProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const [position, setPosition] = useState({ x: 0, y: 0 });

  useEffect(() => {
    if (!open) return;

    function handleClickOutside(event: MouseEvent) {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        setOpen(false);
      }
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') setOpen(false);
    }

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [open]);

  function handleContextMenu(event: React.MouseEvent) {
    event.preventDefault();
    setPosition({ x: event.clientX, y: event.clientY });
    setOpen(true);
  }

  return (
    <div
      ref={containerRef}
      className={cn('relative', className)}
      onContextMenu={handleContextMenu}
    >
      {children}
      {open ? (
        <div
          className="fixed z-50 min-w-52 rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--surface)] py-1 shadow-[var(--shadow-md)]"
          style={{ left: position.x, top: position.y }}
          onClick={() => setOpen(false)}
        >
          {menu}
        </div>
      ) : null}
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
        'flex w-full items-center justify-between gap-4 px-3 py-2 text-left text-sm transition-colors',
        disabled && 'cursor-not-allowed opacity-50',
        destructive
          ? 'text-[var(--danger)] hover:bg-[var(--danger-soft)]'
          : 'text-[var(--foreground)] hover:bg-[var(--surface-muted)]',
      )}
    >
      <span className="flex items-center gap-2">{children}</span>
      {shortcut ? (
        <span className="text-xs text-[var(--muted)]">{shortcut}</span>
      ) : null}
    </button>
  );
}

export function ContextMenuSeparator() {
  return <div className="my-1 border-t border-[var(--border)]" />;
}
