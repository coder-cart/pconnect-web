/**
 * Channel page-window retention (Option C).
 *
 * Caps retained channel messages by dropping whole oldest pages when the user
 * is safely away from the retained head. Server remains source of truth —
 * eviction forces hasMore so scroll-up refetches via before=.
 */

export const CHANNEL_MESSAGE_PAGE_SIZE = 50;

/** Soft cap: 40 pages × 50 ≈ 2,000 messages. */
export const CHANNEL_MESSAGE_MAX_RETAINED =
  CHANNEL_MESSAGE_PAGE_SIZE * 40;

/** Keep at least this many messages above the visible start before eviction. */
export const CHANNEL_MESSAGE_HEAD_BUFFER =
  CHANNEL_MESSAGE_PAGE_SIZE * 2;

export interface MessageWindowRetentionInput<T extends { id: string }> {
  messages: T[];
  /** First visible (or overscanned) data index in the retained array. */
  startDataIndex: number;
  pageSize?: number;
  maxRetained?: number;
  headBufferMessages?: number;
  /** Never drop these ids (highlight, open thread parent, pending delete, etc.). */
  protectedIds?: Iterable<string | null | undefined>;
  /** When true, skip eviction (e.g. loading older / at top). */
  suspend?: boolean;
}

export interface MessageWindowRetentionResult<T extends { id: string }> {
  messages: T[];
  removedCount: number;
  /** True when oldest pages were dropped — caller should set hasMoreMessages. */
  hasMoreForced: boolean;
}

function alignDownToPage(count: number, pageSize: number): number {
  if (count <= 0 || pageSize <= 0) return 0;
  return Math.floor(count / pageSize) * pageSize;
}

function buildProtectedSet(
  protectedIds: Iterable<string | null | undefined> | undefined,
): Set<string> {
  const set = new Set<string>();
  if (!protectedIds) return set;
  for (const id of protectedIds) {
    if (typeof id === 'string' && id.length > 0) {
      set.add(id);
    }
  }
  return set;
}

/**
 * Drop oldest full pages when over the soft cap and the visible window is
 * far enough from the retained head. Returns the same array reference when
 * nothing is removed.
 */
export function retainChannelMessageWindow<T extends { id: string }>(
  input: MessageWindowRetentionInput<T>,
): MessageWindowRetentionResult<T> {
  const pageSize = input.pageSize ?? CHANNEL_MESSAGE_PAGE_SIZE;
  const maxRetained = input.maxRetained ?? CHANNEL_MESSAGE_MAX_RETAINED;
  const headBuffer =
    input.headBufferMessages ?? CHANNEL_MESSAGE_HEAD_BUFFER;
  const messages = input.messages;

  if (input.suspend || messages.length <= maxRetained) {
    return { messages, removedCount: 0, hasMoreForced: false };
  }

  const excess = messages.length - maxRetained;
  let removeCount = alignDownToPage(
    Math.ceil(excess / pageSize) * pageSize,
    pageSize,
  );
  if (removeCount <= 0) {
    return { messages, removedCount: 0, hasMoreForced: false };
  }

  const startDataIndex = Math.max(0, Math.floor(input.startDataIndex));
  // Leave headBuffer messages before the visible start untouched.
  const maxRemovableByViewport = alignDownToPage(
    Math.max(0, startDataIndex - headBuffer),
    pageSize,
  );
  removeCount = Math.min(removeCount, maxRemovableByViewport);
  if (removeCount <= 0) {
    return { messages, removedCount: 0, hasMoreForced: false };
  }

  const protectedSet = buildProtectedSet(input.protectedIds);
  if (protectedSet.size > 0) {
    for (let index = 0; index < removeCount; index += 1) {
      if (protectedSet.has(messages[index].id)) {
        removeCount = alignDownToPage(index, pageSize);
        break;
      }
    }
  }

  if (removeCount <= 0) {
    return { messages, removedCount: 0, hasMoreForced: false };
  }

  return {
    messages: messages.slice(removeCount),
    removedCount: removeCount,
    hasMoreForced: true,
  };
}
