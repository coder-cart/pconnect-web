import type { ChatMessage } from '@/lib/chat-types';

/** Own-message soft-delete for everyone is only allowed within this window. */
export const MESSAGE_DELETE_FOR_EVERYONE_WINDOW_MS = 5 * 60 * 1000;

export function isMessageWithinDeleteForEveryoneWindow(
  createdAt: string,
  nowMs: number = Date.now(),
): boolean {
  const createdMs = new Date(createdAt).getTime();
  if (Number.isNaN(createdMs)) return false;
  return nowMs - createdMs <= MESSAGE_DELETE_FOR_EVERYONE_WINDOW_MS;
}

/**
 * Whether Delete for Everyone is allowed for this message.
 * - Own messages: only within 5 minutes of original createdAt
 * - Other users' messages: workspace admins only (moderation, no time window)
 */
export function canDeleteMessageForEveryone(
  message: Pick<ChatMessage, 'createdAt' | 'deletedAt' | 'sender'>,
  options: {
    currentUserId: string;
    isWorkspaceAdmin: boolean;
    nowMs?: number;
  },
): boolean {
  if (message.deletedAt) return false;

  const isOwnMessage = message.sender.id === options.currentUserId;
  if (isOwnMessage) {
    return isMessageWithinDeleteForEveryoneWindow(
      message.createdAt,
      options.nowMs ?? Date.now(),
    );
  }

  return options.isWorkspaceAdmin;
}
