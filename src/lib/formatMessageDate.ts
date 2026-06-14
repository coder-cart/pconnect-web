function isSameDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

export function formatMessageTime(dateStr: string): string {
  return new Date(dateStr).toLocaleTimeString([], {
    hour: 'numeric',
    minute: '2-digit',
  });
}

export function formatDateSeparatorLabel(dateStr: string): string {
  const date = new Date(dateStr);
  const today = new Date();
  const yesterday = new Date();
  yesterday.setDate(today.getDate() - 1);

  if (isSameDay(date, today)) return 'Today';
  if (isSameDay(date, yesterday)) return 'Yesterday';

  return date.toLocaleDateString([], {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  });
}

export function getDateKey(dateStr: string): string {
  const date = new Date(dateStr);
  return `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`;
}

export type MessageListEntry<T> =
  | { type: 'separator'; key: string; label: string }
  | { type: 'message'; key: string; message: T };

export function groupMessagesByDate<T extends { id: string; createdAt: string }>(
  messages: T[],
): MessageListEntry<T>[] {
  const entries: MessageListEntry<T>[] = [];
  let lastDateKey: string | null = null;

  for (const message of messages) {
    const dateKey = getDateKey(message.createdAt);

    if (dateKey !== lastDateKey) {
      entries.push({
        type: 'separator',
        key: `sep-${dateKey}`,
        label: formatDateSeparatorLabel(message.createdAt),
      });
      lastDateKey = dateKey;
    }

    entries.push({ type: 'message', key: message.id, message });
  }

  return entries;
}
