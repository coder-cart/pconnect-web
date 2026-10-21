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
    <div className={cn('mt-1.5 flex flex-wrap gap-1.5', className)}>
      {reactions.map((reaction) => (
        <button
          key={reaction.emoji}
          type="button"
          onClick={() => onToggle(reaction.emoji)}
          className={cn(
            'inline-flex h-6 items-center gap-1 rounded-full border px-2 text-xs transition-colors',
            reaction.reactedByMe
              ? 'border-[var(--primary)] bg-[var(--primary-soft)] text-[var(--primary)]'
              : 'border-[var(--border)] bg-[var(--surface-muted)] hover:bg-[var(--surface)]',
          )}
        >
          <span className="text-sm leading-none" aria-hidden>
            {reaction.emoji}
          </span>
          <span className="font-medium">{reaction.count}</span>
        </button>
      ))}
    </div>
  );
}
