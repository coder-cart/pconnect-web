'use client';

import { useState } from 'react';
import { UserAvatar } from '@/components/ui/UserAvatar';
import { Badge } from '@/components/ui/Badge';
import { ChatMessageBody } from '@/components/chat/ChatMessageBody';
import { MessageHoverToolbar } from '@/components/chat/MessageHoverToolbar';
import { MessageContextMenuWrapper } from '@/components/chat/MessageContextMenu';
import { ReactionBar } from '@/components/chat/ReactionBar';
import { ChatMessage } from '@/lib/chat-types';
import { formatMessageTime } from '@/lib/formatMessageDate';
import { useViewerTimeZone } from '@/hooks/useViewerTimeZone';
import { cn } from '@/lib/cn';

interface MessageItemProps {
  message: ChatMessage;
  channelId: string;
  currentUserId: string;
  canManageChannel: boolean;
  isActive?: boolean;
  unread?: boolean;
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
  unread = false,
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
  const [toolbarLocked, setToolbarLocked] = useState(false);
  const timeZone = useViewerTimeZone();

  if (message.deletedAt) {
    return (
      <div
        id={`message-${message.id}`}
        className={cn(
          'chat-message-row rounded-[var(--radius-md)] text-sm italic text-[var(--muted)]',
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
          'chat-message-row group relative flex gap-2.5 rounded-[var(--radius-md)] transition-colors hover:bg-[var(--surface-muted)]',
          isActive && 'bg-[var(--surface-muted)]',
          highlighted && 'ring-2 ring-[var(--primary)] ring-offset-2',
        )}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => {
          if (!toolbarLocked) {
            setHovered(false);
          }
        }}
      >
        {hovered || toolbarLocked ? (
          <MessageHoverToolbar
            onReply={() => onReply(message.id)}
            onReact={(emoji) => void onReact(message.id, emoji)}
            onMore={() => {}}
            onOpenChange={setToolbarLocked}
          />
        ) : null}
        <UserAvatar
          user={{
            id: message.sender.id,
            fullName: message.sender.fullName,
            avatarUpdatedAt: message.sender.avatarUpdatedAt,
          }}
          size="sm"
          className="mt-0.5 shrink-0"
        />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
            <p className="text-sm font-semibold text-[var(--primary)]">
              {message.sender.fullName}
            </p>
            <span className="text-xs text-[var(--muted)]">
              {formatMessageTime(message.createdAt, timeZone)}
            </span>
            {message.isEdited ? (
              <span className="text-xs text-[var(--muted)]">(edited)</span>
            ) : null}
          </div>
          <div
            className={cn(
              'mt-0.5 text-sm leading-snug text-[var(--foreground)]',
              unread && 'font-semibold',
            )}
          >
            <ChatMessageBody
              body={message.body}
              attachments={message.attachments}
              channelId={channelId}
              currentUserId={currentUserId}
            />
          </div>
          <ReactionBar
            reactions={message.reactions ?? []}
            onToggle={(emoji) => void onReact(message.id, emoji)}
          />
          {(message.replyCount ?? 0) > 0 ? (
            <button
              type="button"
              onClick={() => onReply(message.id)}
              className="mt-1"
            >
              <Badge variant="primary">{message.replyCount} replies</Badge>
            </button>
          ) : null}
        </div>
      </div>
    </MessageContextMenuWrapper>
  );
}
