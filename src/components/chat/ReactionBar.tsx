'use client';

import { cn } from '@/lib/cn';
import { MessageReactionSummary } from '@/lib/chat-types';

interface ReactionBarProps {
  reactions: MessageReactionSummary[];
  onToggle: (emoji: string) => void;
  className?: string;
}

export function ReactionBar({ reactions, onToggle, className }: ReactionBarProps) {
  if (reactions.length === 0) return null;

  return (
    <div className={cn('mt-2 flex flex-wrap gap-1', className)}>
      {reactions.map((reaction) => (
        <button
          key={reaction.emoji}
          type="button"
          onClick={() => onToggle(reaction.emoji)}
          className={cn(
            'inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs transition-colors',
            reaction.reactedByMe
              ? 'border-[var(--primary)] bg-[var(--primary-soft)] text-[var(--primary)]'
              : 'border-[var(--border)] bg-[var(--surface-muted)] hover:bg-[var(--surface)]',
          )}
        >
          <span>{reaction.emoji}</span>
          <span className="font-medium">{reaction.count}</span>
        </button>
      ))}
    </div>
  );
}
