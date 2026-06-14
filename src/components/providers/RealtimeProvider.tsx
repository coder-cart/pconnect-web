'use client';

import {
  ReactNode,
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from 'react';
import { io, Socket } from 'socket.io-client';
import { AUTH_TOKEN_KEY, WS_BASE_URL } from '@/lib/config';

type ChannelEventHandler = (payload: {
  channelId: string;
  event: string;
  data: unknown;
}) => void;

interface RealtimeContextValue {
  socket: Socket | null;
  isConnected: boolean;
  joinChannel: (channelId: string) => void;
  leaveChannel: (channelId: string) => void;
  subscribeMessageCreated: (
    handler: (payload: { channelId: string; message: unknown }) => void,
  ) => () => void;
  subscribeChannelEvents: (handler: ChannelEventHandler) => () => void;
  subscribeNotificationCreated: (handler: (notification: unknown) => void) => () => void;
}

const CHANNEL_EVENTS = [
  'message.created',
  'message.updated',
  'message.deleted',
  'reaction.added',
  'reaction.removed',
  'message.pinned',
  'message.unpinned',
] as const;

const RealtimeContext = createContext<RealtimeContextValue | null>(null);

export function RealtimeProvider({ children }: { children: ReactNode }) {
  const socketRef = useRef<Socket | null>(null);
  const joinedChannelRef = useRef<string | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const messageHandlersRef = useRef<
    Set<(payload: { channelId: string; message: unknown }) => void>
  >(new Set());
  const channelHandlersRef = useRef<Set<ChannelEventHandler>>(new Set());
  const notificationHandlersRef = useRef<
    Set<(notification: unknown) => void>
  >(new Set());

  useEffect(() => {
    const token =
      typeof window !== 'undefined'
        ? window.localStorage.getItem(AUTH_TOKEN_KEY)
        : null;

    if (!token) {
      return;
    }

    const socket = io(`${WS_BASE_URL}/ws`, {
      auth: { token },
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionAttempts: 10,
    });

    socketRef.current = socket;

    socket.on('connect', () => {
      setIsConnected(true);
      if (joinedChannelRef.current) {
        socket.emit('joinChannel', joinedChannelRef.current);
      }
    });

    socket.on('disconnect', () => {
      setIsConnected(false);
    });

    socket.on('message.created', (payload: { channelId: string; message: unknown }) => {
      messageHandlersRef.current.forEach((handler) => handler(payload));
      channelHandlersRef.current.forEach((handler) =>
        handler({ channelId: payload.channelId, event: 'message.created', data: payload.message }),
      );
    });

    for (const eventName of CHANNEL_EVENTS) {
      if (eventName === 'message.created') continue;
      socket.on(eventName, (payload: { channelId: string; [key: string]: unknown }) => {
        channelHandlersRef.current.forEach((handler) =>
          handler({ channelId: payload.channelId, event: eventName, data: payload }),
        );
      });
    }

    socket.on('notification.created', (notification: unknown) => {
      notificationHandlersRef.current.forEach((handler) => handler(notification));
    });

    return () => {
      socket.disconnect();
      socketRef.current = null;
      setIsConnected(false);
    };
  }, []);

  const joinChannel = useCallback((channelId: string) => {
    joinedChannelRef.current = channelId;
    socketRef.current?.emit('joinChannel', channelId);
  }, []);

  const leaveChannel = useCallback((channelId: string) => {
    if (joinedChannelRef.current === channelId) {
      joinedChannelRef.current = null;
    }
    socketRef.current?.emit('leaveChannel', channelId);
  }, []);

  const subscribeMessageCreated = useCallback(
    (handler: (payload: { channelId: string; message: unknown }) => void) => {
      messageHandlersRef.current.add(handler);
      return () => {
        messageHandlersRef.current.delete(handler);
      };
    },
    [],
  );

  const subscribeChannelEvents = useCallback((handler: ChannelEventHandler) => {
    channelHandlersRef.current.add(handler);
    return () => {
      channelHandlersRef.current.delete(handler);
    };
  }, []);

  const subscribeNotificationCreated = useCallback(
    (handler: (notification: unknown) => void) => {
      notificationHandlersRef.current.add(handler);
      return () => {
        notificationHandlersRef.current.delete(handler);
      };
    },
    [],
  );

  return (
    <RealtimeContext.Provider
      value={{
        socket: socketRef.current,
        isConnected,
        joinChannel,
        leaveChannel,
        subscribeMessageCreated,
        subscribeChannelEvents,
        subscribeNotificationCreated,
      }}
    >
      {children}
    </RealtimeContext.Provider>
  );
}

export function useRealtime() {
  const context = useContext(RealtimeContext);

  if (!context) {
    throw new Error('useRealtime must be used within RealtimeProvider');
  }

  return context;
}
