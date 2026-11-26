'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Plus } from 'lucide-react';
import { apiRequest } from '@/lib/api-client';
import {
  buildChatHref,
  CHAT_LIST_PATH,
  CHAT_OVERLAY_HISTORY_TOKEN,
  clearChatConversationUrl,
  dismissSoftHistoryLayer,
  ensureMobileChatListUnderConversation,
  historyHasChatConversationFrame,
  isMobileChatViewport,
  markChatConversationHistoryFrame,
  navigateToChatConversation,
} from '@/lib/chat-navigation';
import {
  ApiResponse,
  AuthenticatedUser,
  isProductionOnlyStaff,
  isClientChatOnly,
  userHasPermission,
  userIsExternal,
} from '@/lib/auth';
import {
  appendUniqueById,
  prependOlderMessagePage,
  insertMessageChronologically,
  normalizeChannelMessagesPage,
  ChatChannel,
  ChatMessage,
  ChannelContext,
  ChannelMessagesPage,
  getChannelLabel,
  PendingChannelInvite,
} from '@/lib/chat-types';
import type { ChatScrollRestore } from '@/hooks/useChatScroll';
import { useChatKeyboardViewport } from '@/hooks/useChatKeyboardViewport';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { EmptyState, ErrorState } from '@/components/ui/StatePanels';
import { ListSkeleton } from '@/components/ui/Skeleton';
import { CreateChannelModal } from '@/components/modals/CreateChannelModal';
import { ManageChannelMembersModal } from '@/components/modals/ManageChannelMembersModal';
import { AddConnectionModal } from '@/components/modals/AddConnectionModal';
import { StartDirectMessageModal } from '@/components/modals/StartDirectMessageModal';
import { ChatComposer } from '@/components/chat/ChatComposer';
import { ChannelSidebar } from '@/components/chat/ChannelSidebar';
import { ChannelDetailsPanel } from '@/components/chat/ChannelDetailsPanel';
import { ChannelHeader } from '@/components/chat/ChannelHeader';
import { MessageList } from '@/components/chat/MessageList';
import { ThreadPanel } from '@/components/chat/ThreadPanel';
import { DeleteMessageDialog } from '@/components/chat/DeleteMessageDialog';
import { DeleteConversationDialog } from '@/components/chat/DeleteConversationDialog';
import { ClearChatDialog } from '@/components/chat/ClearChatDialog';
import { DeleteChannelDialog } from '@/components/chat/DeleteChannelDialog';
import { useRealtime } from '@/components/providers/RealtimeProvider';
import { useUnreadMessages } from '@/components/providers/UnreadMessagesProvider';
import { cn } from '@/lib/cn';
import { formatMentionPlainText } from '@/lib/chatMarkdown';
import { CHAT_HUDDLE_ENABLED } from '@/lib/chat-release';
import { ChannelMemberOption, ChannelNotificationPreference } from '@/lib/channelMembers';
import { applyPresenceUpdate } from '@/lib/user-presence';
import { isWorkspaceAdmin } from '@/lib/navigation';
import { canDeleteMessageForEveryone } from '@/lib/chat-message-permissions';

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

function resolveReactorName(
  userId: string,
  currentUserId: string,
  reactor?: { fullName?: string | null },
  memberNames?: Record<string, string>,
) {
  const fromPayload = reactor?.fullName?.trim();
  if (
    fromPayload &&
    fromPayload.toLowerCase() !== 'team member' &&
    fromPayload.toLowerCase() !== 'someone' &&
    fromPayload.toLowerCase() !== 'unknown user'
  ) {
    return fromPayload;
  }
  if (memberNames?.[userId]) {
    return memberNames[userId];
  }
  if (userId === currentUserId) {
    return 'You';
  }
  return 'Someone';
}

