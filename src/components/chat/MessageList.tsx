'use client';

import { DateSeparator } from '@/components/chat/DateSeparator';
import { MessageItem } from '@/components/chat/MessageItem';
import { EmptyState } from '@/components/ui/StatePanels';
import { ListSkeleton } from '@/components/ui/Skeleton';
import { ChatMessage } from '@/lib/chat-types';
import {
  groupMessagesByDate,
  type MessageListEntry,
} from '@/lib/formatMessageDate';
import { useViewerTimeZone } from '@/hooks/useViewerTimeZone';

interface MessageListProps {
  messages: ChatMessage[];
  channelId: string;
  currentUserId: string;
  unreadSince?: string | null;
  canManageChannel: boolean;
  isLoading: boolean;
  activeThreadMessageId: string | null;
  highlightMessageId?: string | null;
  onReply: (messageId: string) => void;
  onReact: (messageId: string, emoji: string) => Promise<void>;
  onEdit: (messageId: string, body: string) => Promise<void>;
  onDelete: (messageId: string) => Promise<void>;
  onPin: (messageId: string) => Promise<void>;
  onCopyMessage: (body: string) => void;
  onCopyLink: (channelId: string, messageId: string) => void;
  onMarkUnread: (messageId: string) => Promise<void>;
}

export function MessageList({
  messages,
  channelId,
  currentUserId,
  unreadSince = null,
  canManageChannel,
  isLoading,
  activeThreadMessageId,
  highlightMessageId,
  onReply,
  onReact,
  onEdit,
  onDelete,
  onPin,
  onCopyMessage,
  onCopyLink,
  onMarkUnread,
}: MessageListProps) {
  const timeZone = useViewerTimeZone();

  if (isLoading) {
    return <ListSkeleton rows={3} />;
  }

  if (messages.length === 0) {
    return (
      <EmptyState
        title="No messages yet"
        description="Start the conversation with your team."
      />
    );
  }

  const cutoff = unreadSince ? new Date(unreadSince).getTime() : Number.NaN;
  const unreadMessages = Number.isNaN(cutoff)
    ? []
    : messages.filter(
        (message) =>
          new Date(message.createdAt).getTime() > cutoff &&
          message.sender.id !== currentUserId,
      );
  const earlierMessages = Number.isNaN(cutoff)
    ? messages
    : messages.filter(
        (message) => !unreadMessages.some((unread) => unread.id === message.id),
      );

  function renderEntries(
    entries: MessageListEntry<ChatMessage>[],
    unread: boolean,
  ) {
    return entries.map((entry) =>
      entry.type === 'separator' ? (
        <DateSeparator key={`${unread ? 'new' : 'old'}-${entry.key}`} label={entry.label} />
      ) : (
        <MessageItem
          key={entry.key}
          message={entry.message}
          channelId={channelId}
          currentUserId={currentUserId}
          canManageChannel={canManageChannel}
          unread={unread}
          isActive={activeThreadMessageId === entry.message.id}
          highlighted={highlightMessageId === entry.message.id}
          onReply={onReply}
          onReact={onReact}
          onEdit={onEdit}
          onDelete={onDelete}
          onPin={onPin}
          onCopyMessage={onCopyMessage}
          onCopyLink={onCopyLink}
          onMarkUnread={onMarkUnread}
        />
      ),
    );
  }

  return (
    <div className="space-y-0.5">
      {unreadMessages.length > 0 ? (
        <>
          {renderEntries(groupMessagesByDate(unreadMessages, timeZone), true)}
          <div className="my-4 flex items-center gap-3 px-3 text-xs font-medium uppercase tracking-wide text-[var(--muted)]">
            <span className="h-px flex-1 bg-[var(--border)]" />
            Earlier
            <span className="h-px flex-1 bg-[var(--border)]" />
          </div>
        </>
      ) : null}
      {renderEntries(groupMessagesByDate(earlierMessages, timeZone), false)}
    </div>
  );
}
