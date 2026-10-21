'use client';

import { cn } from '@/lib/cn';

export const COMMON_EMOJIS = [
  '😀',
  '😂',
  '🙂',
  '😉',
  '😍',
  '👍',
  '🙏',
  '🎉',
  '🔥',
  '✅',
  '❤️',
  '👀',
  '💯',
  '🚀',
  '👏',
  '🤝',
  '💡',
  '📎',
  '📣',
  '⏰',
];

export const QUICK_REACTIONS = ['✅', '👀', '🙌'];

interface EmojiPickerProps {
  onSelect: (emoji: string) => void;
  className?: string;
  columns?: 4 | 5 | 6;
}

export function EmojiPicker({
  onSelect,
  className,
  columns = 5,
}: EmojiPickerProps) {
  return (
    <div
      className={cn(
        'z-50 w-[15.5rem] rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--surface)] p-2 shadow-[var(--shadow-md)]',
        className,
      )}
      role="listbox"
      aria-label="Choose an emoji"
    >
      <div
        className={cn(
          'grid gap-1',
          columns === 4 && 'grid-cols-4',
          columns === 5 && 'grid-cols-5',
          columns === 6 && 'grid-cols-6',
        )}
      >
        {COMMON_EMOJIS.map((emoji) => (
          <button
            key={emoji}
            type="button"
            role="option"
            aria-label={`Insert ${emoji}`}
            className="flex h-9 w-9 items-center justify-center rounded-[var(--radius-md)] text-[1.25rem] leading-none transition-colors hover:bg-[var(--surface-muted)]"
            onClick={() => onSelect(emoji)}
          >
            <span className="pointer-events-none select-none" aria-hidden>
              {emoji}
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}
