'use client';

import { useCallback, useEffect, useState } from 'react';
import { apiRequest } from '@/lib/api-client';
import {
  ApiResponse,
  AuthenticatedUser,
  userIsExternal,
} from '@/lib/auth';
import { ChatMessage, appendUniqueById } from '@/lib/chat-types';
import { Card } from '@/components/ui/Card';
import { ErrorState } from '@/components/ui/StatePanels';
import { MessageList } from '@/components/chat/MessageList';
import { ChatComposer } from '@/components/chat/ChatComposer';
import { ChatScrollArea } from '@/components/chat/ChatScrollArea';
import { DeleteMessageDialog } from '@/components/chat/DeleteMessageDialog';
import { useRealtime } from '@/components/providers/RealtimeProvider';
import { isWorkspaceAdmin } from '@/lib/navigation';
import { canDeleteMessageForEveryone } from '@/lib/chat-message-permissions';

interface OrderChannelChatProps {
  channelId: string;
  user: AuthenticatedUser;
  title?: string;
  description?: string;
}

export function OrderChannelChat({
  channelId,
  user,
  title = 'Order conversation',
  description = 'Chat with the client and production team on this order.',
}: OrderChannelChatProps) {
  const { subscribeMessageCreated, joinChannel, leaveChannel } = useRealtime();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [pendingDeleteMessageId, setPendingDeleteMessageId] = useState<
    string | null
  >(null);
  const [deleteDialogNowMs, setDeleteDialogNowMs] = useState(() => Date.now());
  const [isDeletingMessage, setIsDeletingMessage] = useState(false);
  const canDeleteForEveryone = isWorkspaceAdmin(user.roleCodes);
  const pendingDeleteMessage = pendingDeleteMessageId
    ? messages.find((message) => message.id === pendingDeleteMessageId) ?? null
    : null;
  const pendingDeleteAllowsEveryone = Boolean(
    pendingDeleteMessage &&
      canDeleteMessageForEveryone(pendingDeleteMessage, {
        currentUserId: user.id,
        isWorkspaceAdmin: canDeleteForEveryone,
        nowMs: deleteDialogNowMs,
      }),
  );

  useEffect(() => {
    if (!pendingDeleteMessageId) return;
    setDeleteDialogNowMs(Date.now());
    const intervalId = window.setInterval(() => {
      setDeleteDialogNowMs(Date.now());
    }, 1000);
    return () => window.clearInterval(intervalId);
  }, [pendingDeleteMessageId]);

  const loadMessages = useCallback(async () => {
    setIsLoading(true);
    setErrorMessage(null);
    try {
      const response = await apiRequest<ApiResponse<ChatMessage[]>>(
        `/channels/${channelId}/messages`,
      );
      setMessages(Array.isArray(response.data) ? response.data : []);
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : 'Failed to load messages',
      );
    } finally {
      setIsLoading(false);
    }
  }, [channelId]);

  useEffect(() => {
    void loadMessages();
  }, [loadMessages]);

  useEffect(() => {
    joinChannel(channelId);
    return () => leaveChannel(channelId);
  }, [channelId, joinChannel, leaveChannel]);

  useEffect(() => {
    return subscribeMessageCreated(({ channelId: incomingId, message }) => {
      if (incomingId !== channelId) return;
      const typed = message as ChatMessage;
      if (typed.isThreadReply) return;
      setMessages((current) => appendUniqueById(current, typed));
    });
  }, [subscribeMessageCreated, channelId]);

  async function handleSubmit(payload: {
    body: string;
    attachments: Array<{
      kind: 'file' | 'link';
      fileId?: string;
      url?: string;
      title?: string;
    }>;
  }) {
    setIsSubmitting(true);
    try {
      const response = await apiRequest<ApiResponse<ChatMessage>>(
        `/channels/${channelId}/messages`,
        {
          method: 'POST',
          body: JSON.stringify({
            body: payload.body,
            attachments: payload.attachments,
          }),
        },
      );
      setMessages((current) => appendUniqueById(current, response.data));
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleReact(messageId: string, emoji: string) {
    await apiRequest(`/channels/${channelId}/messages/${messageId}/reactions`, {
      method: 'POST',
      body: JSON.stringify({ emoji }),
    });
    await loadMessages();
  }

  async function handleEdit(messageId: string, body: string) {
    const response = await apiRequest<ApiResponse<ChatMessage>>(
      `/channels/${channelId}/messages/${messageId}`,
      {
        method: 'PATCH',
        body: JSON.stringify({ body }),
      },
    );
    setMessages((current) =>
      current.map((message) =>
        message.id === messageId ? { ...message, ...response.data } : message,
      ),
    );
  }

  function handleDeleteRequest(messageId: string) {
    setDeleteDialogNowMs(Date.now());
    setPendingDeleteMessageId(messageId);
  }

  async function handleDeleteForMe() {
    if (!pendingDeleteMessageId) return;
    setIsDeletingMessage(true);
    try {
      await apiRequest(
        `/channels/${channelId}/messages/${pendingDeleteMessageId}/hide`,
        { method: 'POST' },
      );
      const messageId = pendingDeleteMessageId;
      setMessages((current) =>
        current.filter((message) => message.id !== messageId),
      );
      setPendingDeleteMessageId(null);
    } finally {
      setIsDeletingMessage(false);
    }
  }

  async function handleDeleteForEveryone() {
    if (!pendingDeleteMessageId) return;
    setIsDeletingMessage(true);
    try {
      const response = await apiRequest<ApiResponse<ChatMessage>>(
        `/channels/${channelId}/messages/${pendingDeleteMessageId}`,
        { method: 'DELETE' },
      );
      setMessages((current) =>
        current.map((message) =>
          message.id === pendingDeleteMessageId
            ? { ...message, ...response.data }
            : message,
        ),
      );
      setPendingDeleteMessageId(null);
    } finally {
      setIsDeletingMessage(false);
    }
  }

  if (errorMessage && messages.length === 0) {
    return (
      <ErrorState
        title="Unable to load conversation"
        description={errorMessage}
      />
    );
  }

  return (
    <Card padding="none" className="flex h-[480px] min-h-0 flex-col overflow-hidden">
      <div className="border-b border-[var(--border)] px-4 py-2">
        <p className="text-sm font-medium text-[var(--foreground)]">{title}</p>
        <p className="text-xs text-[var(--muted)]">{description}</p>
      </div>
      <ChatScrollArea scrollKey={channelId} contentClassName="space-y-1 px-2">
        <MessageList
          messages={messages}
          channelId={channelId}
          currentUserId={user.id}
          canManageChannel={false}
          canDeleteForEveryone={canDeleteForEveryone}
          isLoading={isLoading}
          activeThreadMessageId={null}
          onReply={() => undefined}
          onReact={handleReact}
          onEdit={handleEdit}
          onDelete={handleDeleteRequest}
          onPin={async () => undefined}
          onCopyMessage={(body) => void navigator.clipboard.writeText(body)}
          onCopyLink={() => undefined}
          onMarkUnread={async () => undefined}
        />
      </ChatScrollArea>
      <div className="border-t border-[var(--border)] p-3">
        <ChatComposer
          channelId={channelId}
          channelName="Order conversation"
          isSubmitting={isSubmitting}
          currentUserId={user.id}
          isInternalUser={!userIsExternal(user)}
          onSubmit={handleSubmit}
        />
      </div>
      <DeleteMessageDialog
        open={Boolean(pendingDeleteMessageId)}
        canDeleteForEveryone={pendingDeleteAllowsEveryone}
        busy={isDeletingMessage}
        onDeleteForMe={() => void handleDeleteForMe()}
        onDeleteForEveryone={() => void handleDeleteForEveryone()}
        onCancel={() => setPendingDeleteMessageId(null)}
      />
    </Card>
  );
}
