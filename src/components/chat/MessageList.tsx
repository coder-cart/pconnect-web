'use client';

import { DateSeparator } from '@/components/chat/DateSeparator';
import { MessageItem } from '@/components/chat/MessageItem';
import type { ReactionMemberDirectory } from '@/components/chat/ReactionBar';
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
  memberNames?: ReactionMemberDirectory;
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
  currentUserId,
  unreadSince = null,
  canManageChannel,
  memberNames,
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

  // Keep chronological order in the chat body. Mark unread with a divider
  // above the first unread — never move unread messages to the top.
  const cutoffMs = unreadSince ? new Date(unreadSince).getTime() : Number.NaN;
  const firstUnreadId = messages.find((message) =>
    isUnreadMessage(message, cutoffMs, currentUserId),
  )?.id;
  const entries = groupMessagesByDate(messages, timeZone);

  function renderEntry(entry: MessageListEntry<ChatMessage>) {
    if (entry.type === 'separator') {
      return <DateSeparator key={entry.key} label={entry.label} />;
    }

    const unread = isUnreadMessage(entry.message, cutoffMs, currentUserId);
    const showNewDivider = firstUnreadId === entry.message.id;

    return (
      <div key={entry.key}>
        {showNewDivider ? (
          <div className="my-2 flex items-center gap-2 px-2 text-[11px] font-medium uppercase tracking-wide text-[var(--danger)] sm:gap-3 sm:px-3 sm:text-xs">
            <span className="h-px flex-1 bg-[var(--danger)]/40" />
            New messages
            <span className="h-px flex-1 bg-[var(--danger)]/40" />
          </div>
        ) : null}
        <MessageItem
          message={entry.message}
          channelId={channelId}
          currentUserId={currentUserId}
          canManageChannel={canManageChannel}
          memberNames={memberNames}
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
      </div>
    );
  }

  return <div className="space-y-0">{entries.map(renderEntry)}</div>;
}
