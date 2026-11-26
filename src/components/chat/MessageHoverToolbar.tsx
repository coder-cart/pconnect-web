'use client';

import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import {
  MessageSquare,
  MoreVertical,
  Pencil,
  Pin,
  PinOff,
  SmilePlus,
} from 'lucide-react';
import { cn } from '@/lib/cn';
import { EmojiPicker, QUICK_REACTIONS } from '@/components/chat/EmojiPicker';
import { clampFixedMenuPosition } from '@/lib/viewport-menu';

const actionBtnClass =
  'inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-[var(--muted-foreground)] transition-colors hover:bg-[var(--surface-muted)] hover:text-[var(--foreground)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--primary)]/30 [@media(pointer:coarse)]:h-9 [@media(pointer:coarse)]:w-9';

const iconClass = 'h-3.5 w-3.5 shrink-0';

interface MessageHoverToolbarProps {
  onReply: () => void;
  onReact: (emoji: string) => void;
  onOpenChange?: (open: boolean) => void;
  onEdit?: () => void;
  onOpenActions?: (anchor: { x: number; y: number }) => void;
  onPin?: () => void;
  onUnpin?: () => void;
  canEdit?: boolean;
  canPin?: boolean;
  isPinned?: boolean;
  className?: string;
}

export function MessageHoverToolbar({
  onReply,
  onReact,
  onOpenChange,
  onEdit,
  onOpenActions,
  onPin,
  onUnpin,
  canEdit = false,
  canPin = false,
  isPinned = false,
  className,
}: MessageHoverToolbarProps) {
  const [pickerOpen, setPickerOpen] = useState(false);
  const [pickerPos, setPickerPos] = useState({ left: 0, top: 0 });
  const rootRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const moreRef = useRef<HTMLButtonElement>(null);
  const pickerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    onOpenChange?.(pickerOpen);
  }, [pickerOpen, onOpenChange]);

  useLayoutEffect(() => {
    if (!pickerOpen || !triggerRef.current || !pickerRef.current) return;
    const trigger = triggerRef.current.getBoundingClientRect();
    const picker = pickerRef.current.getBoundingClientRect();
    const preferredX = trigger.right - picker.width;
    const preferredY = trigger.top - picker.height - 8;
    setPickerPos(
      clampFixedMenuPosition(
        preferredX,
        preferredY > 8 ? preferredY : trigger.bottom + 8,
        picker.width,
        picker.height,
      ),
    );
  }, [pickerOpen]);

  useEffect(() => {
    if (!pickerOpen) return;

    function handlePointerDown(event: MouseEvent | TouchEvent) {
      const target = event.target as Node;
      if (
        rootRef.current &&
        !rootRef.current.contains(target) &&
        pickerRef.current &&
        !pickerRef.current.contains(target)
      ) {
        setPickerOpen(false);
      }
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        setPickerOpen(false);
      }
    }

    function handleViewportChange() {
      setPickerOpen(false);
    }

    document.addEventListener('mousedown', handlePointerDown);
    document.addEventListener('touchstart', handlePointerDown, {
      passive: true,
    });
    document.addEventListener('keydown', handleKeyDown);
    window.addEventListener('resize', handleViewportChange);
    return () => {
      document.removeEventListener('mousedown', handlePointerDown);
      document.removeEventListener('touchstart', handlePointerDown);
      document.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('resize', handleViewportChange);
    };
  }, [pickerOpen]);

  const showPin = canPin && (isPinned ? Boolean(onUnpin) : Boolean(onPin));

  return (
    <div
      ref={rootRef}
      role="toolbar"
      aria-label="Message actions"
      className={cn(
        // Slack-style: straddle the message top edge (half above / half on).
        'absolute right-1 top-0 z-20 flex -translate-y-1/2 items-center gap-0.5 rounded-full border border-[var(--border)] bg-[var(--surface)] px-1 py-0.5 shadow-[0_2px_10px_rgba(15,23,42,0.12)]',
        className,
      )}
      onMouseDown={(event) => {
        // Keep toolbar chrome from stealing the start of a text selection.
        if ((event.target as HTMLElement).closest('button')) return;
        event.preventDefault();
      }}
    >
      {QUICK_REACTIONS.map((emoji) => (
        <button
          key={emoji}
          type="button"
          className={cn(actionBtnClass, 'text-[13px] leading-none')}
          aria-label={`React with ${emoji}`}
          onClick={() => onReact(emoji)}
        >
          <span aria-hidden>{emoji}</span>
        </button>
      ))}

      <button
        ref={triggerRef}
        type="button"
        className={cn(
          actionBtnClass,
          pickerOpen && 'bg-[var(--surface-muted)] text-[var(--foreground)]',
        )}
        aria-expanded={pickerOpen}
        aria-haspopup="listbox"
        aria-label="More reactions"
        onClick={() => setPickerOpen((open) => !open)}
      >
        <SmilePlus className={iconClass} />
      </button>

      {pickerOpen
        ? createPortal(
            <div
              ref={pickerRef}
              className="fixed z-[90]"
              style={{ left: pickerPos.left, top: pickerPos.top }}
            >
              <EmojiPicker
                onSelect={(emoji) => {
                  onReact(emoji);
                  setPickerOpen(false);
                }}
              />
            </div>,
            document.body,
          )
        : null}

      <span
        className="mx-0.5 h-4 w-px shrink-0 bg-[var(--border)]"
        aria-hidden
      />

      <button
        type="button"
        className={actionBtnClass}
        aria-label="Reply in thread"
        onClick={onReply}
      >
        <MessageSquare className={iconClass} />
      </button>

      {canEdit ? (
        <button
          type="button"
          className={actionBtnClass}
          aria-label="Edit message"
          onClick={onEdit}
        >
          <Pencil className={iconClass} />
        </button>
      ) : null}

      {showPin ? (
        <button
          type="button"
          className={actionBtnClass}
          aria-label={isPinned ? 'Unpin from channel' : 'Pin to channel'}
          onClick={() => {
            if (isPinned) {
              onUnpin?.();
            } else {
              onPin?.();
            }
          }}
        >
          {isPinned ? (
            <PinOff className={iconClass} />
          ) : (
            <Pin className={iconClass} />
          )}
        </button>
      ) : null}

      <button
        ref={moreRef}
        type="button"
        className={actionBtnClass}
        aria-label="More message actions"
        onClick={() => {
          const rect = moreRef.current?.getBoundingClientRect();
          onOpenActions?.({
            x: rect ? rect.left : 0,
            y: rect ? rect.bottom + 4 : 0,
          });
        }}
      >
        <MoreVertical className={iconClass} />
      </button>
    </div>
  );
}
