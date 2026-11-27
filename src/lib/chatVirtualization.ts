/** Helpers for Virtuoso chat windowing (prepend-safe indexes). */

export const CHAT_VIRTUOSO_START_INDEX = 1_000_000;

/**
 * When older messages are prepended, Virtuoso needs `firstItemIndex` reduced by
 * the number of newly inserted items so the visible viewport stays put.
 */
export function nextFirstItemIndexAfterPrepend(
  currentFirstItemIndex: number,
  previousLength: number,
  nextLength: number,
  previousFirstId: string | null | undefined,
  nextFirstId: string | null | undefined,
): number {
  if (
    !previousFirstId ||
    !nextFirstId ||
    previousFirstId === nextFirstId ||
    nextLength <= previousLength
  ) {
    return currentFirstItemIndex;
  }
  return currentFirstItemIndex - (nextLength - previousLength);
}

/**
 * When oldest messages are dropped from the front (page-window retention),
 * increase `firstItemIndex` by the removed count so absolute indexes of
 * remaining rows stay aligned with the viewport.
 */
export function nextFirstItemIndexAfterFrontEvict(
  currentFirstItemIndex: number,
  removedCount: number,
): number {
  if (removedCount <= 0) {
    return currentFirstItemIndex;
  }
  return currentFirstItemIndex + removedCount;
}

/**
 * Detect a contiguous front shrink (head id changed and length fell) and return
 * the next firstItemIndex. Mid-list deletes (same head) do not shift.
 */
export function nextFirstItemIndexAfterMessagesChange(
  currentFirstItemIndex: number,
  previousLength: number,
  nextLength: number,
  previousFirstId: string | null | undefined,
  nextFirstId: string | null | undefined,
): number {
  if (nextLength > previousLength) {
    return nextFirstItemIndexAfterPrepend(
      currentFirstItemIndex,
      previousLength,
      nextLength,
      previousFirstId,
      nextFirstId,
    );
  }

  if (
    nextLength < previousLength &&
    previousFirstId &&
    nextFirstId &&
    previousFirstId !== nextFirstId
  ) {
    return nextFirstItemIndexAfterFrontEvict(
      currentFirstItemIndex,
      previousLength - nextLength,
    );
  }

  return currentFirstItemIndex;
}
