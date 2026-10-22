export function getBrowserTimeZone(): string {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
  } catch {
    return 'UTC';
  }
}

export function resolveViewerTimeZone(preferred?: string | null): string {
  const candidate = preferred?.trim();
  if (candidate) {
    try {
      Intl.DateTimeFormat(undefined, { timeZone: candidate });
      return candidate;
    } catch {
      // fall through to browser
    }
  }
  return getBrowserTimeZone();
}

function zonedDateParts(
  date: Date,
  timeZone: string,
): { year: number; month: number; day: number } {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(date);

  const year = Number(parts.find((part) => part.type === 'year')?.value);
  const month = Number(parts.find((part) => part.type === 'month')?.value);
  const day = Number(parts.find((part) => part.type === 'day')?.value);

  return { year, month, day };
}

function isSameZonedDay(a: Date, b: Date, timeZone: string): boolean {
  const left = zonedDateParts(a, timeZone);
  const right = zonedDateParts(b, timeZone);
  return (
    left.year === right.year &&
    left.month === right.month &&
    left.day === right.day
  );
}

function addDaysUtc(date: Date, days: number): Date {
  return new Date(date.getTime() + days * 24 * 60 * 60 * 1000);
}

/**
 * Find a UTC instant that falls on "yesterday" in `timeZone` relative to `now`.
 * Walks back by 24h until the zoned calendar day differs from today.
 */
function yesterdayReference(now: Date, timeZone: string): Date {
  const today = zonedDateParts(now, timeZone);
  for (let offset = 1; offset <= 2; offset += 1) {
    const candidate = addDaysUtc(now, -offset);
    const parts = zonedDateParts(candidate, timeZone);
    if (
      parts.year !== today.year ||
      parts.month !== today.month ||
      parts.day !== today.day
    ) {
      return candidate;
    }
  }
  return addDaysUtc(now, -1);
}

export function formatMessageTime(
  dateStr: string,
  timeZone?: string | null,
): string {
  const zone = resolveViewerTimeZone(timeZone);
  return new Date(dateStr).toLocaleTimeString([], {
    hour: 'numeric',
    minute: '2-digit',
    timeZone: zone,
  });
}

export function formatDateSeparatorLabel(
  dateStr: string,
  timeZone?: string | null,
): string {
  const zone = resolveViewerTimeZone(timeZone);
  const date = new Date(dateStr);
  const today = new Date();
  const yesterday = yesterdayReference(today, zone);

  if (isSameZonedDay(date, today, zone)) return 'Today';
  if (isSameZonedDay(date, yesterday, zone)) return 'Yesterday';

  return date.toLocaleDateString([], {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    timeZone: zone,
  });
}

export function getDateKey(dateStr: string, timeZone?: string | null): string {
  const zone = resolveViewerTimeZone(timeZone);
  const { year, month, day } = zonedDateParts(new Date(dateStr), zone);
  return `${year}-${month}-${day}`;
}

export type MessageListEntry<T> =
  | { type: 'separator'; key: string; label: string }
  | { type: 'message'; key: string; message: T };

export function groupMessagesByDate<T extends { id: string; createdAt: string }>(
  messages: T[],
  timeZone?: string | null,
): MessageListEntry<T>[] {
  const entries: MessageListEntry<T>[] = [];
  let lastDateKey: string | null = null;

  for (const message of messages) {
    const dateKey = getDateKey(message.createdAt, timeZone);

    if (dateKey !== lastDateKey) {
      entries.push({
        type: 'separator',
        key: `sep-${dateKey}`,
        label: formatDateSeparatorLabel(message.createdAt, timeZone),
      });
      lastDateKey = dateKey;
    }

    entries.push({ type: 'message', key: message.id, message });
  }

  return entries;
}
