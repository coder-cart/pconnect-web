'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { Plus } from 'lucide-react';
import { apiRequest } from '@/lib/api-client';
import {
  ApiResponse,
  AuthenticatedUser,
  userHasPermission,
  userIsExternal,
} from '@/lib/auth';
import {
  appendUniqueById,
  ChatChannel,
  ChatMessage,
  ChannelContext,
  getChannelLabel,
  PendingChannelInvite,
} from '@/lib/chat-types';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { EmptyState, ErrorState } from '@/components/ui/StatePanels';
import { ListSkeleton } from '@/components/ui/Skeleton';
import { CreateChannelModal } from '@/components/modals/CreateChannelModal';
import { ManageChannelMembersModal } from '@/components/modals/ManageChannelMembersModal';
import { StartDirectMessageModal } from '@/components/modals/StartDirectMessageModal';
import { ChatComposer } from '@/components/chat/ChatComposer';
import { ChannelSidebar } from '@/components/chat/ChannelSidebar';
import { ChannelDetailsPanel } from '@/components/chat/ChannelDetailsPanel';
import { ChannelHeader } from '@/components/chat/ChannelHeader';
import { ChannelCanvasPanel } from '@/components/chat/ChannelCanvasPanel';
import { PinnedMessagesPanel } from '@/components/chat/PinnedMessagesPanel';
import { MessageList } from '@/components/chat/MessageList';
import { ThreadPanel } from '@/components/chat/ThreadPanel';
import { ChatScrollArea } from '@/components/chat/ChatScrollArea';
import { useRealtime } from '@/components/providers/RealtimeProvider';
import { useUnreadMessages } from '@/components/providers/UnreadMessagesProvider';
import { cn } from '@/lib/cn';
import { ChannelMemberOption, ChannelNotificationPreference } from '@/lib/channelMembers';

interface ChatWorkspaceProps {
  user: AuthenticatedUser;
  initialChannelId?: string | null;
  initialMessageId?: string | null;
}

function updateMessageInList(
  messages: ChatMessage[],
  updated: ChatMessage,
): ChatMessage[] {
  return messages.map((message) =>
    message.id === updated.id ? { ...message, ...updated } : message,
  );
}

function applyReactionToggle(
  messages: ChatMessage[],
  messageId: string,
  emoji: string,
  userId: string,
  added: boolean,
  currentUserId: string,
): ChatMessage[] {
  return messages.map((message) => {
    if (message.id !== messageId) return message;

    const reactions = [...(message.reactions ?? [])];
    const existing = reactions.find((reaction) => reaction.emoji === emoji);

    if (added) {
      if (existing) {
        existing.count += 1;
        existing.userIds.push(userId);
        if (userId === currentUserId) existing.reactedByMe = true;
      } else {
        reactions.push({
          emoji,
          count: 1,
          userIds: [userId],
          reactedByMe: userId === currentUserId,
        });
      }
    } else if (existing) {
      existing.count -= 1;
      existing.userIds = existing.userIds.filter((id) => id !== userId);
      if (userId === currentUserId) existing.reactedByMe = false;
      if (existing.count <= 0) {
        return {
          ...message,
          reactions: reactions.filter((reaction) => reaction.emoji !== emoji),
        };
      }
    }

    return { ...message, reactions };
  });
}

