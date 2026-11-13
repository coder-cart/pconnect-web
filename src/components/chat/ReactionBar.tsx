'use client';

import {
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
} from 'react';
import { createPortal } from 'react-dom';
import { cn } from '@/lib/cn';
import {
  MessageReactionSummary,
  MessageReactionUser,
} from '@/lib/chat-types';
import { Button } from '@/components/ui/Button';
import { positionPanelAboveAnchor } from '@/lib/viewport-menu';

export type ReactionMemberDirectory = Record<string, string>;

interface ReactionBarProps {
  reactions: MessageReactionSummary[];
  onToggle: (emoji: string) => void;
  /** userId → fullName for resolving reactors when API users are missing. */
  memberNames?: ReactionMemberDirectory;
  currentUserId?: string;
  className?: string;
}

function isPlaceholderName(name: string | undefined | null) {
  if (!name) return true;
  const normalized = name.trim().toLowerCase();
  return (
    normalized.length === 0 ||
    normalized === 'team member' ||
    normalized === 'someone' ||
    normalized === 'unknown user'
  );
}

function reactionUsers(
  reaction: MessageReactionSummary,
  memberNames?: ReactionMemberDirectory,
  currentUserId?: string,
): MessageReactionUser[] {
  const byId = new Map<string, MessageReactionUser>();

  for (const user of reaction.users ?? []) {
    const resolvedName =
      !isPlaceholderName(user.fullName)
        ? user.fullName
        : memberNames?.[user.id] ??
          (user.id === currentUserId ? 'You' : null);
    byId.set(user.id, {
      ...user,
      fullName: resolvedName ?? user.fullName,
    });
  }

  for (const userId of reaction.userIds) {
    if (byId.has(userId)) {
      const existing = byId.get(userId)!;
      if (isPlaceholderName(existing.fullName)) {
        byId.set(userId, {
          ...existing,
          fullName:
            memberNames?.[userId] ??
            (userId === currentUserId ? 'You' : 'Someone'),
        });
      }
      continue;
    }

    byId.set(userId, {
      id: userId,
      fullName:
        memberNames?.[userId] ??
        (userId === currentUserId ? 'You' : 'Someone'),
      avatarUpdatedAt: null,
    });
  }

  return Array.from(byId.values());
}

function namesPreview(users: MessageReactionUser[], limit = 5) {
  if (users.length === 0) return 'No one';
  const names = users.slice(0, limit).map((user) => user.fullName);
  const remaining = users.length - names.length;
  if (remaining > 0) {
    return `${names.join(', ')} and ${remaining} more`;
  }
  return names.join(', ');
}

