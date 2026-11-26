'use client';

import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { ArrowDown } from 'lucide-react';
import {
  Virtuoso,
  type VirtuosoHandle,
} from 'react-virtuoso';
import { DateSeparator } from '@/components/chat/DateSeparator';
import { MessageItem } from '@/components/chat/MessageItem';
import type { ReactionMemberDirectory } from '@/components/chat/ReactionBar';
import { EmptyState } from '@/components/ui/StatePanels';
import { ListSkeleton } from '@/components/ui/Skeleton';
import type { ChatScrollRestore } from '@/hooks/useChatScroll';
import { ChatMessage } from '@/lib/chat-types';
import {
  formatDateSeparatorLabel,
  getDateKey,
} from '@/lib/formatMessageDate';
import { useViewerTimeZone } from '@/hooks/useViewerTimeZone';
import { cn } from '@/lib/cn';
import {
  CHAT_VIRTUOSO_START_INDEX,
  nextFirstItemIndexAfterPrepend,
} from '@/lib/chatVirtualization';

const NEAR_BOTTOM_THRESHOLD = 96;
const OVERSCAN = { top: 600, bottom: 600 };

interface MessageListProps {
  messages: ChatMessage[];
  channelId: string;
  channelType?: string;
  currentUserId: string;
  unreadSince?: string | null;
  canManageChannel: boolean;
  canDeleteForEveryone?: boolean;
  pinnedMessageIds?: Set<string>;
  memberNames?: ReactionMemberDirectory;
  isLoading: boolean;
  activeThreadMessageId: string | null;
  highlightMessageId?: string | null;
  /** Conversation identity — remount/reset virtual window on change. */
  scrollKey?: string | null;
  restoreOnKeyChange?: ChatScrollRestore | null;
  onScrollPosition?: (state: {
    scrollTop: number;
    distanceFromBottom: number;
    nearBottom: boolean;
  }) => void;
  onReachTop?: () => void;
  hasMoreMessages?: boolean;
  isLoadingOlderMessages?: boolean;
  onReply: (messageId: string) => void;
  onReact: (messageId: string, emoji: string) => Promise<void>;
  onEdit: (messageId: string, body: string) => Promise<void>;
  onDelete: (messageId: string) => void;
  onPin: (messageId: string) => Promise<void>;
  onUnpin?: (messageId: string) => Promise<void>;
  onCopyMessage: (body: string) => void;
  onCopyLink: (channelId: string, messageId: string) => void;
  onMarkUnread: (messageId: string) => Promise<void>;
  className?: string;
}

function isUnreadMessage(
  message: ChatMessage,
  cutoffMs: number,
  currentUserId: string,
) {
  return (
    !Number.isNaN(cutoffMs) &&
    new Date(message.createdAt).getTime() > cutoffMs &&
    message.sender.id !== currentUserId
  );
}

