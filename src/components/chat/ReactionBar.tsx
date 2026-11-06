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
    <div className={cn('mt-1 flex flex-wrap gap-1', className)}>
      {reactions.map((reaction) => (
        <button
          key={reaction.emoji}
          type="button"
          onClick={() => onToggle(reaction.emoji)}
          aria-label={`${reaction.reactedByMe ? 'Remove' : 'Add'} reaction ${reaction.emoji}, ${reaction.count}`}
          aria-pressed={reaction.reactedByMe}
          className={cn(
            'inline-flex min-h-touch items-center gap-1 rounded-full border px-2.5 text-xs transition-colors sm:min-h-6 sm:px-2',
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
