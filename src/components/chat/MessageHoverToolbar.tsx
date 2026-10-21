'use client';

import { useEffect, useRef, useState } from 'react';
import { MessageSquare, MoreHorizontal, SmilePlus } from 'lucide-react';
import { cn } from '@/lib/cn';
import { EmojiPicker, QUICK_REACTIONS } from '@/components/chat/EmojiPicker';

interface MessageHoverToolbarProps {
  onReply: () => void;
  onReact: (emoji: string) => void;
  onMore: () => void;
  onOpenChange?: (open: boolean) => void;
  className?: string;
}

export function MessageHoverToolbar({
  onReply,
  onReact,
  onMore,
  onOpenChange,
  className,
}: MessageHoverToolbarProps) {
  const [pickerOpen, setPickerOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    onOpenChange?.(pickerOpen);
  }, [pickerOpen, onOpenChange]);

  useEffect(() => {
    if (!pickerOpen) return;

    function handlePointerDown(event: MouseEvent) {
      if (
        rootRef.current &&
        !rootRef.current.contains(event.target as Node)
      ) {
        setPickerOpen(false);
      }
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        setPickerOpen(false);
      }
    }

    document.addEventListener('mousedown', handlePointerDown);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handlePointerDown);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [pickerOpen]);

  return (
    <div
      ref={rootRef}
      className={cn(
        'absolute -top-3 right-2 z-20 flex items-center gap-0.5 rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--surface)] p-0.5 shadow-[var(--shadow-md)]',
        className,
      )}
    >
      {QUICK_REACTIONS.map((emoji) => (
        <button
          key={emoji}
          type="button"
          className="flex h-8 w-8 items-center justify-center rounded-[var(--radius-sm)] text-base leading-none hover:bg-[var(--surface-muted)]"
          aria-label={`React with ${emoji}`}
          onClick={() => onReact(emoji)}
        >
          <span aria-hidden>{emoji}</span>
        </button>
      ))}
      <div className="relative">
        <button
          type="button"
          className={cn(
            'flex h-8 items-center gap-1 rounded-[var(--radius-sm)] px-2 text-xs font-medium text-[var(--muted-foreground)] hover:bg-[var(--surface-muted)]',
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
        {pickerOpen ? (
          <div className="absolute right-0 top-full z-30 mt-1 sm:bottom-full sm:top-auto sm:mb-1 sm:mt-0">
            <EmojiPicker
              onSelect={(emoji) => {
                onReact(emoji);
                setPickerOpen(false);
              }}
            />
          </div>
        ) : null}
      </div>
      <button
        type="button"
        className="flex h-8 items-center gap-1 rounded-[var(--radius-sm)] px-2 text-xs font-medium text-[var(--muted-foreground)] hover:bg-[var(--surface-muted)]"
        onClick={onReply}
      >
        <MessageSquare className="h-3.5 w-3.5" />
        <span className="hidden sm:inline">Reply</span>
      </button>
      <button
        type="button"
        className="flex h-8 w-8 items-center justify-center rounded-[var(--radius-sm)] text-[var(--muted-foreground)] hover:bg-[var(--surface-muted)]"
        aria-label="More actions"
        onClick={onMore}
      >
        <MoreHorizontal className="h-4 w-4" />
      </button>
    </div>
  );
}
