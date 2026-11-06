'use client';

import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { MessageSquare, MoreHorizontal, Pencil, SmilePlus } from 'lucide-react';
import { cn } from '@/lib/cn';
import { EmojiPicker, QUICK_REACTIONS } from '@/components/chat/EmojiPicker';
import { clampFixedMenuPosition } from '@/lib/viewport-menu';

const actionBtnClass =
  'flex min-h-touch min-w-touch items-center justify-center gap-1 rounded-[var(--radius-sm)] px-2 text-xs font-medium text-[var(--muted-foreground)] hover:bg-[var(--surface-muted)] sm:min-h-8 sm:min-w-8';

interface MessageHoverToolbarProps {
  onReply: () => void;
  onReact: (emoji: string) => void;
  onOpenChange?: (open: boolean) => void;
  onEdit?: () => void;
  onOpenActions?: (anchor: { x: number; y: number }) => void;
  canEdit?: boolean;
  className?: string;
}

export function MessageHoverToolbar({
  onReply,
  onReact,
  onOpenChange,
  onEdit,
  onOpenActions,
  canEdit = false,
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

  return (
    <div
      ref={rootRef}
      className={cn(
        'absolute -top-3 right-2 z-20 flex max-w-[calc(100%-0.5rem)] flex-wrap items-center gap-0.5 rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--surface)] p-0.5 shadow-[var(--shadow-md)]',
        className,
      )}
    >
      {QUICK_REACTIONS.map((emoji) => (
        <button
          key={emoji}
          type="button"
          className={cn(actionBtnClass, 'text-base leading-none')}
          aria-label={`React with ${emoji}`}
          onClick={() => onReact(emoji)}
        >
          <span aria-hidden>{emoji}</span>
        </button>
      ))}
      <div className="relative">
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
          <SmilePlus className="h-3.5 w-3.5" />
          <span className="hidden sm:inline">React</span>
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
      </div>
      <button
        type="button"
        className={actionBtnClass}
        aria-label="Reply in thread"
        onClick={onReply}
      >
        <MessageSquare className="h-3.5 w-3.5" />
        <span className="hidden sm:inline">Reply</span>
      </button>
      {canEdit ? (
        <button
          type="button"
          className={actionBtnClass}
          aria-label="Edit message"
          onClick={onEdit}
        >
          <Pencil className="h-3.5 w-3.5" />
          <span className="hidden sm:inline">Edit</span>
        </button>
      ) : null}
      <button
        ref={moreRef}
        type="button"
        className={actionBtnClass}
        aria-label="Message actions"
        onClick={() => {
          const rect = moreRef.current?.getBoundingClientRect();
          onOpenActions?.({
            x: rect ? rect.left : 0,
            y: rect ? rect.bottom + 4 : 0,
          });
        }}
      >
        <MoreHorizontal className="h-4 w-4" />
      </button>
    </div>
  );
}
