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
