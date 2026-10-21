export interface NotificationRecord {
  id: string;
  type: string;
  title: string;
  body: string;
  linkUrl?: string | null;
  isRead: boolean;
  createdAt: string;
}

export const NOTIFICATION_PREVIEW_LIMIT = 10;

export function formatNotificationRelativeTime(value: string) {
  const date = new Date(value);
  const diffMs = Date.now() - date.getTime();
  const diffMinutes = Math.floor(diffMs / 60000);

  if (diffMinutes < 1) return 'Just now';
  if (diffMinutes < 60) return `${diffMinutes}m ago`;

  const diffHours = Math.floor(diffMinutes / 60);
  if (diffHours < 24) return `${diffHours}h ago`;

  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
  }).format(date);
}

export function getNotificationIconType(type: string) {
  if (type.startsWith('message.')) return 'mention';
  if (type === 'channel.invite') return 'invite';
  if (type.startsWith('invoice.')) return 'invoice';
  if (type.startsWith('task.')) return 'task';
  return 'default';
}

/** Hide internal DM channel ids from notification titles. */
export function formatNotificationTitle(notification: NotificationRecord) {
  const title = notification.title;
  const looksLikeDmId =
    /(?:^|\s)dm-[0-9a-f-]{20,}/i.test(title) ||
    /New message in dm-/i.test(title);

  if (!looksLikeDmId) {
    return title;
  }

  const senderFromBody = notification.body.split(':')[0]?.trim();
  if (senderFromBody) {
    if (/mentioned you/i.test(title)) {
      return title.replace(/\s+in\s+#?dm-[^\s]+/i, '');
    }
    return `New message from ${senderFromBody}`;
  }

  return 'New message';
}
