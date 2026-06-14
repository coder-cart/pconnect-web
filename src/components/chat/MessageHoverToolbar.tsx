'use client';

import { useState } from 'react';
import { MessageSquare, MoreHorizontal, SmilePlus } from 'lucide-react';
import { cn } from '@/lib/cn';
import { EmojiPicker, QUICK_REACTIONS } from '@/components/chat/EmojiPicker';

interface MessageHoverToolbarProps {
  onReply: () => void;
  onReact: (emoji: string) => void;
  onMore: () => void;
  className?: string;
}

export function MessageHoverToolbar({
  onReply,
  onReact,
  onMore,
  className,
}: MessageHoverToolbarProps) {
  const [pickerOpen, setPickerOpen] = useState(false);

  return (
    <div
      className={cn(
        'absolute -top-3 right-2 z-10 flex items-center gap-0.5 rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--surface)] p-0.5 shadow-[var(--shadow-md)]',
        className,
      )}
    >
      {QUICK_REACTIONS.map((emoji) => (
        <button
          key={emoji}
          type="button"
          className="rounded-[var(--radius-sm)] px-1.5 py-1 text-sm hover:bg-[var(--surface-muted)]"
          aria-label={`React with ${emoji}`}
          onClick={() => onReact(emoji)}
        >
          {emoji}
        </button>
      ))}
      <div className="relative">
        <button
          type="button"
          className="flex items-center gap-1 rounded-[var(--radius-sm)] px-2 py-1 text-xs font-medium text-[var(--muted-foreground)] hover:bg-[var(--surface-muted)]"
          onClick={() => setPickerOpen((open) => !open)}
        >
          <SmilePlus className="h-3.5 w-3.5" />
          React
        </button>
        {pickerOpen ? (
          <div className="absolute bottom-full right-0 mb-1">
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
        className="flex items-center gap-1 rounded-[var(--radius-sm)] px-2 py-1 text-xs font-medium text-[var(--muted-foreground)] hover:bg-[var(--surface-muted)]"
        onClick={onReply}
      >
        <MessageSquare className="h-3.5 w-3.5" />
        Reply
      </button>
      <button
        type="button"
        className="rounded-[var(--radius-sm)] p-1.5 text-[var(--muted-foreground)] hover:bg-[var(--surface-muted)]"
        aria-label="More actions"
        onClick={onMore}
      >
        <MoreHorizontal className="h-4 w-4" />
      </button>
    </div>
  );
}
