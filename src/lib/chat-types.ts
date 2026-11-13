import { MessageAttachment } from '@/components/chat/ChatMessageBody';

export interface ChatDmPeer {
  id: string;
  fullName: string;
  jobTitle?: string | null;
  avatarUpdatedAt?: string | null;
  presenceStatus?: 'active' | 'away';
  statusText?: string | null;
  statusEmoji?: string | null;
}

export interface ChatChannel {
  id: string;
  name: string;
  type: string;
  displayName?: string;
  dmPeerUserId?: string | null;
  dmPeer?: ChatDmPeer | null;
  clientOrganizationId?: string | null;
  clientOrganizationName?: string | null;
  clientOrganizationLogoUpdatedAt?: string | null;
  orderId?: string | null;
  unreadCount?: number;
  lastReadAt?: string | null;
  viewerCanInviteClientTeammates?: boolean;
  latestMessage?: {
    body: string;
    createdAt: string;
    senderName: string;
  } | null;
}

export function getChannelLabel(channel: Pick<ChatChannel, 'name' | 'type' | 'displayName'>) {
  if (
    channel.type === 'direct' ||
    channel.type === 'group' ||
    channel.type === 'client_shared'
  ) {
    return channel.displayName ?? channel.name;
  }

  return channel.name;
}

export function isDirectOrGroupChannel(type: string) {
  return type === 'direct' || type === 'group';
}

export interface MessageUser {
  id: string;
  fullName: string;
  email: string;
  avatarUpdatedAt?: string | null;
}

export interface MessageReactionUser {
  id: string;
  fullName: string;
  avatarUpdatedAt?: string | null;
}

export interface MessageReactionSummary {
  emoji: string;
  count: number;
  userIds: string[];
  /** Present on newer API responses; used for who-reacted UI. */
  users?: MessageReactionUser[];
  reactedByMe: boolean;
}

export interface ChatMessage {
  id: string;
  body: string;
  createdAt: string;
  sender: MessageUser;
  replyCount?: number;
  parentMessageId?: string | null;
  isThreadReply?: boolean;
  isEdited?: boolean;
  deletedAt?: string | null;
  attachments?: MessageAttachment[];
  reactions?: MessageReactionSummary[];
}

export interface PendingChannelInvite {
  id: string;
  channelId: string;
  channel: {
    id: string;
    name: string;
    project?: {
      name: string;
      clientOrganization?: { name: string } | null;
    } | null;
  };
}

export interface ChannelContext {
  clientOrganizationName?: string;
  projectName?: string;
}

export function appendUniqueById<T extends { id: string }>(
  items: T[],
  item: T,
): T[] {
  if (items.some((existing) => existing.id === item.id)) {
    return items;
  }

  return [...items, item];
}

/** Insert (or no-op if id exists) keeping createdAt ascending order. */
export function insertMessageChronologically<
  T extends { id: string; createdAt: string },
>(items: T[], item: T): T[] {
  if (items.some((existing) => existing.id === item.id)) {
    return items;
  }

  const itemTime = new Date(item.createdAt).getTime();
  const next = [...items];
  let insertAt = next.length;

  for (let index = next.length - 1; index >= 0; index -= 1) {
    const existingTime = new Date(next[index].createdAt).getTime();
    if (
      existingTime < itemTime ||
      (existingTime === itemTime && next[index].id < item.id)
    ) {
      insertAt = index + 1;
      break;
    }
    if (index === 0) {
      insertAt = 0;
    }
  }

  next.splice(insertAt, 0, item);
  return next;
}
