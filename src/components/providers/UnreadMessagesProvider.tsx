'use client';

import {
  ReactNode,
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { apiRequest } from '@/lib/api-client';
import { ApiResponse } from '@/lib/auth';
import {
  MessageActivityPayload,
  useRealtime,
} from '@/components/providers/RealtimeProvider';

export interface UnreadPerson {
  id: string;
  fullName: string;
  jobTitle?: string | null;
  avatarUpdatedAt?: string | null;
  presenceStatus?: 'active' | 'away' | string;
  statusText?: string | null;
  statusEmoji?: string | null;
}

export interface UnreadConversation {
  channelId: string;
  name: string;
  type: string;
  unreadCount: number;
  dmPeer?: UnreadPerson | null;
  latestMessage: {
    id: string;
    body: string;
    createdAt: string;
    sender: UnreadPerson;
  } | null;
}

interface UnreadSummary {
  total: number;
  conversations: UnreadConversation[];
}

interface UnreadMessagesContextValue {
  total: number;
  conversations: UnreadConversation[];
  unreadByChannel: Record<string, number>;
  loaded: boolean;
  isLoading: boolean;
  errorMessage: string | null;
  refreshUnread: () => Promise<void>;
  setActiveChannel: (channelId: string | null) => void;
}

const UnreadMessagesContext = createContext<UnreadMessagesContextValue | null>(
  null,
);

const SEEN_LIMIT = 500;

export function UnreadMessagesProvider({ children }: { children: ReactNode }) {
  const { subscribeMessageActivity, subscribeConnected } = useRealtime();
  const [conversations, setConversations] = useState<UnreadConversation[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const activeChannelRef = useRef<string | null>(null);
  const seenIdsRef = useRef<string[]>([]);
  const refreshTimerRef = useRef<number | null>(null);

  const applySummary = useCallback((summary: UnreadSummary) => {
    const activeChannelId = activeChannelRef.current;
    setConversations(
      summary.conversations.filter(
        (item) => item.channelId !== activeChannelId,
      ),
    );
  }, []);

  const refreshUnread = useCallback(async () => {
    try {
      const response = await apiRequest<ApiResponse<UnreadSummary>>(
        '/channels/unread',
      );
      applySummary(response.data);
      setErrorMessage(null);
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : 'Unable to load unread messages',
      );
    } finally {
      setLoaded(true);
      setIsLoading(false);
    }
  }, [applySummary]);

  const scheduleRefresh = useCallback(() => {
    if (refreshTimerRef.current != null) {
      window.clearTimeout(refreshTimerRef.current);
    }
    refreshTimerRef.current = window.setTimeout(() => {
      refreshTimerRef.current = null;
      void refreshUnread();
    }, 400);
  }, [refreshUnread]);

  const setActiveChannel = useCallback((channelId: string | null) => {
    activeChannelRef.current = channelId;
    if (!channelId) {
      return;
    }
    setConversations((current) =>
      current.filter((item) => item.channelId !== channelId),
    );
  }, []);

  useEffect(() => {
    void refreshUnread();
    const interval = window.setInterval(() => {
      if (document.visibilityState === 'visible') {
        void refreshUnread();
      }
    }, 30000);

    function handleVisibility() {
      if (document.visibilityState === 'visible') {
        void refreshUnread();
      }
    }

    document.addEventListener('visibilitychange', handleVisibility);
    return () => {
      window.clearInterval(interval);
      document.removeEventListener('visibilitychange', handleVisibility);
      if (refreshTimerRef.current != null) {
        window.clearTimeout(refreshTimerRef.current);
      }
    };
  }, [refreshUnread]);

  useEffect(() => {
    return subscribeConnected(() => {
      void refreshUnread();
    });
  }, [subscribeConnected, refreshUnread]);

  useEffect(() => {
    return subscribeMessageActivity((payload: MessageActivityPayload) => {
      if (!payload.countsAsUnread || !payload.messageId) {
        return;
      }
      if (seenIdsRef.current.includes(payload.messageId)) {
        return;
      }
      seenIdsRef.current = [...seenIdsRef.current, payload.messageId].slice(
        -SEEN_LIMIT,
      );

      if (payload.channelId === activeChannelRef.current) {
        void apiRequest(`/channels/${payload.channelId}/read`, {
          method: 'POST',
        }).catch(() => undefined);
        return;
      }

      setConversations((current) => {
        const existing = current.find(
          (item) => item.channelId === payload.channelId,
        );
        const latestMessage = {
          id: payload.messageId,
          body: payload.preview,
          createdAt: payload.createdAt,
          sender: {
            id: payload.sender.id,
            fullName: payload.sender.fullName,
            avatarUpdatedAt: payload.sender.avatarUpdatedAt,
            jobTitle: null,
            presenceStatus: 'active' as const,
            statusText: null,
            statusEmoji: null,
          },
        };
        const next = existing
          ? current.map((item) =>
              item.channelId === payload.channelId
                ? {
                    ...item,
                    unreadCount: item.unreadCount + 1,
                    latestMessage,
                  }
                : item,
            )
          : [
              {
                channelId: payload.channelId,
                name: payload.channelName,
                type: payload.channelType,
                unreadCount: 1,
                dmPeer: null,
                latestMessage,
              },
              ...current,
            ];
        return [...next].sort((left, right) => {
          const leftTime = left.latestMessage?.createdAt ?? '';
          const rightTime = right.latestMessage?.createdAt ?? '';
          return rightTime.localeCompare(leftTime);
        });
      });
      scheduleRefresh();
    });
  }, [subscribeMessageActivity, scheduleRefresh]);

  const total = useMemo(
    () => conversations.reduce((sum, item) => sum + item.unreadCount, 0),
    [conversations],
  );
  const unreadByChannel = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const item of conversations) {
      counts[item.channelId] = item.unreadCount;
    }
    return counts;
  }, [conversations]);

  return (
    <UnreadMessagesContext.Provider
      value={{
        total,
        conversations,
        unreadByChannel,
        loaded,
        isLoading,
        errorMessage,
        refreshUnread,
        setActiveChannel,
      }}
    >
      {children}
    </UnreadMessagesContext.Provider>
  );
}

export function useUnreadMessages() {
  const context = useContext(UnreadMessagesContext);
  if (!context) {
    throw new Error('useUnreadMessages must be used within UnreadMessagesProvider');
  }
  return context;
}