export function ChatWorkspace({
  user,
  initialChannelId = null,
  initialMessageId = null,
}: ChatWorkspaceProps) {
  const [channels, setChannels] = useState<ChatChannel[]>([]);
  const [selectedChannelId, setSelectedChannelId] = useState<string | null>(
    initialChannelId,
  );
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [unreadSince, setUnreadSince] = useState<string | null>(null);
  const channelsRef = useRef<ChatChannel[]>([]);
  channelsRef.current = channels;
  const [threadMessageId, setThreadMessageId] = useState<string | null>(null);
  const [threadReplies, setThreadReplies] = useState<ChatMessage[]>([]);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(() => {
    if (typeof window === 'undefined') return true;
    return window.localStorage.getItem('pconnect.chat.sidebarOpen') !== '0';
  });
  const [channelTab, setChannelTab] = useState<'messages' | 'canvas' | 'pins'>('messages');
  const [huddleLink, setHuddleLink] = useState<string | null>(null);
  const [highlightMessageId, setHighlightMessageId] = useState<string | null>(
    initialMessageId,
  );
  const [isLoadingChannels, setIsLoadingChannels] = useState(true);
  const [isLoadingMessages, setIsLoadingMessages] = useState(false);
  const [isLoadingThread, setIsLoadingThread] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [isSendingThreadReply, setIsSendingThreadReply] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [createChannelOpen, setCreateChannelOpen] = useState(false);
  const [channelPreset, setChannelPreset] = useState<{
    type?: string;
    clientOrganizationId?: string;
  } | null>(null);
  const [startDmOpen, setStartDmOpen] = useState(false);
  const [manageMembersOpen, setManageMembersOpen] = useState(false);
  const [viewerCanInviteClientTeammates, setViewerCanInviteClientTeammates] =
    useState(false);
  const [pinnedMessages, setPinnedMessages] = useState<
    Array<{ id: string; pinnedAt: string; message: ChatMessage }>
  >([]);
  const [isLoadingPins, setIsLoadingPins] = useState(false);
  const [pendingInvites, setPendingInvites] = useState<PendingChannelInvite[]>([]);
  const [channelContext, setChannelContext] = useState<ChannelContext | null>(null);
  const [channelMembers, setChannelMembers] = useState<ChannelMemberOption[]>([]);
  const [notificationPreference, setNotificationPreference] =
    useState<ChannelNotificationPreference | null>(null);
  const [isUpdatingNotification, setIsUpdatingNotification] = useState(false);
  const [acceptingInviteId, setAcceptingInviteId] = useState<string | null>(null);
  const selectedChannelIdRef = useRef<string | null>(null);
  const threadMessageIdRef = useRef<string | null>(null);
  const {
    joinChannel,
    leaveChannel,
    subscribeMessageCreated,
    subscribeChannelEvents,
  } = useRealtime();
  const { unreadByChannel, loaded: unreadLoaded, setActiveChannel } =
    useUnreadMessages();
  const isExternalUser = userIsExternal(user);
  const canCreateChannel =
    !isExternalUser && userHasPermission(user, 'channels.create_internal');

  const openCreateChannel = useCallback(() => {
    setChannelPreset({ type: 'public' });
    setCreateChannelOpen(true);
  }, []);

  const openCreateExternalConnection = useCallback(() => {
    setChannelPreset({ type: 'client_shared' });
    setCreateChannelOpen(true);
  }, []);

  const closeCreateChannel = useCallback(() => {
    setCreateChannelOpen(false);
    setChannelPreset(null);
  }, []);

  const loadChannels = useCallback(async () => {
    const response = await apiRequest<
      ApiResponse<{ items: ChatChannel[] }>
    >('/channels?pageSize=100');
    setChannels(
      response.data.items.filter((channel) => !channel.orderId),
    );
    return response.data.items.filter((channel) => !channel.orderId);
  }, []);

  const loadPinnedMessages = useCallback(async (channelId: string) => {
    setIsLoadingPins(true);

    try {
      const response = await apiRequest<
        ApiResponse<Array<{ id: string; pinnedAt: string; message: ChatMessage }>>
      >(`/channels/${channelId}/pins`);
      setPinnedMessages(response.data);
    } catch {
      setPinnedMessages([]);
    } finally {
      setIsLoadingPins(false);
    }
  }, []);

  const loadPendingInvites = useCallback(async () => {
    if (!isExternalUser) {
      setPendingInvites([]);
      return [];
    }

    const response = await apiRequest<ApiResponse<PendingChannelInvite[]>>(
      '/channels/invites/pending',
    );
    setPendingInvites(response.data);
    return response.data;
  }, [isExternalUser]);

  useEffect(() => {
    loadChannels()
      .then((data) => {
        if (data.length > 0) {
          setSelectedChannelId((current) => {
            const preferred = current ?? initialChannelId;
            if (preferred) return preferred;

            if (isExternalUser) {
              const hub = data.find((channel) => channel.type === 'client_shared');
              return hub?.id ?? data[0].id;
            }

            return data[0].id;
          });
        }
      })
      .catch((error: Error) => setErrorMessage(error.message))
      .finally(() => setIsLoadingChannels(false));

    loadPendingInvites().catch(() => setPendingInvites([]));
  }, [loadChannels, loadPendingInvites, initialChannelId, isExternalUser]);

  useEffect(() => {
    selectedChannelIdRef.current = selectedChannelId;
    setActiveChannel(selectedChannelId);
    return () => setActiveChannel(null);
  }, [selectedChannelId, setActiveChannel]);

  useEffect(() => {
    setDetailsOpen(false);
  }, [selectedChannelId]);

  useEffect(() => {
    if (!unreadLoaded) {
      return;
    }
    setChannels((current) =>
      current.map((channel) => ({
        ...channel,
        unreadCount:
          channel.id === selectedChannelIdRef.current
            ? 0
            : (unreadByChannel[channel.id] ?? 0),
      })),
    );
  }, [unreadByChannel, unreadLoaded]);

  useEffect(() => {
    threadMessageIdRef.current = threadMessageId;
  }, [threadMessageId]);

  useEffect(() => {
    return subscribeMessageCreated(({ channelId, message }) => {
      const typedMessage = message as ChatMessage;
      const activeChannelId = selectedChannelIdRef.current;
      const activeThreadId = threadMessageIdRef.current;

      if (typedMessage.isThreadReply && typedMessage.parentMessageId) {
        if (
          activeThreadId === typedMessage.parentMessageId &&
          channelId === activeChannelId
        ) {
          setThreadReplies((current) =>
            appendUniqueById(current, typedMessage),
          );
        }

        setMessages((current) =>
          current.map((item) =>
            item.id === typedMessage.parentMessageId
              ? { ...item, replyCount: (item.replyCount ?? 0) + 1 }
              : item,
          ),
        );
        return;
      }

      if (channelId === activeChannelId) {
        setMessages((current) => appendUniqueById(current, typedMessage));
      }
    });
  }, [subscribeMessageCreated]);

  useEffect(() => {
    return subscribeChannelEvents(({ channelId, event, data }) => {
      if (channelId !== selectedChannelIdRef.current) return;

      if (event === 'message.updated' || event === 'message.deleted') {
        const updated = (data as { message: ChatMessage }).message ?? data;
        setMessages((current) =>
          updateMessageInList(current, updated as ChatMessage),
        );
        setThreadReplies((current) =>
          updateMessageInList(current, updated as ChatMessage),
        );
      }

      if (event === 'reaction.added' || event === 'reaction.removed') {
        const payload = data as {
          messageId: string;
          emoji: string;
          userId: string;
        };
        const added = event === 'reaction.added';
        setMessages((current) =>
          applyReactionToggle(
            current,
            payload.messageId,
            payload.emoji,
            payload.userId,
            added,
            user.id,
          ),
        );
        setThreadReplies((current) =>
          applyReactionToggle(
            current,
            payload.messageId,
            payload.emoji,
            payload.userId,
            added,
            user.id,
          ),
        );
      }
    });
  }, [subscribeChannelEvents, user.id]);

  useEffect(() => {
    if (!selectedChannelId || isLoadingChannels) return;

    const requestChannelId = selectedChannelId;
    joinChannel(requestChannelId);
    setChannelTab('messages');
    setIsLoadingMessages(true);
    setMessages([]);
    setErrorMessage(null);
    setThreadMessageId(null);
    setThreadReplies([]);
    setHuddleLink(null);
    const openChannel = channelsRef.current.find(
      (channel) => channel.id === requestChannelId,
    );
    setUnreadSince(
      (openChannel?.unreadCount ?? 0) > 0
        ? openChannel?.lastReadAt ?? new Date(0).toISOString()
        : null,
    );

    let cancelled = false;

    Promise.all([
      apiRequest<ApiResponse<ChatMessage[]>>(
        `/channels/${requestChannelId}/messages`,
      ),
      apiRequest<ApiResponse<unknown>>(`/channels/${requestChannelId}/read`, {
        method: 'POST',
      }),
      apiRequest<ApiResponse<{ joinPath?: string } | null>>(
        `/channels/${requestChannelId}/huddles/active`,
      ).catch(() => ({ success: true, data: null })),
    ])
      .then(([messagesResponse, , huddleResponse]) => {
        if (cancelled || selectedChannelIdRef.current !== requestChannelId) {
          return;
        }
        setMessages(messagesResponse.data);
        setChannels((current) =>
          current.map((channel) =>
            channel.id === requestChannelId
              ? { ...channel, unreadCount: 0 }
              : channel,
          ),
        );
        const joinPath = huddleResponse.data?.joinPath;
        setHuddleLink(joinPath ? `${window.location.origin}${joinPath}` : null);
      })
      .catch((error: Error) => {
        if (cancelled || selectedChannelIdRef.current !== requestChannelId) {
          return;
        }
        setErrorMessage(error.message);
      })
      .finally(() => {
        if (cancelled || selectedChannelIdRef.current !== requestChannelId) {
          return;
        }
        setIsLoadingMessages(false);
      });

    return () => {
      cancelled = true;
      leaveChannel(requestChannelId);
    };
  }, [selectedChannelId, isLoadingChannels, joinChannel, leaveChannel]);

  useEffect(() => {
    const channel = channels.find((item) => item.id === selectedChannelId);

    if (!selectedChannelId || channel?.type !== 'client_shared') {
      setChannelContext(null);
      setViewerCanInviteClientTeammates(false);
      return;
    }

    apiRequest<
      ApiResponse<{
        clientOrganization?: { name: string } | null;
        project?: {
          name: string;
          clientOrganization?: { name: string } | null;
        } | null;
        viewerCanInviteClientTeammates?: boolean;
      }>
    >(`/channels/${selectedChannelId}`)
      .then((response) => {
        setChannelContext({
          projectName: response.data.project?.name,
          clientOrganizationName:
            response.data.clientOrganization?.name ??
            response.data.project?.clientOrganization?.name ??
            channel.displayName ??
            undefined,
        });
        setViewerCanInviteClientTeammates(
          Boolean(response.data.viewerCanInviteClientTeammates),
        );
      })
      .catch(() => {
        setChannelContext(null);
        setViewerCanInviteClientTeammates(false);
      });
  }, [selectedChannelId, channels]);

  useEffect(() => {
    if (!selectedChannelId) {
      setChannelMembers([]);
      return;
    }

    apiRequest<ApiResponse<ChannelMemberOption[]>>(
      `/channels/${selectedChannelId}/members`,
    )
      .then((response) => setChannelMembers(response.data))
      .catch(() => setChannelMembers([]));
  }, [selectedChannelId]);

  useEffect(() => {
    if (!selectedChannelId || (channelTab !== 'pins' && !detailsOpen)) {
      return;
    }

    void loadPinnedMessages(selectedChannelId);
  }, [selectedChannelId, channelTab, detailsOpen, loadPinnedMessages]);

  useEffect(() => {
    if (!selectedChannelId) {
      setNotificationPreference(null);
      return;
    }

    apiRequest<ApiResponse<ChannelNotificationPreference>>(
      `/channels/${selectedChannelId}/notification-preference`,
    )
      .then((response) => setNotificationPreference(response.data))
      .catch(() => setNotificationPreference(null));
  }, [selectedChannelId]);

  useEffect(() => {
    if (!selectedChannelId || !threadMessageId) {
      setThreadReplies([]);
      return;
    }

    setIsLoadingThread(true);

    apiRequest<ApiResponse<ChatMessage[]>>(
      `/channels/${selectedChannelId}/messages/${threadMessageId}/replies`,
    )
      .then((response) => setThreadReplies(response.data))
      .catch((error: Error) => setErrorMessage(error.message))
      .finally(() => setIsLoadingThread(false));
  }, [selectedChannelId, threadMessageId]);

  useEffect(() => {
    if (!initialMessageId) return;
    window.setTimeout(() => setHighlightMessageId(null), 3000);
  }, [initialMessageId, messages]);

  async function handleNotificationChange(payload: {
    notificationLevel?: ChannelNotificationPreference['notificationLevel'];
    mutedUntil?: string | null;
  }) {
    if (!selectedChannelId) return;

    setIsUpdatingNotification(true);
    try {
      const response = await apiRequest<ApiResponse<ChannelNotificationPreference>>(
        `/channels/${selectedChannelId}/notification-preference`,
        {
          method: 'PATCH',
          body: JSON.stringify(payload),
        },
      );
      setNotificationPreference(response.data);
      await loadChannels();
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : 'Unable to update notification preference',
      );
      throw error;
    } finally {
      setIsUpdatingNotification(false);
    }
  }

  async function handleAcceptInvite(invite: PendingChannelInvite) {
    setAcceptingInviteId(invite.id);
    setErrorMessage(null);

    try {
      await apiRequest(
        `/channels/${invite.channelId}/invites/${invite.id}/accept`,
        { method: 'POST' },
      );
      await loadChannels();
      await loadPendingInvites();
      setSelectedChannelId(invite.channelId);
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : 'Unable to accept invite',
      );
    } finally {
      setAcceptingInviteId(null);
    }
  }

  async function handleSendMessage(payload: {
    body: string;
    attachments: Array<{
      kind: 'file' | 'link';
      fileId?: string;
      url?: string;
      title?: string;
    }>;
  }) {
    if (!selectedChannelId) return;

    setIsSending(true);
    setErrorMessage(null);

    try {
      const response = await apiRequest<ApiResponse<ChatMessage>>(
        `/channels/${selectedChannelId}/messages`,
        {
          method: 'POST',
          body: JSON.stringify(payload),
        },
      );

      setMessages((currentMessages) =>
        appendUniqueById(currentMessages, response.data),
      );
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : 'Unable to send message',
      );
      throw error;
    } finally {
      setIsSending(false);
    }
  }

  async function handleSendThreadReply(payload: {
    body: string;
    attachments: Array<{
      kind: 'file' | 'link';
      fileId?: string;
      url?: string;
      title?: string;
    }>;
    alsoSendToChannel?: boolean;
    notifyClientTeam?: boolean;
  }) {
    if (!selectedChannelId || !threadMessageId) return;

    setIsSendingThreadReply(true);

    try {
      const response = await apiRequest<ApiResponse<ChatMessage>>(
        `/channels/${selectedChannelId}/messages`,
        {
          method: 'POST',
          body: JSON.stringify({
            ...payload,
            parentMessageId: threadMessageId,
          }),
        },
      );

      setThreadReplies((current) => appendUniqueById(current, response.data));
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : 'Unable to send reply',
      );
      throw error;
    } finally {
      setIsSendingThreadReply(false);
    }
  }

  async function handleReact(messageId: string, emoji: string) {
    if (!selectedChannelId) return;

    const response = await apiRequest<
      ApiResponse<
        Array<{
          emoji: string;
          count: number;
          userIds: string[];
          reactedByMe: boolean;
        }>
      >
    >(`/channels/${selectedChannelId}/messages/${messageId}/reactions`, {
      method: 'POST',
      body: JSON.stringify({ emoji }),
    });

    setMessages((current) =>
      current.map((message) =>
        message.id === messageId
          ? { ...message, reactions: response.data }
          : message,
      ),
    );
    setThreadReplies((current) =>
      current.map((message) =>
        message.id === messageId
          ? { ...message, reactions: response.data }
          : message,
      ),
    );
  }

  async function handleEdit(messageId: string, body: string) {
    if (!selectedChannelId) return;

    const response = await apiRequest<ApiResponse<ChatMessage>>(
      `/channels/${selectedChannelId}/messages/${messageId}`,
      {
        method: 'PATCH',
        body: JSON.stringify({ body }),
      },
    );

    setMessages((current) => updateMessageInList(current, response.data));
    setThreadReplies((current) => updateMessageInList(current, response.data));
  }

  async function handleDelete(messageId: string) {
    if (!selectedChannelId) return;

    const response = await apiRequest<ApiResponse<ChatMessage>>(
      `/channels/${selectedChannelId}/messages/${messageId}`,
      { method: 'DELETE' },
    );

    setMessages((current) => updateMessageInList(current, response.data));
    setThreadReplies((current) => updateMessageInList(current, response.data));
  }

  async function handlePin(messageId: string) {
    if (!selectedChannelId) return;

    await apiRequest(`/channels/${selectedChannelId}/pins/${messageId}`, {
      method: 'POST',
    });

    if (channelTab === 'pins') {
      await loadPinnedMessages(selectedChannelId);
    }
  }

  async function handleUnpin(messageId: string) {
    if (!selectedChannelId) return;

    await apiRequest(`/channels/${selectedChannelId}/pins/${messageId}`, {
      method: 'DELETE',
    });
    await loadPinnedMessages(selectedChannelId);
  }

  function handleJumpToPinnedMessage(messageId: string) {
    setChannelTab('messages');
    setHighlightMessageId(messageId);
    setThreadMessageId(null);
    setDetailsOpen(false);
  }

  function handleOpenThread(messageId: string) {
    setDetailsOpen(false);
    setThreadMessageId(messageId);
  }

  function handleToggleDetails() {
    setDetailsOpen((current) => {
      const next = !current;
      if (next) {
        setThreadMessageId(null);
      }
      return next;
    });
  }

  function handleToggleSidebar() {
    setSidebarOpen((current) => {
      const next = !current;
      window.localStorage.setItem(
        'pconnect.chat.sidebarOpen',
        next ? '1' : '0',
      );
      return next;
    });
  }

  async function handleMarkUnread(messageId: string) {
    if (!selectedChannelId) return;

    await apiRequest(`/channels/${selectedChannelId}/mark-unread`, {
      method: 'POST',
      body: JSON.stringify({ messageId }),
    });
    await loadChannels();
  }

  function handleCopyMessage(body: string) {
    void navigator.clipboard.writeText(body);
  }

  function handleCopyLink(channelId: string, messageId: string) {
    const url = `${window.location.origin}/chat?channel=${channelId}&message=${messageId}`;
    void navigator.clipboard.writeText(url);
  }

  async function handleStartHuddle() {
    if (!selectedChannelId) return;

    const response = await apiRequest<ApiResponse<{ joinPath: string }>>(
      `/channels/${selectedChannelId}/huddles`,
      { method: 'POST' },
    );
    const link = `${window.location.origin}${response.data.joinPath}`;
    setHuddleLink(link);
    void navigator.clipboard.writeText(link);
  }

  function handleCopyHuddleLink() {
    if (huddleLink) {
      void navigator.clipboard.writeText(huddleLink);
    }
  }

  async function handleChannelCreated() {
    const data = await loadChannels();
    if (data.length > 0) {
      setSelectedChannelId(data[data.length - 1].id);
    }
  }

  async function handleDirectMessageStarted(channel: ChatChannel) {
    setChannels((current) => appendUniqueById(current, channel));
    setSelectedChannelId(channel.id);
  }

  const selectedChannel = channels.find(
    (channel) => channel.id === selectedChannelId,
  );
  const canManageMembers =
    (canCreateChannel &&
      (selectedChannel?.type === 'private' ||
        selectedChannel?.type === 'client_shared')) ||
    (isExternalUser &&
      selectedChannel?.type === 'client_shared' &&
      viewerCanInviteClientTeammates);
  const canInvite = canManageMembers;
  const activeThreadMessage = messages.find(
    (message) => message.id === threadMessageId,
  );

  if (isLoadingChannels) {
    return <ListSkeleton rows={4} />;
  }

  if (errorMessage && channels.length === 0) {
    return <ErrorState title="Unable to load chat" description={errorMessage} />;
  }

  if (channels.length === 0 && pendingInvites.length === 0) {
    return (
      <>
        <div className="space-y-4">
          <EmptyState
            title={isExternalUser ? 'No conversations yet' : 'No channels yet'}
            description={
              isExternalUser
                ? 'Message your organization teammates or wait for a shared project channel invite.'
                : 'Join or create a channel to start collaborating.'
            }
          />
          <div className="flex justify-center gap-2">
            {canCreateChannel ? (
              <Button onClick={openCreateChannel}>
                <Plus className="h-4 w-4" />
                Create channel
              </Button>
            ) : null}
            {isExternalUser ? (
              <Button onClick={() => setStartDmOpen(true)}>
                <Plus className="h-4 w-4" />
                Start a message
              </Button>
            ) : null}
          </div>
        </div>
        <CreateChannelModal
          open={createChannelOpen}
          onClose={closeCreateChannel}
          onCreated={handleChannelCreated}
          presetType={channelPreset?.type}
          presetClientOrganizationId={channelPreset?.clientOrganizationId}
          lockClientOrganization={Boolean(channelPreset?.clientOrganizationId)}
        />
        <StartDirectMessageModal
          open={startDmOpen}
          onClose={() => setStartDmOpen(false)}
          onStarted={handleDirectMessageStarted}
          isExternalUser={isExternalUser}
        />
      </>
    );
  }

  if (channels.length === 0 && pendingInvites.length > 0) {
    return (
      <>
        <Card padding="md" className="max-w-xl space-y-4">
          <div>
            <h2 className="text-base font-semibold text-[var(--foreground)]">
              Pending channel invitations
            </h2>
            <p className="mt-1 text-sm text-[var(--muted)]">
              Accept an invitation to join a shared client channel, or message
              your teammates anytime.
            </p>
          </div>
          <div className="space-y-3">
            {pendingInvites.map((invite) => (
              <div
                key={invite.id}
                className="flex items-center justify-between gap-3 rounded-[var(--radius-md)] border border-[var(--border)] p-3"
              >
                <div>
                  <p className="text-sm font-medium">#{invite.channel.name}</p>
                </div>
                <Button
                  size="sm"
                  disabled={acceptingInviteId === invite.id}
                  onClick={() => void handleAcceptInvite(invite)}
                >
                  Accept
                </Button>
              </div>
            ))}
          </div>
          {isExternalUser ? (
            <Button variant="secondary" onClick={() => setStartDmOpen(true)}>
              <Plus className="h-4 w-4" />
              Start a message
            </Button>
          ) : null}
        </Card>
        <StartDirectMessageModal
          open={startDmOpen}
          onClose={() => setStartDmOpen(false)}
          onStarted={handleDirectMessageStarted}
          isExternalUser={isExternalUser}
        />
      </>
    );
  }

  const showMobileChat = Boolean(selectedChannelId);
  const showDesktopSidebar = sidebarOpen;

  return (
    <>
      <div
        className={cn(
          'grid h-full min-h-0 gap-0 lg:gap-3',
          showDesktopSidebar && (detailsOpen || threadMessageId)
            ? 'lg:grid-cols-[280px_minmax(0,1fr)_320px]'
            : showDesktopSidebar
              ? 'lg:grid-cols-[280px_minmax(0,1fr)]'
              : detailsOpen || threadMessageId
                ? 'lg:grid-cols-[minmax(0,1fr)_320px]'
                : 'lg:grid-cols-[minmax(0,1fr)]',
        )}
      >
        <ChannelSidebar
          channels={channels}
          selectedChannelId={selectedChannelId}
          pendingInvites={pendingInvites}
          acceptingInviteId={acceptingInviteId}
          canCreateChannel={canCreateChannel}
          onSelectChannel={setSelectedChannelId}
          onCreateChannel={openCreateChannel}
          onCreateExternalConnection={
            isExternalUser ? undefined : openCreateExternalConnection
          }
          onStartDirectMessage={() => setStartDmOpen(true)}
          onAcceptInvite={(invite) => void handleAcceptInvite(invite)}
          className={cn(
            showMobileChat ? 'hidden' : 'flex',
            showDesktopSidebar ? 'lg:flex' : 'lg:hidden',
          )}
        />

        <Card
          padding="none"
          className={cn(
            'flex min-h-0 min-w-0 flex-col overflow-hidden',
            !showMobileChat ? 'hidden lg:flex' : 'flex',
          )}
        >
          <ChannelHeader
            channelName={selectedChannel?.name}
            channelDisplayName={selectedChannel?.displayName}
            channelType={selectedChannel?.type}
            clientOrganizationId={selectedChannel?.clientOrganizationId}
            clientOrganizationLogoUpdatedAt={
              selectedChannel?.clientOrganizationLogoUpdatedAt
            }
            channelContext={channelContext}
            members={channelMembers}
            activeTab={channelTab}
            onTabChange={setChannelTab}
            canInvite={canInvite}
            onInvite={() => setManageMembersOpen(true)}
            onStartHuddle={() => void handleStartHuddle()}
            onCopyHuddleLink={handleCopyHuddleLink}
            huddleLink={huddleLink}
            notificationPreference={notificationPreference}
            isUpdatingNotification={isUpdatingNotification}
            onNotificationChange={handleNotificationChange}
            detailsOpen={detailsOpen}
            onToggleDetails={
              selectedChannelId ? handleToggleDetails : undefined
            }
            sidebarOpen={sidebarOpen}
            onToggleSidebar={handleToggleSidebar}
            onBack={() => {
              setSelectedChannelId(null);
              setThreadMessageId(null);
              setDetailsOpen(false);
            }}
          />

          {channelTab === 'canvas' ? (
            selectedChannelId ? (
              <ChannelCanvasPanel channelId={selectedChannelId} />
            ) : null
          ) : channelTab === 'pins' ? (
            selectedChannelId ? (
              <PinnedMessagesPanel
                pins={pinnedMessages}
                isLoading={isLoadingPins}
                canUnpin={canCreateChannel}
                onJumpToMessage={handleJumpToPinnedMessage}
                onUnpin={handleUnpin}
              />
            ) : null
          ) : (
            <>
              {selectedChannelId ? (
                <ChatScrollArea
                  scrollKey={selectedChannelId}
                  anchorMessageId={initialMessageId}
                  containerClassName="px-3 py-3 sm:px-5 sm:py-4"
                  contentClassName="space-y-0.5"
                >
                  <MessageList
                    messages={messages}
                    channelId={selectedChannelId}
                    currentUserId={user.id}
                    unreadSince={unreadSince}
                    canManageChannel={canManageMembers}
                    isLoading={isLoadingMessages}
                    activeThreadMessageId={threadMessageId}
                    highlightMessageId={highlightMessageId}
                    onReply={handleOpenThread}
                    onReact={handleReact}
                    onEdit={handleEdit}
                    onDelete={handleDelete}
                    onPin={handlePin}
                    onCopyMessage={handleCopyMessage}
                    onCopyLink={handleCopyLink}
                    onMarkUnread={handleMarkUnread}
                  />
                </ChatScrollArea>
              ) : null}

              <div className="safe-pb shrink-0 border-t border-[var(--border)] bg-[var(--surface)] p-3 sm:p-4">
                <ChatComposer
                  channelId={selectedChannelId}
                  channelName={
                    selectedChannel
                      ? getChannelLabel(selectedChannel)
                      : undefined
                  }
                  channelType={selectedChannel?.type}
                  isSubmitting={isSending}
                  members={channelMembers}
                  currentUserId={user.id}
                  isInternalUser={!userIsExternal(user)}
                  onSubmit={handleSendMessage}
                />
              </div>
            </>
          )}
        </Card>

        {detailsOpen && selectedChannelId ? (
          <ChannelDetailsPanel
            channelName={selectedChannel?.name}
            channelDisplayName={selectedChannel?.displayName}
            channelType={selectedChannel?.type}
            channelContext={channelContext}
            members={channelMembers}
            messages={messages}
            pins={pinnedMessages}
            isLoadingPins={isLoadingPins}
            canInvite={canInvite}
            onInvite={() => setManageMembersOpen(true)}
            onJumpToPin={handleJumpToPinnedMessage}
            onClose={() => setDetailsOpen(false)}
          />
        ) : null}

        {!detailsOpen &&
        threadMessageId &&
        activeThreadMessage &&
        selectedChannelId ? (
          <ThreadPanel
            channelId={selectedChannelId}
            channelName={selectedChannel?.name}
            channelType={selectedChannel?.type}
            parentMessage={activeThreadMessage}
            replies={threadReplies}
            currentUserId={user.id}
            isInternalUser={!userIsExternal(user)}
            members={channelMembers}
            canManageChannel={canManageMembers}
            isLoading={isLoadingThread}
            isSending={isSendingThreadReply}
            onClose={() => setThreadMessageId(null)}
            onSubmitReply={handleSendThreadReply}
            onReact={handleReact}
            onEdit={handleEdit}
            onDelete={handleDelete}
            onPin={handlePin}
            onCopyMessage={handleCopyMessage}
            onCopyLink={handleCopyLink}
            onMarkUnread={handleMarkUnread}
          />
        ) : null}
      </div>

      {errorMessage ? (
        <p className="mt-3 text-sm text-[var(--danger)]">{errorMessage}</p>
      ) : null}

      <CreateChannelModal
        open={createChannelOpen}
        onClose={closeCreateChannel}
        onCreated={handleChannelCreated}
        presetType={channelPreset?.type}
        presetClientOrganizationId={channelPreset?.clientOrganizationId}
        lockClientOrganization={Boolean(channelPreset?.clientOrganizationId)}
      />
      <StartDirectMessageModal
        open={startDmOpen}
        onClose={() => setStartDmOpen(false)}
        onStarted={handleDirectMessageStarted}
        isExternalUser={isExternalUser}
      />
      <ManageChannelMembersModal
        open={manageMembersOpen}
        channelId={selectedChannelId}
        clientAdminMode={
          isExternalUser && Boolean(viewerCanInviteClientTeammates)
        }
        onClose={() => setManageMembersOpen(false)}
        onUpdated={() => void loadChannels()}
      />
    </>
  );
}