export function MessageList({
  messages,
  channelId,
  channelType,
  currentUserId,
  unreadSince = null,
  canManageChannel,
  canDeleteForEveryone = false,
  pinnedMessageIds,
  memberNames,
  isLoading,
  activeThreadMessageId,
  highlightMessageId,
  scrollKey = null,
  restoreOnKeyChange = null,
  onScrollPosition,
  onReachTop,
  hasMoreMessages = false,
  isLoadingOlderMessages = false,
  onReply,
  onReact,
  onEdit,
  onDelete,
  onPin,
  onUnpin,
  onCopyMessage,
  onCopyLink,
  onMarkUnread,
  className,
}: MessageListProps) {
  const timeZone = useViewerTimeZone();
  const virtuosoRef = useRef<VirtuosoHandle>(null);
  const scrollerElRef = useRef<HTMLElement | null>(null);
  const isNearBottomRef = useRef(true);
  const [showJumpToLatest, setShowJumpToLatest] = useState(false);
  const [firstItemIndex, setFirstItemIndex] = useState(
    CHAT_VIRTUOSO_START_INDEX,
  );

  const handlersRef = useRef({
    onReply,
    onReact,
    onEdit,
    onDelete,
    onPin,
    onUnpin,
    onCopyMessage,
    onCopyLink,
    onMarkUnread,
    onReachTop,
    onScrollPosition,
  });
  handlersRef.current = {
    onReply,
    onReact,
    onEdit,
    onDelete,
    onPin,
    onUnpin,
    onCopyMessage,
    onCopyLink,
    onMarkUnread,
    onReachTop,
    onScrollPosition,
  };

  const stableOnReply = useCallback((messageId: string) => {
    handlersRef.current.onReply(messageId);
  }, []);
  const stableOnReact = useCallback((messageId: string, emoji: string) => {
    return handlersRef.current.onReact(messageId, emoji);
  }, []);
  const stableOnEdit = useCallback((messageId: string, body: string) => {
    return handlersRef.current.onEdit(messageId, body);
  }, []);
  const stableOnDelete = useCallback((messageId: string) => {
    handlersRef.current.onDelete(messageId);
  }, []);
  const stableOnPin = useCallback((messageId: string) => {
    return handlersRef.current.onPin(messageId);
  }, []);
  const stableOnUnpin = useCallback(async (messageId: string) => {
    await handlersRef.current.onUnpin?.(messageId);
  }, []);
  const stableOnCopyMessage = useCallback((body: string) => {
    handlersRef.current.onCopyMessage(body);
  }, []);
  const stableOnCopyLink = useCallback(
    (channelIdValue: string, messageId: string) => {
      handlersRef.current.onCopyLink(channelIdValue, messageId);
    },
    [],
  );
  const stableOnMarkUnread = useCallback((messageId: string) => {
    return handlersRef.current.onMarkUnread(messageId);
  }, []);

  const cutoffMs = unreadSince ? new Date(unreadSince).getTime() : Number.NaN;
  const firstUnreadId = useMemo(
    () =>
      messages.find((message) =>
        isUnreadMessage(message, cutoffMs, currentUserId),
      )?.id,
    [messages, cutoffMs, currentUserId],
  );

  // Track prepends so Virtuoso can keep the viewport stable when older pages load.
  const prevMessagesRef = useRef<{
    scrollKey: string | null;
    firstId: string | null;
    length: number;
  }>({ scrollKey: null, firstId: null, length: 0 });

  useLayoutEffect(() => {
    const firstId = messages[0]?.id ?? null;
    const length = messages.length;
    const prev = prevMessagesRef.current;

    if (scrollKey !== prev.scrollKey) {
      setFirstItemIndex(CHAT_VIRTUOSO_START_INDEX);
      prevMessagesRef.current = { scrollKey, firstId, length };
      return;
    }

    setFirstItemIndex((current) =>
      nextFirstItemIndexAfterPrepend(
        current,
        prev.length,
        length,
        prev.firstId,
        firstId,
      ),
    );

    prevMessagesRef.current = { scrollKey, firstId, length };
  }, [messages, scrollKey]);

  const scrollToBottom = useCallback((behavior: ScrollBehavior = 'auto') => {
    const lastIndex = firstItemIndex + Math.max(messages.length - 1, 0);
    virtuosoRef.current?.scrollToIndex({
      index: lastIndex,
      align: 'end',
      behavior: behavior === 'smooth' ? 'smooth' : 'auto',
    });
    isNearBottomRef.current = true;
    setShowJumpToLatest(false);
  }, [firstItemIndex, messages.length]);

  // Channel switch restore / default to bottom.
  useEffect(() => {
    if (messages.length === 0) return;

    const restore = restoreOnKeyChange;
    const frame = requestAnimationFrame(() => {
      if (restore?.mode === 'offset') {
        virtuosoRef.current?.scrollTo({ top: restore.scrollTop });
        isNearBottomRef.current = false;
        setShowJumpToLatest(true);
        return;
      }
      if (restore?.mode === 'distanceFromBottom') {
        const el = scrollerElRef.current;
        if (el) {
          el.scrollTop = Math.max(
            0,
            el.scrollHeight - el.clientHeight - restore.distance,
          );
          const nearBottom = restore.distance <= NEAR_BOTTOM_THRESHOLD;
          isNearBottomRef.current = nearBottom;
          setShowJumpToLatest(!nearBottom);
          return;
        }
      }
      scrollToBottom('auto');
    });
    return () => cancelAnimationFrame(frame);
    // Only when conversation identity changes — not on every message append.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scrollKey]);

  // Deep-link / highlight anchor.
  useEffect(() => {
    if (!highlightMessageId || messages.length === 0) return;
    const dataIndex = messages.findIndex(
      (message) => message.id === highlightMessageId,
    );
    if (dataIndex < 0) return;
    const frame = requestAnimationFrame(() => {
      virtuosoRef.current?.scrollToIndex({
        index: firstItemIndex + dataIndex,
        align: 'center',
        behavior: 'auto',
      });
      isNearBottomRef.current = false;
      setShowJumpToLatest(true);
    });
    return () => cancelAnimationFrame(frame);
  }, [highlightMessageId, messages, firstItemIndex]);

  const reportScroll = useCallback(() => {
    const el = scrollerElRef.current;
    if (!el) return;
    const distanceFromBottom =
      el.scrollHeight - el.scrollTop - el.clientHeight;
    const nearBottom = distanceFromBottom <= NEAR_BOTTOM_THRESHOLD;
    isNearBottomRef.current = nearBottom;
    setShowJumpToLatest((current) => {
      const next = !nearBottom;
      return current === next ? current : next;
    });
    handlersRef.current.onScrollPosition?.({
      scrollTop: el.scrollTop,
      distanceFromBottom,
      nearBottom,
    });
  }, []);

  if (isLoading) {
    return (
      <div className={cn('min-h-0 flex-1 px-2 py-3', className)}>
        <ListSkeleton rows={3} />
      </div>
    );
  }

  if (messages.length === 0) {
    return (
      <div className={cn('min-h-0 flex-1 px-2 py-3', className)}>
        <EmptyState
          title="No messages yet"
          description="Start the conversation with your team."
        />
      </div>
    );
  }

  const initialTopMostItemIndex = {
    index: firstItemIndex + messages.length - 1,
    align: 'end' as const,
  };

  return (
    <div className={cn('relative min-h-0 min-w-0 flex-1 overflow-x-hidden', className)}>
      <Virtuoso
        key={scrollKey ?? channelId}
        ref={virtuosoRef}
        className="chat-inset-x h-full overscroll-y-contain py-[var(--chat-inset-y)]"
        // Virtuoso sets overflowY:auto; CSS then computes overflow-x to auto too,
        // which shows a bottom horizontal scrollbar for tiny width overflow.
        style={{ height: '100%', overflowX: 'hidden' }}
        data={messages}
        firstItemIndex={firstItemIndex}
        initialTopMostItemIndex={initialTopMostItemIndex}
        increaseViewportBy={OVERSCAN}
        defaultItemHeight={72}
        computeItemKey={(_, message) => message.id}
        alignToBottom
        followOutput={(atBottom) => {
          if (atBottom || isNearBottomRef.current) {
            return 'auto';
          }
          return false;
        }}
        atTopStateChange={(atTop) => {
          if (atTop) {
            handlersRef.current.onReachTop?.();
          }
        }}
        atBottomStateChange={(atBottom) => {
          isNearBottomRef.current = atBottom;
          setShowJumpToLatest((current) => {
            const next = !atBottom;
            return current === next ? current : next;
          });
        }}
        scrollerRef={(ref) => {
          scrollerElRef.current =
            ref instanceof HTMLElement ? ref : null;
        }}
        isScrolling={(scrolling) => {
          if (!scrolling) {
            reportScroll();
          }
        }}
        components={{
          Header: () => (
            <div className="px-2 py-2 text-center text-xs text-[var(--muted)]">
              {isLoadingOlderMessages
                ? 'Loading older messages…'
                : !hasMoreMessages
                  ? 'Beginning of conversation'
                  : '\u00a0'}
            </div>
          ),
        }}
        itemContent={(absoluteIndex, message) => {
          const dataIndex = absoluteIndex - firstItemIndex;
          const previous = dataIndex > 0 ? messages[dataIndex - 1] : null;
          const showDateSeparator =
            !previous ||
            getDateKey(previous.createdAt, timeZone) !==
              getDateKey(message.createdAt, timeZone);
          const unread = isUnreadMessage(message, cutoffMs, currentUserId);
          const showNewDivider = firstUnreadId === message.id;

          return (
            <div className={dataIndex === 0 ? 'pt-3' : undefined}>
              {showDateSeparator ? (
                <DateSeparator
                  label={formatDateSeparatorLabel(message.createdAt, timeZone)}
                />
              ) : null}
              {showNewDivider ? (
                <div className="my-2 flex items-center gap-2 px-2 text-[11px] font-medium uppercase tracking-wide text-[var(--danger)] sm:gap-3 sm:px-3 sm:text-xs">
                  <span className="h-px flex-1 bg-[var(--danger)]/40" />
                  New messages
                  <span className="h-px flex-1 bg-[var(--danger)]/40" />
                </div>
              ) : null}
              <MessageItem
                message={message}
                channelId={channelId}
                channelType={channelType}
                currentUserId={currentUserId}
                canManageChannel={canManageChannel}
                canDeleteForEveryone={canDeleteForEveryone}
                isPinned={pinnedMessageIds?.has(message.id) ?? false}
                memberNames={memberNames}
                unread={unread}
                isActive={activeThreadMessageId === message.id}
                highlighted={highlightMessageId === message.id}
                onReply={stableOnReply}
                onReact={stableOnReact}
                onEdit={stableOnEdit}
                onDelete={stableOnDelete}
                onPin={stableOnPin}
                onUnpin={onUnpin ? stableOnUnpin : undefined}
                onCopyMessage={stableOnCopyMessage}
                onCopyLink={stableOnCopyLink}
                onMarkUnread={stableOnMarkUnread}
              />
            </div>
          );
        }}
      />

      {showJumpToLatest ? (
        <div className="pointer-events-none absolute inset-x-0 bottom-3 flex justify-center sm:bottom-4">
          <button
            type="button"
            onClick={() => scrollToBottom('smooth')}
            className="pointer-events-auto inline-flex items-center gap-2 rounded-full border border-[var(--border)] bg-[var(--surface)] px-3 py-1.5 text-sm font-medium text-[var(--foreground)] shadow-[var(--shadow-md)] transition-colors hover:bg-[var(--surface-muted)] sm:px-4 sm:py-2"
          >
            <ArrowDown className="h-4 w-4" />
            Jump to latest
          </button>
        </div>
      ) : null}
    </div>
  );
}