function applyReactionToggle(
  messages: ChatMessage[],
  messageId: string,
  emoji: string,
  userId: string,
  added: boolean,
  currentUserId: string,
  reactor?: { id: string; fullName: string; avatarUpdatedAt?: string | null },
  memberNames?: Record<string, string>,
): ChatMessage[] {
  return messages.map((message) => {
    if (message.id !== messageId) return message;

    const reactions = [...(message.reactions ?? [])].map((reaction) => ({
      ...reaction,
      userIds: [...reaction.userIds],
      users: reaction.users ? [...reaction.users] : undefined,
    }));
    const existing = reactions.find((reaction) => reaction.emoji === emoji);
    const reactorProfile = {
      id: reactor?.id ?? userId,
      fullName: resolveReactorName(
        userId,
        currentUserId,
        reactor,
        memberNames,
      ),
      avatarUpdatedAt: reactor?.avatarUpdatedAt ?? null,
    };

    if (added) {
      if (existing) {
        if (!existing.userIds.includes(userId)) {
          existing.count += 1;
          existing.userIds.push(userId);
          existing.users = [
            ...(existing.users ?? []),
            {
              id: reactorProfile.id,
              fullName: reactorProfile.fullName,
              avatarUpdatedAt: reactorProfile.avatarUpdatedAt ?? null,
            },
          ];
        }
        if (userId === currentUserId) existing.reactedByMe = true;
      } else {
        reactions.push({
          emoji,
          count: 1,
          userIds: [userId],
          users: [
            {
              id: reactorProfile.id,
              fullName: reactorProfile.fullName,
              avatarUpdatedAt: reactorProfile.avatarUpdatedAt ?? null,
            },
          ],
          reactedByMe: userId === currentUserId,
        });
      }
    } else if (existing) {
      existing.count -= 1;
      existing.userIds = existing.userIds.filter((id) => id !== userId);
      existing.users = (existing.users ?? []).filter(
        (user) => user.id !== userId,
      );
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
  const router = useRouter();
  const conversationHistoryPushedRef = useRef(false);
  const overlayHistoryPushedRef = useRef(false);
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
  const [hasMoreThreadReplies, setHasMoreThreadReplies] = useState(false);
  const [isLoadingOlderThreadReplies, setIsLoadingOlderThreadReplies] =
    useState(false);
  const loadingOlderThreadRef = useRef(false);
  const threadRepliesRef = useRef<ChatMessage[]>([]);
  const threadScrollContainerRef = useRef<HTMLDivElement | null>(null);
  threadRepliesRef.current = threadReplies;
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(() => {
    if (typeof window === 'undefined') return true;
    return window.localStorage.getItem('pconnect.chat.sidebarOpen') !== '0';
  });
  const [huddleLink, setHuddleLink] = useState<string | null>(null);
  const [highlightMessageId, setHighlightMessageId] = useState<string | null>(
    initialMessageId,
  );
  const [isLoadingChannels, setIsLoadingChannels] = useState(true);
  const [isLoadingMessages, setIsLoadingMessages] = useState(false);
  const [hasMoreMessages, setHasMoreMessages] = useState(false);
  const [isLoadingOlderMessages, setIsLoadingOlderMessages] = useState(false);
  const [activeScrollKey, setActiveScrollKey] = useState<string | null>(null);
  const [restoreOnKeyChange, setRestoreOnKeyChange] =
    useState<ChatScrollRestore | null>(null);
  const scrollPositionsRef = useRef<
    Map<string, { scrollTop: number; distanceFromBottom: number }>
  >(new Map());
  const currentScrollPositionRef = useRef<{
    scrollTop: number;
    distanceFromBottom: number;
  } | null>(null);
  const loadingOlderRef = useRef(false);
  const hasMoreMessagesRef = useRef(false);
  const messagesRef = useRef<ChatMessage[]>([]);
  const initialMessageIdRef = useRef(initialMessageId);
  initialMessageIdRef.current = initialMessageId;
  const chatPaneRef = useChatKeyboardViewport(true);
  messagesRef.current = messages;
  hasMoreMessagesRef.current = hasMoreMessages;
  const [isLoadingThread, setIsLoadingThread] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [isSendingThreadReply, setIsSendingThreadReply] = useState(false);
  const [isDeletingGroup, setIsDeletingGroup] = useState(false);
  const [pendingDeleteMessageId, setPendingDeleteMessageId] = useState<
    string | null
  >(null);
  const [deleteDialogNowMs, setDeleteDialogNowMs] = useState(() => Date.now());
  const [isDeletingMessage, setIsDeletingMessage] = useState(false);
  const [pendingHideChannelId, setPendingHideChannelId] = useState<
    string | null
  >(null);
  const [isHidingConversation, setIsHidingConversation] = useState(false);
  const [clearChatConfirmOpen, setClearChatConfirmOpen] = useState(false);
  const [isClearingChat, setIsClearingChat] = useState(false);
  const [deleteChannelConfirmOpen, setDeleteChannelConfirmOpen] =
    useState(false);
  /** When set, keep unread badge on the selected channel (mark-as-unread). */
  const preserveSelectedUnreadRef = useRef(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [createChannelOpen, setCreateChannelOpen] = useState(false);
  const [channelPreset, setChannelPreset] = useState<{
    type?: string;
    clientOrganizationId?: string;
  } | null>(null);
  const [startDmOpen, setStartDmOpen] = useState(false);
  const [addConnectionOpen, setAddConnectionOpen] = useState(false);
  const [manageMembersOpen, setManageMembersOpen] = useState(false);
  const [viewerCanInviteClientTeammates, setViewerCanInviteClientTeammates] =
    useState(false);
  const [pinnedMessages, setPinnedMessages] = useState<
    Array<{
      id: string;
      pinnedAt: string;
      pinnedBy?: {
        id: string;
        fullName: string;
        email?: string;
        avatarUpdatedAt?: string | null;
      } | null;
      message: ChatMessage;
    }>
  >([]);
  const [isLoadingPins, setIsLoadingPins] = useState(false);
  const [pendingInvites, setPendingInvites] = useState<PendingChannelInvite[]>([]);
  const [channelContext, setChannelContext] = useState<ChannelContext | null>(null);
  const [channelMembers, setChannelMembers] = useState<ChannelMemberOption[]>([]);
  const memberNames = useMemo(() => {
    const directory: Record<string, string> = {
      [user.id]: user.fullName,
    };
    for (const member of channelMembers) {
      directory[member.id] = member.fullName;
    }
    return directory;
  }, [channelMembers, user.fullName, user.id]);
  const memberNamesRef = useRef(memberNames);
  memberNamesRef.current = memberNames;
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
    subscribePresenceUpdated,
  } = useRealtime();
  const {
    unreadByChannel,
    loaded: unreadLoaded,
    setActiveChannel,
    refreshUnread,
  } = useUnreadMessages();
  const isExternalUser = userIsExternal(user);
  const canCreateStaffChannel =
    !isExternalUser && userHasPermission(user, 'channels.create_internal');
  const canCreateClientPrivateChannel =
    isExternalUser && !isClientChatOnly(user);
  const canCreateChannel = canCreateStaffChannel || canCreateClientPrivateChannel;
  const canAddConnection =
    !isExternalUser &&
    !isProductionOnlyStaff(user.roleCodes) &&
    ['company_owner', 'internal_admin', 'internal_manager'].some((role) =>
      user.roleCodes.includes(role),
    );

  const openCreateChannel = useCallback(() => {
    setChannelPreset(null);
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
        ApiResponse<
          Array<{
            id: string;
            pinnedAt: string;
            pinnedBy?: {
              id: string;
              fullName: string;
              email?: string;
              avatarUpdatedAt?: string | null;
            } | null;
            message: ChatMessage;
          }>
        >
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

  const selectChannel = useCallback(
    (channelId: string, messageId?: string | null) => {
      const alreadyInConversation = Boolean(selectedChannelIdRef.current);
      const result = navigateToChatConversation(router, {
        channelId,
        messageId,
        pathname: CHAT_LIST_PATH,
        alreadyInConversation,
      });
      if (result.pushedConversation) {
        conversationHistoryPushedRef.current = true;
        queueMicrotask(() => {
          markChatConversationHistoryFrame();
        });
      }

      setSelectedChannelId(channelId);
      setDetailsOpen(false);
      setThreadMessageId(null);
      if (messageId) {
        setHighlightMessageId(messageId);
      }
    },
    [router],
  );

  const clearConversation = useCallback(
    (options?: { preferBack?: boolean }) => {
      const conversationWasStacked =
        conversationHistoryPushedRef.current ||
        historyHasChatConversationFrame();

      setThreadMessageId(null);
      setDetailsOpen(false);
      setSelectedChannelId(null);
      setHighlightMessageId(null);

      conversationHistoryPushedRef.current = false;
      overlayHistoryPushedRef.current = false;

      clearChatConversationUrl(router, {
        preferBack: options?.preferBack,
        conversationWasStacked,
      });
    },
    [router],
  );

  useEffect(() => {
    loadChannels()
      .then((data) => {
        if (data.length === 0) return;

        const preferred =
          selectedChannelIdRef.current ?? initialChannelId ?? null;
        if (preferred) {
          setSelectedChannelId(preferred);
          return;
        }

        // Mobile opens on the conversation list; desktop picks a default via URL.
        if (isMobileChatViewport()) {
          return;
        }

        const defaultId = isExternalUser
          ? (data.find((channel) => channel.type === 'client_shared')?.id ??
            data[0].id)
          : data[0].id;

        router.replace(buildChatHref(defaultId));
        setSelectedChannelId(defaultId);
      })
      .catch((error: Error) => setErrorMessage(error.message))
      .finally(() => setIsLoadingChannels(false));

    loadPendingInvites().catch(() => setPendingInvites([]));
  }, [
    loadChannels,
    loadPendingInvites,
    initialChannelId,
    isExternalUser,
    router,
  ]);

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
      current.map((channel) => {
        const fromProvider = unreadByChannel[channel.id] ?? 0;
        if (channel.id === selectedChannelIdRef.current) {
          // Keep intentional unread on the open conversation until the user
          // opens/reads it again (mark-as-unread from the sidebar).
          if (preserveSelectedUnreadRef.current) {
            return { ...channel, unreadCount: Math.max(fromProvider, 1) };
          }
          return { ...channel, unreadCount: 0 };
        }
        return { ...channel, unreadCount: fromProvider };
      }),
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
            insertMessageChronologically(current, typedMessage),
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
        setMessages((current) =>
          insertMessageChronologically(current, typedMessage),
        );
      }

      setChannels((current) =>
        current.map((channel) =>
          channel.id === channelId
            ? {
                ...channel,
                latestMessage: {
                  body: typedMessage.body,
                  createdAt: typedMessage.createdAt,
                  senderName: typedMessage.sender.fullName,
                },
              }
            : channel,
        ),
      );
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
          user?: {
            id: string;
            fullName: string;
            avatarUpdatedAt?: string | null;
          };
        };
        const added = event === 'reaction.added';
        const names = memberNamesRef.current;
        setMessages((current) =>
          applyReactionToggle(
            current,
            payload.messageId,
            payload.emoji,
            payload.userId,
            added,
            user.id,
            payload.user,
            names,
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
            payload.user,
            names,
          ),
        );
      }

      if (event === 'annotation.created') {
        const payload = data as {
          fileId?: string;
          annotation?: { fileId?: string };
        };
        const fileId = payload.fileId ?? payload.annotation?.fileId;
        if (!fileId) return;

        const bumpCount = (messages: ChatMessage[]) =>
          messages.map((message) => ({
            ...message,
            attachments: message.attachments?.map((attachment) => {
              if (attachment.file?.id !== fileId) return attachment;
              return {
                ...attachment,
                file: {
                  ...attachment.file,
                  annotationCount: (attachment.file.annotationCount ?? 0) + 1,
                },
              };
            }),
          }));

        setMessages((current) => bumpCount(current));
        setThreadReplies((current) => bumpCount(current));
      }

      if (event === 'message.pinned' || event === 'message.unpinned') {
        const channelId = selectedChannelIdRef.current;
        if (channelId) {
          void loadPinnedMessages(channelId);
        }
      }
    });
  }, [loadPinnedMessages, subscribeChannelEvents, user.id]);

  useEffect(() => {
    return subscribePresenceUpdated((payload) => {
      setChannels((current) =>
        current.map((channel) => {
          if (!channel.dmPeer || channel.dmPeer.id !== payload.userId) {
            return channel;
          }
          return {
            ...channel,
            dmPeer: applyPresenceUpdate(channel.dmPeer, payload),
          };
        }),
      );
      setChannelMembers((current) =>
        current.map((member) =>
          member.id === payload.userId
            ? applyPresenceUpdate(member, payload)
            : member,
        ),
      );
    });
  }, [subscribePresenceUpdated]);

  useEffect(() => {
    if (!selectedChannelId || isLoadingChannels) return;

    const requestChannelId = selectedChannelId;
    // Opening/reading a channel clears intentional unread preservation.
    preserveSelectedUnreadRef.current = false;
    joinChannel(requestChannelId);
    setIsLoadingMessages(true);
    setActiveScrollKey(null);
    setRestoreOnKeyChange(null);
    setHasMoreMessages(false);
    setIsLoadingOlderMessages(false);
    loadingOlderRef.current = false;
    currentScrollPositionRef.current = null;
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
    const anchorId = initialMessageIdRef.current;

    async function loadInitialMessages(): Promise<ChannelMessagesPage> {
      let page = normalizeChannelMessagesPage(
        (
          await apiRequest<ApiResponse<ChannelMessagesPage | ChatMessage[]>>(
            `/channels/${requestChannelId}/messages?limit=50`,
          )
        ).data,
      );

      // Deep-link: keep fetching older pages until the target message is present.
      while (
        anchorId &&
        page.hasMore &&
        !page.items.some((message) => message.id === anchorId)
      ) {
        const oldest = page.items[0];
        if (!oldest) break;
        const older = normalizeChannelMessagesPage(
          (
            await apiRequest<ApiResponse<ChannelMessagesPage | ChatMessage[]>>(
              `/channels/${requestChannelId}/messages?limit=50&before=${oldest.id}`,
            )
          ).data,
        );
        if (older.items.length === 0) {
          page = { ...page, hasMore: false };
          break;
        }
        const merged = [...older.items];
        for (const message of page.items) {
          if (!merged.some((existing) => existing.id === message.id)) {
            merged.push(message);
          }
        }
        page = { items: merged, hasMore: older.hasMore };
      }

      return page;
    }

    Promise.all([
      loadInitialMessages(),
      apiRequest<ApiResponse<unknown>>(`/channels/${requestChannelId}/read`, {
        method: 'POST',
      }).catch(() => ({ success: true as const, data: null })),
      CHAT_HUDDLE_ENABLED
        ? apiRequest<ApiResponse<{ joinPath?: string } | null>>(
            `/channels/${requestChannelId}/huddles/active`,
          ).catch(() => ({ success: true, data: null }))
        : Promise.resolve({ success: true as const, data: null }),
    ])
      .then(([page, , huddleResponse]) => {
        if (cancelled || selectedChannelIdRef.current !== requestChannelId) {
          return;
        }
        setMessages(page.items);
        setHasMoreMessages(page.hasMore);
        const stored = scrollPositionsRef.current.get(requestChannelId);
        const followDeepLink = Boolean(anchorId);
        if (
          stored &&
          !followDeepLink &&
          stored.distanceFromBottom > 96
        ) {
          setRestoreOnKeyChange({
            mode: 'distanceFromBottom',
            distance: stored.distanceFromBottom,
          });
        } else {
          setRestoreOnKeyChange({ mode: 'bottom' });
        }
        setActiveScrollKey(requestChannelId);
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
      if (currentScrollPositionRef.current) {
        scrollPositionsRef.current.set(
          requestChannelId,
          currentScrollPositionRef.current,
        );
      }
      leaveChannel(requestChannelId);
    };
  }, [selectedChannelId, isLoadingChannels, joinChannel, leaveChannel]);

  const handleScrollPosition = useCallback(
    (state: {
      scrollTop: number;
      distanceFromBottom: number;
      nearBottom: boolean;
    }) => {
      currentScrollPositionRef.current = {
        scrollTop: state.scrollTop,
        distanceFromBottom: state.distanceFromBottom,
      };
      if (selectedChannelIdRef.current) {
        scrollPositionsRef.current.set(selectedChannelIdRef.current, {
          scrollTop: state.scrollTop,
          distanceFromBottom: state.distanceFromBottom,
        });
      }
    },
    [],
  );

  const handleLoadOlderMessages = useCallback(async () => {
    const channelId = selectedChannelIdRef.current;
    if (
      !channelId ||
      !hasMoreMessagesRef.current ||
      loadingOlderRef.current ||
      isLoadingMessages
    ) {
      return;
    }

    const oldest = messagesRef.current[0];
    if (!oldest) {
      return;
    }

    loadingOlderRef.current = true;
    setIsLoadingOlderMessages(true);
    // Virtuoso firstItemIndex keeps viewport stable on prepend — no scrollHeight delta.

    try {
      const response = await apiRequest<
        ApiResponse<ChannelMessagesPage | ChatMessage[]>
      >(
        `/channels/${channelId}/messages?limit=50&before=${oldest.id}`,
      );
      if (selectedChannelIdRef.current !== channelId) {
        return;
      }
      const page = normalizeChannelMessagesPage(response.data);
      setHasMoreMessages(page.hasMore);
      if (page.items.length === 0) {
        return;
      }
      setMessages((current) => {
        const merged = [...page.items];
        for (const message of current) {
          if (!merged.some((existing) => existing.id === message.id)) {
            merged.push(message);
          }
        }
        return merged;
      });
    } catch (error) {
      if (selectedChannelIdRef.current === channelId) {
        setErrorMessage(
          error instanceof Error
            ? error.message
            : 'Failed to load older messages',
        );
      }
    } finally {
      loadingOlderRef.current = false;
      if (selectedChannelIdRef.current === channelId) {
        setIsLoadingOlderMessages(false);
      }
    }
  }, [isLoadingMessages]);

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
    if (!selectedChannelId) {
      setPinnedMessages([]);
      return;
    }

    void loadPinnedMessages(selectedChannelId);
  }, [selectedChannelId, loadPinnedMessages]);

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
      setHasMoreThreadReplies(false);
      setIsLoadingOlderThreadReplies(false);
      loadingOlderThreadRef.current = false;
      return;
    }

    let cancelled = false;
    setIsLoadingThread(true);
    setHasMoreThreadReplies(false);
    loadingOlderThreadRef.current = false;

    apiRequest<ApiResponse<ChannelMessagesPage | ChatMessage[]>>(
      `/channels/${selectedChannelId}/messages/${threadMessageId}/replies?limit=50`,
    )
      .then((response) => {
        if (cancelled) return;
        const page = normalizeChannelMessagesPage(response.data);
        setThreadReplies(page.items);
        setHasMoreThreadReplies(page.hasMore);
      })
      .catch((error: Error) => {
        if (!cancelled) setErrorMessage(error.message);
      })
      .finally(() => {
        if (!cancelled) setIsLoadingThread(false);
      });

    return () => {
      cancelled = true;
    };
  }, [selectedChannelId, threadMessageId]);

  const handleLoadOlderThreadReplies = useCallback(async () => {
    const channelId = selectedChannelIdRef.current;
    const parentId = threadMessageIdRef.current;
    const oldest = threadRepliesRef.current[0];
    if (
      !channelId ||
      !parentId ||
      !oldest ||
      !hasMoreThreadReplies ||
      loadingOlderThreadRef.current ||
      isLoadingThread
    ) {
      return;
    }

    loadingOlderThreadRef.current = true;
    setIsLoadingOlderThreadReplies(true);
    const container = threadScrollContainerRef.current;
    const previousHeight = container?.scrollHeight ?? 0;
    try {
      const response = await apiRequest<
        ApiResponse<ChannelMessagesPage | ChatMessage[]>
      >(
        `/channels/${channelId}/messages/${parentId}/replies?limit=50&before=${oldest.id}`,
      );
      if (
        selectedChannelIdRef.current !== channelId ||
        threadMessageIdRef.current !== parentId
      ) {
        return;
      }
      const page = normalizeChannelMessagesPage(response.data);
      setHasMoreThreadReplies(page.hasMore);
      if (page.items.length === 0) return;
      setThreadReplies((current) =>
        prependOlderMessagePage(page.items, current),
      );
      requestAnimationFrame(() => {
        const scroller = threadScrollContainerRef.current;
        if (scroller && previousHeight > 0) {
          scroller.scrollTop += scroller.scrollHeight - previousHeight;
        }
      });
    } catch (error) {
      if (
        selectedChannelIdRef.current === channelId &&
        threadMessageIdRef.current === parentId
      ) {
        setErrorMessage(
          error instanceof Error
            ? error.message
            : 'Failed to load earlier replies',
        );
      }
    } finally {
      loadingOlderThreadRef.current = false;
      if (
        selectedChannelIdRef.current === channelId &&
        threadMessageIdRef.current === parentId
      ) {
        setIsLoadingOlderThreadReplies(false);
      }
    }
  }, [hasMoreThreadReplies, isLoadingThread]);

  // URL is the conversation layer: Back/popstate and deep links sync selection.
  useEffect(() => {
    setSelectedChannelId(initialChannelId ?? null);
    if (!initialChannelId) {
      conversationHistoryPushedRef.current = false;
      overlayHistoryPushedRef.current = false;
      setThreadMessageId(null);
      setDetailsOpen(false);
      return;
    }

    // Already stacked via in-list selectChannel push — do not insert another list frame.
    if (conversationHistoryPushedRef.current) {
      return;
    }

    // Cross-module / deep-link opens: insert Chat List under conversation on mobile.
    if (ensureMobileChatListUnderConversation()) {
      conversationHistoryPushedRef.current = true;
    } else if (historyHasChatConversationFrame()) {
      conversationHistoryPushedRef.current = true;
    }
  }, [initialChannelId]);

  useEffect(() => {
    if (!initialMessageId) return;
    setHighlightMessageId(initialMessageId);
    const timer = window.setTimeout(() => setHighlightMessageId(null), 3000);
    return () => window.clearTimeout(timer);
  }, [initialMessageId]);

  // Nested mobile layers (details / thread): dismiss on system Back first.
  useEffect(() => {
    if (!isMobileChatViewport()) {
      return;
    }

    const overlayOpen = detailsOpen || Boolean(threadMessageId);

    if (!overlayOpen) {
      if (overlayHistoryPushedRef.current) {
        overlayHistoryPushedRef.current = false;
        dismissSoftHistoryLayer('chatOverlay', CHAT_OVERLAY_HISTORY_TOKEN);
      }
      return;
    }

    if (overlayHistoryPushedRef.current) {
      return;
    }

    window.history.pushState(
      {
        ...(window.history.state ?? {}),
        chatOverlay: CHAT_OVERLAY_HISTORY_TOKEN,
      },
      '',
    );
    overlayHistoryPushedRef.current = true;

    function onPopState() {
      overlayHistoryPushedRef.current = false;
      setDetailsOpen(false);
      setThreadMessageId(null);
    }

    window.addEventListener('popstate', onPopState);
    return () => {
      window.removeEventListener('popstate', onPopState);
    };
  }, [detailsOpen, threadMessageId]);

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
      selectChannel(invite.channelId);
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
        insertMessageChronologically(currentMessages, response.data),
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

      setThreadReplies((current) =>
        insertMessageChronologically(current, response.data),
      );
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

  function handleDeleteRequest(messageId: string) {
    setDeleteDialogNowMs(Date.now());
    setPendingDeleteMessageId(messageId);
  }

  useEffect(() => {
    if (!pendingDeleteMessageId) return;
    setDeleteDialogNowMs(Date.now());
    const intervalId = window.setInterval(() => {
      setDeleteDialogNowMs(Date.now());
    }, 1000);
    return () => window.clearInterval(intervalId);
  }, [pendingDeleteMessageId]);

  async function handleDeleteForMe() {
    if (!selectedChannelId || !pendingDeleteMessageId) return;
    setIsDeletingMessage(true);
    setErrorMessage(null);
    try {
      await apiRequest(
        `/channels/${selectedChannelId}/messages/${pendingDeleteMessageId}/hide`,
        { method: 'POST' },
      );
      const messageId = pendingDeleteMessageId;
      setMessages((current) =>
        current.filter((message) => message.id !== messageId),
      );
      setThreadReplies((current) =>
        current.filter((message) => message.id !== messageId),
      );
      setPendingDeleteMessageId(null);
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : 'Unable to delete message',
      );
    } finally {
      setIsDeletingMessage(false);
    }
  }

  async function handleDeleteForEveryone() {
    if (!selectedChannelId || !pendingDeleteMessageId) return;
    setIsDeletingMessage(true);
    setErrorMessage(null);
    try {
      const response = await apiRequest<ApiResponse<ChatMessage>>(
        `/channels/${selectedChannelId}/messages/${pendingDeleteMessageId}`,
        { method: 'DELETE' },
      );
      setMessages((current) => updateMessageInList(current, response.data));
      setThreadReplies((current) =>
        updateMessageInList(current, response.data),
      );
      setPendingDeleteMessageId(null);
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : 'Unable to delete message',
      );
    } finally {
      setIsDeletingMessage(false);
    }
  }

  function handleClearChatHistory() {
    if (!selectedChannelId) return;
    setClearChatConfirmOpen(true);
  }

  async function confirmClearChatHistory() {
    if (!selectedChannelId) return;

    setIsClearingChat(true);
    setErrorMessage(null);
    try {
      await apiRequest(`/channels/${selectedChannelId}/clear-history`, {
        method: 'POST',
      });
      setMessages([]);
      setThreadReplies([]);
      setThreadMessageId(null);
      setClearChatConfirmOpen(false);
      void refreshUnread();
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : 'Unable to clear chat',
      );
    } finally {
      setIsClearingChat(false);
    }
  }

  function handleHideConversation(channelId?: string) {
    const targetId = channelId ?? selectedChannelId;
    if (!targetId) return;
    const channel = channels.find((row) => row.id === targetId);
    if (!channel || channel.type === 'public') return;
    setPendingHideChannelId(targetId);
  }

  async function confirmHideConversation() {
    const targetId = pendingHideChannelId;
    if (!targetId) return;

    setIsHidingConversation(true);
    setErrorMessage(null);
    try {
      await apiRequest(`/channels/${targetId}/hide`, {
        method: 'POST',
      });
      setChannels((current) =>
        current.filter((row) => row.id !== targetId),
      );
      if (selectedChannelId === targetId) {
        setMessages([]);
        setThreadReplies([]);
        clearConversation({ preferBack: false });
      }
      setPendingHideChannelId(null);
      void refreshUnread();
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : 'Unable to remove conversation',
      );
    } finally {
      setIsHidingConversation(false);
    }
  }

  async function handleMarkDmRead(channelId: string) {
    setErrorMessage(null);
    if (channelId === selectedChannelIdRef.current) {
      preserveSelectedUnreadRef.current = false;
    }
    try {
      await apiRequest(`/channels/${channelId}/read`, { method: 'POST' });
      setChannels((current) =>
        current.map((channel) =>
          channel.id === channelId
            ? { ...channel, unreadCount: 0, lastReadAt: new Date().toISOString() }
            : channel,
        ),
      );
      void refreshUnread();
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : 'Unable to mark as read',
      );
    }
  }

  async function handleMarkDmUnread(channelId: string) {
    setErrorMessage(null);
    if (channelId === selectedChannelIdRef.current) {
      preserveSelectedUnreadRef.current = true;
    }
    try {
      await apiRequest(`/channels/${channelId}/mark-unread`, {
        method: 'POST',
        body: JSON.stringify({}),
      });
      setChannels((current) =>
        current.map((channel) =>
          channel.id === channelId
            ? {
                ...channel,
                unreadCount: Math.max(channel.unreadCount ?? 0, 1),
              }
            : channel,
        ),
      );
      void refreshUnread();
    } catch (error) {
      if (channelId === selectedChannelIdRef.current) {
        preserveSelectedUnreadRef.current = false;
      }
      setErrorMessage(
        error instanceof Error ? error.message : 'Unable to mark as unread',
      );
    }
  }

  async function handlePin(messageId: string) {
    if (!selectedChannelId) return;

    await apiRequest(`/channels/${selectedChannelId}/pins/${messageId}`, {
      method: 'POST',
    });
    await loadPinnedMessages(selectedChannelId);
  }

  async function handleUnpin(messageId: string) {
    if (!selectedChannelId) return;

    await apiRequest(`/channels/${selectedChannelId}/pins/${messageId}`, {
      method: 'DELETE',
    });
    await loadPinnedMessages(selectedChannelId);
  }

  function handleJumpToPinnedMessage(messageId: string) {
    setHighlightMessageId(messageId);
    setThreadMessageId(null);
    setDetailsOpen(false);
    window.setTimeout(() => {
      setHighlightMessageId((current) =>
        current === messageId ? null : current,
      );
    }, 3000);
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
    void navigator.clipboard.writeText(formatMentionPlainText(body));
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
      selectChannel(data[data.length - 1].id);
    }
  }

  async function handleDirectMessageStarted(channel: ChatChannel) {
    setChannels((current) => appendUniqueById(current, channel));
    selectChannel(channel.id);
  }

  const selectedChannel = channels.find(
    (channel) => channel.id === selectedChannelId,
  );
  const canPinMessages = canCreateStaffChannel;
  const pinnedMessageIds = useMemo(
    () => new Set(pinnedMessages.map((pin) => pin.message.id)),
    [pinnedMessages],
  );
  const canManageMembers =
    (canCreateStaffChannel &&
      (selectedChannel?.type === 'private' ||
        selectedChannel?.type === 'group' ||
        selectedChannel?.type === 'client_shared')) ||
    (isExternalUser &&
      selectedChannel?.type === 'client_shared' &&
      viewerCanInviteClientTeammates);
  const canInvite = canManageMembers;
  const canDeleteGroup =
    isWorkspaceAdmin(user.roleCodes) &&
    Boolean(selectedChannel) &&
    (selectedChannel?.type === 'group' ||
      selectedChannel?.type === 'private' ||
      selectedChannel?.type === 'client_shared' ||
      selectedChannel?.type === 'direct');

  function handleDeleteGroup() {
    if (!selectedChannelId || !canDeleteGroup) return;
    setDeleteChannelConfirmOpen(true);
  }

  async function confirmDeleteGroup() {
    if (!selectedChannelId || !canDeleteGroup) return;

    setIsDeletingGroup(true);
    setErrorMessage(null);
    try {
      await apiRequest(`/channels/${selectedChannelId}`, { method: 'DELETE' });
      setChannels((current) =>
        current.filter((channel) => channel.id !== selectedChannelId),
      );
      setMessages([]);
      setDeleteChannelConfirmOpen(false);
      clearConversation({ preferBack: false });
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : 'Unable to delete channel',
      );
    } finally {
      setIsDeletingGroup(false);
    }
  }
  const canDeleteForEveryone = isWorkspaceAdmin(user.roleCodes);
  const pendingDeleteMessage = pendingDeleteMessageId
    ? messages.find((message) => message.id === pendingDeleteMessageId) ??
      threadReplies.find((message) => message.id === pendingDeleteMessageId) ??
      null
    : null;
  const pendingDeleteAllowsEveryone = Boolean(
    pendingDeleteMessage &&
      canDeleteMessageForEveryone(pendingDeleteMessage, {
        currentUserId: user.id,
        isWorkspaceAdmin: canDeleteForEveryone,
        nowMs: deleteDialogNowMs,
      }),
  );
  const canHideConversation =
    Boolean(selectedChannel) &&
    selectedChannel?.type !== 'public' &&
    selectedChannel?.type !== undefined;
  const pendingHideChannel = pendingHideChannelId
    ? channels.find((channel) => channel.id === pendingHideChannelId) ?? null
    : null;
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
        ref={(node) => {
          chatPaneRef.current = node;
        }}
        className={cn(
          'grid h-full min-h-0 grid-cols-1 gap-0 overflow-hidden',
          showDesktopSidebar && (detailsOpen || threadMessageId)
            ? 'lg:grid-cols-[15.5rem_minmax(0,1fr)_17.5rem] xl:grid-cols-[17rem_minmax(0,1fr)_19rem]'
            : showDesktopSidebar
              ? 'lg:grid-cols-[15.5rem_minmax(0,1fr)] xl:grid-cols-[17rem_minmax(0,1fr)]'
              : detailsOpen || threadMessageId
                ? 'lg:grid-cols-[minmax(0,1fr)_17.5rem] xl:grid-cols-[minmax(0,1fr)_19rem]'
                : 'lg:grid-cols-[minmax(0,1fr)]',
        )}
      >
        <ChannelSidebar
          channels={channels}
          selectedChannelId={selectedChannelId}
          pendingInvites={pendingInvites}
          acceptingInviteId={acceptingInviteId}
          canCreateChannel={canCreateChannel}
          canAddConnection={canAddConnection}
          showInternalSections
          internalEmptyText={
            isExternalUser
              ? 'Your organization channels appear here.'
              : 'No internal connections yet.'
          }
          onSelectChannel={selectChannel}
          onCreateChannel={openCreateChannel}
          onAddConnection={() => setAddConnectionOpen(true)}
          onStartDirectMessage={() => setStartDmOpen(true)}
          onAcceptInvite={(invite) => void handleAcceptInvite(invite)}
          onHideDm={(channelId) => void handleHideConversation(channelId)}
          onMarkDmRead={(channelId) => void handleMarkDmRead(channelId)}
          onMarkDmUnread={(channelId) => void handleMarkDmUnread(channelId)}
          className={cn(
            'order-1 h-full min-h-0 w-full lg:col-start-1',
            showMobileChat ? 'hidden' : 'flex',
            showDesktopSidebar ? 'lg:flex' : 'lg:hidden',
          )}
        />

        <Card
          padding="none"
          className={cn(
            'order-2 flex min-h-0 min-w-0 flex-col overflow-hidden rounded-none shadow-none transition-none hover:shadow-none',
            !showMobileChat ? 'hidden lg:flex' : 'flex',
            showDesktopSidebar ? 'lg:col-start-2' : 'lg:col-start-1',
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
            dmPeer={selectedChannel?.dmPeer}
            members={channelMembers}
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
              if (detailsOpen || threadMessageId) {
                if (
                  !dismissSoftHistoryLayer(
                    'chatOverlay',
                    CHAT_OVERLAY_HISTORY_TOKEN,
                  )
                ) {
                  setDetailsOpen(false);
                  setThreadMessageId(null);
                }
                return;
              }
              clearConversation();
            }}
          />

          {selectedChannelId ? (
            <MessageList
              messages={messages}
              channelId={selectedChannelId}
              channelType={selectedChannel?.type}
              currentUserId={user.id}
              unreadSince={unreadSince}
              canManageChannel={canPinMessages}
              canDeleteForEveryone={canDeleteForEveryone}
              pinnedMessageIds={pinnedMessageIds}
              memberNames={memberNames}
              isLoading={isLoadingMessages}
              activeThreadMessageId={threadMessageId}
              highlightMessageId={highlightMessageId}
              scrollKey={activeScrollKey}
              restoreOnKeyChange={restoreOnKeyChange}
              onScrollPosition={handleScrollPosition}
              onReachTop={() => {
                void handleLoadOlderMessages();
              }}
              hasMoreMessages={hasMoreMessages}
              isLoadingOlderMessages={isLoadingOlderMessages}
              onReply={handleOpenThread}
              onReact={handleReact}
              onEdit={handleEdit}
              onDelete={handleDeleteRequest}
              onPin={handlePin}
              onUnpin={handleUnpin}
              onCopyMessage={handleCopyMessage}
              onCopyLink={handleCopyLink}
              onMarkUnread={handleMarkUnread}
            />
          ) : null}

          <div className="chat-inset safe-pb sticky bottom-0 z-10 shrink-0 border-t border-[var(--border)] bg-[var(--surface)]">
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
        </Card>

        {detailsOpen && selectedChannelId ? (
          <ChannelDetailsPanel
            channelId={selectedChannelId}
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
            canPin={canPinMessages}
            onUnpin={handleUnpin}
            canDeleteGroup={canDeleteGroup}
            onDeleteGroup={handleDeleteGroup}
            isDeletingGroup={isDeletingGroup}
            onClearChat={handleClearChatHistory}
            isClearingChat={isClearingChat}
            canHideConversation={canHideConversation}
            onHideConversation={() => void handleHideConversation()}
            onJumpToPin={handleJumpToPinnedMessage}
            onClose={() => setDetailsOpen(false)}
            className={cn(
              'order-3',
              showDesktopSidebar ? 'lg:col-start-3' : 'lg:col-start-2',
            )}
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
            canManageChannel={canPinMessages}
            canDeleteForEveryone={canDeleteForEveryone}
            pinnedMessageIds={pinnedMessageIds}
            isLoading={isLoadingThread}
            isLoadingOlderReplies={isLoadingOlderThreadReplies}
            hasMoreReplies={hasMoreThreadReplies}
            isSending={isSendingThreadReply}
            onClose={() => setThreadMessageId(null)}
            onLoadOlderReplies={() => {
              void handleLoadOlderThreadReplies();
            }}
            scrollContainerRef={threadScrollContainerRef}
            onSubmitReply={handleSendThreadReply}
            onReact={handleReact}
            onEdit={handleEdit}
            onDelete={handleDeleteRequest}
            onPin={handlePin}
            onUnpin={handleUnpin}
            onCopyMessage={handleCopyMessage}
            onCopyLink={handleCopyLink}
            onMarkUnread={handleMarkUnread}
            className={cn(
              'order-3',
              showDesktopSidebar ? 'lg:col-start-3' : 'lg:col-start-2',
            )}
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
        audience={isExternalUser ? 'client' : 'staff'}
      />
      <StartDirectMessageModal
        open={startDmOpen}
        onClose={() => setStartDmOpen(false)}
        onStarted={handleDirectMessageStarted}
        isExternalUser={isExternalUser}
      />
      <AddConnectionModal
        open={addConnectionOpen}
        onClose={() => setAddConnectionOpen(false)}
        onStarted={handleDirectMessageStarted}
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
      <DeleteMessageDialog
        open={Boolean(pendingDeleteMessageId)}
        canDeleteForEveryone={pendingDeleteAllowsEveryone}
        busy={isDeletingMessage}
        onDeleteForMe={() => void handleDeleteForMe()}
        onDeleteForEveryone={() => void handleDeleteForEveryone()}
        onCancel={() => setPendingDeleteMessageId(null)}
      />
      <DeleteConversationDialog
        open={Boolean(pendingHideChannel)}
        conversationName={
          pendingHideChannel ? getChannelLabel(pendingHideChannel) : ''
        }
        isDirect={pendingHideChannel?.type === 'direct'}
        busy={isHidingConversation}
        onConfirm={() => void confirmHideConversation()}
        onCancel={() => setPendingHideChannelId(null)}
      />
      <ClearChatDialog
        open={clearChatConfirmOpen}
        conversationName={
          selectedChannel ? getChannelLabel(selectedChannel) : 'this chat'
        }
        busy={isClearingChat}
        onConfirm={() => void confirmClearChatHistory()}
        onCancel={() => setClearChatConfirmOpen(false)}
      />
      <DeleteChannelDialog
        open={deleteChannelConfirmOpen}
        channelName={
          selectedChannel ? getChannelLabel(selectedChannel) : 'this channel'
        }
        busy={isDeletingGroup}
        onConfirm={() => void confirmDeleteGroup()}
        onCancel={() => setDeleteChannelConfirmOpen(false)}
      />
    </>
  );
}
