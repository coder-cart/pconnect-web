'use client';

import { cn } from '@/lib/cn';

export const COMMON_EMOJIS = [
  '😀', '😂', '🙂', '😉', '😍', '👍', '🙏', '🎉', '🔥', '✅',
  '❤️', '👀', '💯', '🚀', '👏', '🤝', '💡', '📎', '📣', '⏰',
];

export const QUICK_REACTIONS = ['✅', '👀', '🙌'];

interface EmojiPickerProps {
  onSelect: (emoji: string) => void;
  className?: string;
  columns?: number;
}

export function EmojiPicker({
  onSelect,
  className,
  columns = 5,
}: EmojiPickerProps) {
  return (
    <div
      className={cn(
        'grid gap-1 rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--surface)] p-2 shadow-lg',
        className,
      )}
      style={{ gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))` }}
    >
      {COMMON_EMOJIS.map((emoji) => (
        <button
          key={emoji}
          type="button"
          className="rounded-[var(--radius-sm)] p-1 text-lg hover:bg-[var(--surface-muted)]"
          onClick={() => onSelect(emoji)}
        >
          {emoji}
        </button>
      ))}
    </div>
  );
}