export function ReactionBar({
  reactions,
  onToggle,
  memberNames,
  currentUserId,
  className,
}: ReactionBarProps) {
  const [hoveredEmoji, setHoveredEmoji] = useState<string | null>(null);
  const [detailsEmoji, setDetailsEmoji] = useState<string | null>(null);
  const [tooltipPos, setTooltipPos] = useState({ left: 0, top: 0 });
  const [detailsPos, setDetailsPos] = useState({ left: 0, top: 0 });
  const chipRefs = useRef<Map<string, HTMLButtonElement>>(new Map());
  const tooltipRef = useRef<HTMLDivElement>(null);
  const detailsRef = useRef<HTMLDivElement>(null);
  const hoverTimerRef = useRef<number | null>(null);
  const canHover =
    typeof window !== 'undefined' &&
    window.matchMedia('(hover: hover) and (pointer: fine)').matches;

  const hoveredReaction =
    reactions.find((reaction) => reaction.emoji === hoveredEmoji) ?? null;
  const detailsReaction =
    reactions.find((reaction) => reaction.emoji === detailsEmoji) ?? null;

  useEffect(() => {
    return () => {
      if (hoverTimerRef.current) {
        window.clearTimeout(hoverTimerRef.current);
      }
    };
  }, []);

  useLayoutEffect(() => {
    if (!hoveredEmoji || !hoveredReaction) return;
    const anchor = chipRefs.current.get(hoveredEmoji)?.getBoundingClientRect();
    const panel = tooltipRef.current?.getBoundingClientRect();
    if (!anchor || !panel) return;
    setTooltipPos(
      positionPanelAboveAnchor(anchor, panel.width, panel.height, 6),
    );
  }, [hoveredEmoji, hoveredReaction]);

  useLayoutEffect(() => {
    if (!detailsEmoji || !detailsReaction) return;
    const anchor = chipRefs.current.get(detailsEmoji)?.getBoundingClientRect();
    const panel = detailsRef.current?.getBoundingClientRect();
    if (!anchor || !panel) return;
    setDetailsPos(
      positionPanelAboveAnchor(anchor, panel.width, panel.height, 8),
    );
  }, [detailsEmoji, detailsReaction]);

  useEffect(() => {
    if (!detailsEmoji) return;

    function handlePointerDown(event: PointerEvent) {
      const target = event.target as Node;
      if (detailsRef.current?.contains(target)) return;
      const chip = detailsEmoji
        ? chipRefs.current.get(detailsEmoji)
        : null;
      if (chip?.contains(target)) return;
      setDetailsEmoji(null);
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        setDetailsEmoji(null);
      }
    }

    document.addEventListener('pointerdown', handlePointerDown);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('pointerdown', handlePointerDown);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [detailsEmoji]);

  if (reactions.length === 0) return null;

  function openDetails(emoji: string) {
    setHoveredEmoji(null);
    setDetailsEmoji((current) => (current === emoji ? null : emoji));
  }

  function handleChipPointerEnter(
    event: ReactPointerEvent<HTMLButtonElement>,
    emoji: string,
  ) {
    if (!canHover || event.pointerType === 'touch') return;
    if (hoverTimerRef.current) {
      window.clearTimeout(hoverTimerRef.current);
    }
    hoverTimerRef.current = window.setTimeout(() => {
      setHoveredEmoji(emoji);
    }, 120);
  }

  function handleChipPointerLeave(event: ReactPointerEvent<HTMLButtonElement>) {
    if (!canHover || event.pointerType === 'touch') return;
    if (hoverTimerRef.current) {
      window.clearTimeout(hoverTimerRef.current);
    }
    hoverTimerRef.current = window.setTimeout(() => {
      setHoveredEmoji(null);
    }, 120);
  }

  const hoveredUsers = hoveredReaction
    ? reactionUsers(hoveredReaction, memberNames, currentUserId)
    : [];
  const detailsUsers = detailsReaction
    ? reactionUsers(detailsReaction, memberNames, currentUserId)
    : [];

  return (
    <>
      <div className={cn('mt-1 flex flex-wrap gap-1', className)}>
        {reactions.map((reaction) => {
          const users = reactionUsers(reaction, memberNames, currentUserId);
          return (
            <button
              key={reaction.emoji}
              ref={(node) => {
                if (node) {
                  chipRefs.current.set(reaction.emoji, node);
                } else {
                  chipRefs.current.delete(reaction.emoji);
                }
              }}
              type="button"
              onClick={() => openDetails(reaction.emoji)}
              onPointerEnter={(event) =>
                handleChipPointerEnter(event, reaction.emoji)
              }
              onPointerLeave={handleChipPointerLeave}
              aria-label={`${reaction.emoji} reaction by ${namesPreview(users)}. ${reaction.count} ${reaction.count === 1 ? 'person' : 'people'}`}
              aria-expanded={detailsEmoji === reaction.emoji}
              aria-pressed={reaction.reactedByMe}
              className={cn(
                'inline-flex min-h-touch items-center gap-1 rounded-full border px-2.5 text-xs transition-colors sm:min-h-6 sm:px-2',
                reaction.reactedByMe
                  ? 'border-[var(--primary)] bg-[var(--primary-soft)] text-[var(--primary)]'
                  : 'border-[var(--border)] bg-[var(--surface-muted)] hover:bg-[var(--surface)]',
                detailsEmoji === reaction.emoji && 'ring-1 ring-[var(--primary)]',
              )}
            >
              <span className="text-sm leading-none" aria-hidden>
                {reaction.emoji}
              </span>
              <span className="font-medium">{reaction.count}</span>
            </button>
          );
        })}
      </div>

      {hoveredReaction && typeof document !== 'undefined'
        ? createPortal(
            <div
              ref={tooltipRef}
              className="pointer-events-none fixed z-[96] max-w-[260px] rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--surface)] px-2.5 py-1.5 shadow-[var(--shadow-md)]"
              style={{ left: tooltipPos.left, top: tooltipPos.top }}
              role="tooltip"
            >
              <p className="text-xs leading-snug text-[var(--foreground)]">
                <span aria-hidden>{hoveredReaction.emoji} </span>
                {namesPreview(hoveredUsers, 5)}
              </p>
            </div>,
            document.body,
          )
        : null}

      {detailsReaction && typeof document !== 'undefined'
        ? createPortal(
            <div
              ref={detailsRef}
              className="fixed z-[97] w-[min(280px,calc(100vw-16px))] overflow-hidden rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--surface)] shadow-[var(--shadow-md)]"
              style={{ left: detailsPos.left, top: detailsPos.top }}
              role="dialog"
              aria-label={`${detailsReaction.emoji} reactions`}
            >
              <div className="flex items-center justify-between border-b border-[var(--border)] px-3 py-2">
                <div className="flex items-center gap-2 text-sm font-medium text-[var(--foreground)]">
                  <span className="text-base" aria-hidden>
                    {detailsReaction.emoji}
                  </span>
                  <span>
                    {detailsReaction.count}{' '}
                    {detailsReaction.count === 1 ? 'reaction' : 'reactions'}
                  </span>
                </div>
                <button
                  type="button"
                  className="rounded px-1.5 text-xs text-[var(--muted)] hover:bg-[var(--surface-muted)] hover:text-[var(--foreground)]"
                  onClick={() => setDetailsEmoji(null)}
                >
                  Close
                </button>
              </div>
              <ul className="max-h-64 overflow-y-auto py-1">
                {detailsUsers.map((user) => (
                  <li
                    key={user.id}
                    className="flex items-center justify-between gap-2 px-3 py-2"
                  >
                    <p className="min-w-0 truncate text-sm font-medium text-[var(--foreground)]">
                      {user.fullName}
                    </p>
                    <span className="shrink-0 text-base" aria-hidden>
                      {detailsReaction.emoji}
                    </span>
                  </li>
                ))}
              </ul>
              <div className="border-t border-[var(--border)] p-2">
                <Button
                  type="button"
                  size="sm"
                  variant={detailsReaction.reactedByMe ? 'secondary' : 'primary'}
                  className="w-full"
                  onClick={() => {
                    onToggle(detailsReaction.emoji);
                    setDetailsEmoji(null);
                  }}
                >
                  {detailsReaction.reactedByMe
                    ? 'Remove your reaction'
                    : `React with ${detailsReaction.emoji}`}
                </Button>
              </div>
            </div>,
            document.body,
          )
        : null}
    </>
  );
}
