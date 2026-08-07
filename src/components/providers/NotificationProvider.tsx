'use client';

import {
  ReactNode,
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from 'react';
import { apiRequest } from '@/lib/api-client';
import { ApiResponse } from '@/lib/auth';
import {
  NOTIFICATION_PREVIEW_LIMIT,
  NotificationRecord,
} from '@/lib/notifications';
import { useRealtime } from '@/components/providers/RealtimeProvider';

interface NotificationContextValue {
  notifications: NotificationRecord[];
  unreadCount: number;
  isLoading: boolean;
  errorMessage: string | null;
  refreshNotifications: () => Promise<void>;
  markRead: (notificationId: string) => Promise<void>;
  markAllRead: () => Promise<void>;
}

const NotificationContext = createContext<NotificationContextValue | null>(null);

export function NotificationProvider({ children }: { children: ReactNode }) {
  const { subscribeNotificationCreated } = useRealtime();
  const [notifications, setNotifications] = useState<NotificationRecord[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const loadUnreadCount = useCallback(async () => {
    try {
      const response = await apiRequest<ApiResponse<{ count: number }>>(
        '/notifications/unread-count',
      );
      setUnreadCount(response.data.count);
    } catch {
      // Keep last known count on transient failures.
    }
  }, []);

  const refreshNotifications = useCallback(async () => {
    setIsLoading(true);
    setErrorMessage(null);

    try {
      const [listResponse] = await Promise.all([
        apiRequest<ApiResponse<{ items: NotificationRecord[] }>>(
          '/notifications?pageSize=50',
        ),
        loadUnreadCount(),
      ]);
      setNotifications(listResponse.data.items);
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : 'Unable to load notifications',
      );
    } finally {
      setIsLoading(false);
    }
  }, [loadUnreadCount]);

  const markRead = useCallback(
    async (notificationId: string) => {
      await apiRequest(`/notifications/${notificationId}/read`, {
        method: 'POST',
      });

      setNotifications((current) =>
        current.map((notification) =>
          notification.id === notificationId
            ? { ...notification, isRead: true }
            : notification,
        ),
      );
      setUnreadCount((current) => Math.max(0, current - 1));
      await loadUnreadCount();
    },
    [loadUnreadCount],
  );

  const markAllRead = useCallback(async () => {
    await apiRequest('/notifications/read-all', { method: 'POST' });
    setNotifications((current) =>
      current.map((notification) => ({ ...notification, isRead: true })),
    );
    setUnreadCount(0);
    await loadUnreadCount();
  }, [loadUnreadCount]);

  useEffect(() => {
    void refreshNotifications();

    const interval = window.setInterval(() => {
      if (document.visibilityState === 'visible') {
        void loadUnreadCount();
      }
    }, 60000);

    function handleVisibilityChange() {
      if (document.visibilityState === 'visible') {
        void loadUnreadCount();
      }
    }

    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      window.clearInterval(interval);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [refreshNotifications, loadUnreadCount]);

  useEffect(() => {
    return subscribeNotificationCreated((payload) => {
      const notification = payload as NotificationRecord;
      if (!notification?.id) {
        void loadUnreadCount();
        return;
      }

      setNotifications((current) => {
        const withoutDuplicate = current.filter(
          (item) => item.id !== notification.id,
        );
        return [notification, ...withoutDuplicate].slice(0, 50);
      });
      setUnreadCount((current) => current + 1);
      void loadUnreadCount();
    });
  }, [subscribeNotificationCreated, loadUnreadCount]);

  return (
    <NotificationContext.Provider
      value={{
        notifications,
        unreadCount,
        isLoading,
        errorMessage,
        refreshNotifications,
        markRead,
        markAllRead,
      }}
    >
      {children}
    </NotificationContext.Provider>
  );
}

export function useNotifications() {
  const context = useContext(NotificationContext);

  if (!context) {
    throw new Error('useNotifications must be used within NotificationProvider');
  }

  return context;
}

export function useNotificationPreview() {
  const { notifications, ...rest } = useNotifications();
  return {
    ...rest,
    previewNotifications: notifications.slice(0, NOTIFICATION_PREVIEW_LIMIT),
  };
}
