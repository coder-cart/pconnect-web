'use client';

import { useEffect } from 'react';
import { X } from 'lucide-react';
import { Avatar } from '@/components/ui/Avatar';
import { ChatComposer } from '@/components/chat/ChatComposer';
import { ChatMessageBody } from '@/components/chat/ChatMessageBody';
import { ChatScrollArea } from '@/components/chat/ChatScrollArea';
import { MessageItem } from '@/components/chat/MessageItem';
import { Card } from '@/components/ui/Card';
import { ListSkeleton } from '@/components/ui/Skeleton';
import { ChannelMemberOption } from '@/lib/channelMembers';
import { ChatMessage } from '@/lib/chat-types';
import { formatMessageTime } from '@/lib/formatMessageDate';

interface ThreadPanelProps {
  channelId: string;
  channelName?: string;
  channelType?: string;
  parentMessage: ChatMessage;
  replies: ChatMessage[];
  currentUserId: string;
  isInternalUser: boolean;
  members: ChannelMemberOption[];
  canManageChannel: boolean;
  isLoading: boolean;
  isSending: boolean;
  onClose: () => void;
  onSubmitReply: (payload: {
    body: string;
    attachments: Array<{
      kind: 'file' | 'link';
      fileId?: string;
      url?: string;
      title?: string;
    }>;
    alsoSendToChannel?: boolean;
    notifyClientTeam?: boolean;
  }) => Promise<void>;
  onReact: (messageId: string, emoji: string) => Promise<void>;
  onEdit: (messageId: string, body: string) => Promise<void>;
  onDelete: (messageId: string) => Promise<void>;
  onPin: (messageId: string) => Promise<void>;
  onCopyMessage: (body: string) => void;
  onCopyLink: (channelId: string, messageId: string) => void;
  onMarkUnread: (messageId: string) => Promise<void>;
}

export function ThreadPanel({
  channelId,
  channelName,
  channelType,
  parentMessage,
  replies,
  currentUserId,
  isInternalUser,
  members,
  canManageChannel,
  isLoading,
  isSending,
  onClose,
  onSubmitReply,
  onReact,
  onEdit,
  onDelete,
  onPin,
  onCopyMessage,
  onCopyLink,
  onMarkUnread,
}: ThreadPanelProps) {
  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        onClose();
      }
    }

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  const threadScrollKey = `${parentMessage.id}:${replies.length}:${isLoading ? 'loading' : 'ready'}`;

  return (
    <Card
      padding="none"
      className="fixed inset-0 z-40 flex min-h-0 flex-col overflow-hidden rounded-none lg:relative lg:inset-auto lg:z-auto lg:sticky lg:top-0 lg:h-full lg:rounded-[var(--radius-lg)]"
    >
      <div className="flex shrink-0 items-center justify-between border-b border-[var(--border)] px-4 py-3 safe-pt">
        <p className="text-sm font-semibold text-[var(--foreground)]">Thread</p>
        <button
          type="button"
          onClick={onClose}
          className="inline-flex min-h-touch min-w-touch items-center justify-center rounded-[var(--radius-sm)] text-[var(--muted)] hover:bg-[var(--surface-muted)]"
          aria-label="Close thread"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      <div className="shrink-0 border-b border-[var(--border)] px-4 py-3">
        <div className="flex gap-3">
          <Avatar name={parentMessage.sender.fullName} size="sm" />
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <p className="text-sm font-medium">{parentMessage.sender.fullName}</p>
              <span className="text-xs text-[var(--muted)]">
                {formatMessageTime(parentMessage.createdAt)}
              </span>
            </div>
            <ChatMessageBody
              body={parentMessage.body}
              attachments={parentMessage.attachments}
            />
          </div>
        </div>
      </div>

      <ChatScrollArea
        scrollKey={threadScrollKey}
        jumpLabel="Jump to latest reply"
        className="min-h-0"
        containerClassName="px-2 py-3"
        contentClassName="space-y-1"
      >
        {isLoading ? <ListSkeleton rows={2} /> : null}
        {!isLoading && replies.length === 0 ? (
          <p className="px-2 text-sm text-[var(--muted)]">No replies yet.</p>
        ) : null}
        {!isLoading
          ? replies.map((reply) => (
              <MessageItem
                key={reply.id}
                message={reply}
                channelId={channelId}
                currentUserId={currentUserId}
                canManageChannel={canManageChannel}
                onReply={() => {}}
                onReact={onReact}
                onEdit={onEdit}
                onDelete={onDelete}
                onPin={onPin}
                onCopyMessage={onCopyMessage}
                onCopyLink={onCopyLink}
                onMarkUnread={onMarkUnread}
              />
            ))
          : null}
      </ChatScrollArea>

      <div className="shrink-0 border-t border-[var(--border)] bg-[var(--surface)] p-4">
        <ChatComposer
          channelId={channelId}
          channelName={channelName}
          channelType={channelType}
          placeholder="Reply..."
          isSubmitting={isSending}
          variant="thread"
          members={members}
          currentUserId={currentUserId}
          isInternalUser={isInternalUser}
          onSubmit={onSubmitReply}
        />
      </div>
    </Card>
  );
}
