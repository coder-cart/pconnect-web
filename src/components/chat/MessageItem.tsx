'use client';

import { useState } from 'react';
import { MessageSquare } from 'lucide-react';
import { Avatar } from '@/components/ui/Avatar';
import { Badge } from '@/components/ui/Badge';
import { ChatMessageBody } from '@/components/chat/ChatMessageBody';
import { MessageHoverToolbar } from '@/components/chat/MessageHoverToolbar';
import { MessageContextMenuWrapper } from '@/components/chat/MessageContextMenu';
import { ReactionBar } from '@/components/chat/ReactionBar';
import { ChatMessage } from '@/lib/chat-types';
import { formatMessageTime } from '@/lib/formatMessageDate';
import { cn } from '@/lib/cn';

interface MessageItemProps {
  message: ChatMessage;
  channelId: string;
  currentUserId: string;
  canManageChannel: boolean;
  isActive?: boolean;
  highlighted?: boolean;
  onReply: (messageId: string) => void;
  onReact: (messageId: string, emoji: string) => Promise<void>;
  onEdit: (messageId: string, body: string) => Promise<void>;
  onDelete: (messageId: string) => Promise<void>;
  onPin: (messageId: string) => Promise<void>;
  onCopyMessage: (body: string) => void;
  onCopyLink: (channelId: string, messageId: string) => void;
  onMarkUnread: (messageId: string) => Promise<void>;
}

export function MessageItem({
  message,
  channelId,
  currentUserId,
  canManageChannel,
  isActive,
  highlighted,
  onReply,
  onReact,
  onEdit,
  onDelete,
  onPin,
  onCopyMessage,
  onCopyLink,
  onMarkUnread,
}: MessageItemProps) {
  const [hovered, setHovered] = useState(false);

  if (message.deletedAt) {
    return (
      <div
        id={`message-${message.id}`}
        className={cn(
          'rounded-[var(--radius-md)] px-2 py-2 text-sm italic text-[var(--muted)]',
          highlighted && 'ring-2 ring-[var(--primary)] ring-offset-2',
        )}
      >
        This message was deleted.
      </div>
    );
  }

  return (
    <MessageContextMenuWrapper
      message={message}
      channelId={channelId}
      currentUserId={currentUserId}
      canManageChannel={canManageChannel}
      onEdit={onEdit}
      onDelete={onDelete}
      onPin={onPin}
      onCopyMessage={onCopyMessage}
      onCopyLink={onCopyLink}
      onMarkUnread={onMarkUnread}
    >
      <div
        id={`message-${message.id}`}
        className={cn(
          'group relative flex gap-3 rounded-[var(--radius-md)] p-2 transition-colors hover:bg-[var(--surface-muted)]',
          isActive && 'bg-[var(--surface-muted)]',
          highlighted && 'ring-2 ring-[var(--primary)] ring-offset-2',
        )}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
      >
        {hovered ? (
          <MessageHoverToolbar
            onReply={() => onReply(message.id)}
            onReact={(emoji) => void onReact(message.id, emoji)}
            onMore={() => {}}
          />
        ) : null}
        <Avatar name={message.sender.fullName} size="sm" />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <p className="text-sm font-medium text-[var(--foreground)]">
              {message.sender.fullName}
            </p>
            <span className="text-xs text-[var(--muted)]">
              {formatMessageTime(message.createdAt)}
            </span>
            {message.isEdited ? (
              <span className="text-xs text-[var(--muted)]">(edited)</span>
            ) : null}
          </div>
          <ChatMessageBody
            body={message.body}
            attachments={message.attachments}
          />
          <ReactionBar
            reactions={message.reactions ?? []}
            onToggle={(emoji) => void onReact(message.id, emoji)}
          />
          {(message.replyCount ?? 0) > 0 ? (
            <button
              type="button"
              onClick={() => onReply(message.id)}
              className="mt-2"
            >
              <Badge variant="primary">{message.replyCount} replies</Badge>
            </button>
          ) : (
            <button
              type="button"
              onClick={() => onReply(message.id)}
              className="mt-2 inline-flex items-center gap-1 text-xs text-[var(--primary)] hover:underline"
            >
              <MessageSquare className="h-3 w-3" />
              Reply in thread
            </button>
          )}
        </div>
      </div>
    </MessageContextMenuWrapper>
  );
}
