'use client';

import { DateSeparator } from '@/components/chat/DateSeparator';
import { MessageItem } from '@/components/chat/MessageItem';
import { EmptyState } from '@/components/ui/StatePanels';
import { ListSkeleton } from '@/components/ui/Skeleton';
import { ChatMessage } from '@/lib/chat-types';
import { groupMessagesByDate } from '@/lib/formatMessageDate';

interface MessageListProps {
  messages: ChatMessage[];
  channelId: string;
  currentUserId: string;
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

  const entries = groupMessagesByDate(messages);

  return (
    <div className="space-y-1">
      {entries.map((entry) =>
        entry.type === 'separator' ? (
          <DateSeparator key={entry.key} label={entry.label} />
        ) : (
          <MessageItem
            key={entry.key}
            message={entry.message}
            channelId={channelId}
            currentUserId={currentUserId}
            canManageChannel={canManageChannel}
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
      )}
    </div>
  );
}
