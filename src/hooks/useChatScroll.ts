import { useCallback, useEffect, useRef, useState } from 'react';

const NEAR_BOTTOM_THRESHOLD = 96;

export type ChatScrollRestore =
  | { mode: 'bottom' }
  | { mode: 'offset'; scrollTop: number }
  | { mode: 'distanceFromBottom'; distance: number };

interface UseChatScrollOptions {
  anchorMessageId?: string | null;
  /** Applied once when scrollKey changes (after channel switch). */
  restoreOnKeyChange?: ChatScrollRestore | null;
  /** Called when user scrolls so callers can persist position. */
  onScrollPosition?: (state: {
    scrollTop: number;
    distanceFromBottom: number;
    nearBottom: boolean;
  }) => void;
  /** When true, ResizeObserver will not stick to bottom (e.g. prepending history). */
  suspendStickToBottom?: boolean;
}

export function useChatScroll(
  scrollKey?: string | null,
  options: UseChatScrollOptions = {},
) {
  const containerRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const [showJumpToLatest, setShowJumpToLatest] = useState(false);
  const isNearBottomRef = useRef(true);
  const suspendStickRef = useRef(Boolean(options.suspendStickToBottom));
  const lastAnchoredIdRef = useRef<string | null>(null);
  const restoreRef = useRef(options.restoreOnKeyChange ?? null);
  const onScrollPositionRef = useRef(options.onScrollPosition);
  const anchorMessageId = options.anchorMessageId ?? null;

  suspendStickRef.current = Boolean(options.suspendStickToBottom);
  restoreRef.current = options.restoreOnKeyChange ?? null;
  onScrollPositionRef.current = options.onScrollPosition;

  const scrollToBottom = useCallback((behavior: ScrollBehavior = 'auto') => {
    const container = containerRef.current;
    if (!container) {
      return;
    }

    container.scrollTo({
      top: container.scrollHeight,
      behavior,
    });
    isNearBottomRef.current = true;
    setShowJumpToLatest(false);
  }, []);

  const scrollToMessage = useCallback(
    (messageId: string, behavior: ScrollBehavior = 'auto') => {
      const container = containerRef.current;
      const element = document.getElementById(`message-${messageId}`);
      if (!container || !element) {
        return false;
      }

      const containerRect = container.getBoundingClientRect();
      const elementRect = element.getBoundingClientRect();
      const offset =
        elementRect.top -
        containerRect.top +
        container.scrollTop -
        container.clientHeight / 2 +
        elementRect.height / 2;

      container.scrollTo({
        top: Math.max(0, offset),
        behavior,
      });
      isNearBottomRef.current = false;
      setShowJumpToLatest(true);
      return true;
    },
    [],
  );

  const applyRestore = useCallback((restore: ChatScrollRestore) => {
    const container = containerRef.current;
    if (!container) {
      return;
    }
    if (restore.mode === 'bottom') {
      container.scrollTop = container.scrollHeight;
      isNearBottomRef.current = true;
      setShowJumpToLatest(false);
      return;
    }
    if (restore.mode === 'offset') {
      container.scrollTop = restore.scrollTop;
    } else {
      container.scrollTop = Math.max(
        0,
        container.scrollHeight - container.clientHeight - restore.distance,
      );
    }
    const distanceFromBottom =
      container.scrollHeight - container.scrollTop - container.clientHeight;
    const nearBottom = distanceFromBottom <= NEAR_BOTTOM_THRESHOLD;
    isNearBottomRef.current = nearBottom;
    setShowJumpToLatest(!nearBottom);
  }, []);

  const handleScroll = useCallback(() => {
    const container = containerRef.current;
    if (!container) {
      return;
    }

    const distanceFromBottom =
      container.scrollHeight - container.scrollTop - container.clientHeight;
    const nearBottom = distanceFromBottom <= NEAR_BOTTOM_THRESHOLD;
    isNearBottomRef.current = nearBottom;
    setShowJumpToLatest(!nearBottom);
    onScrollPositionRef.current?.({
      scrollTop: container.scrollTop,
      distanceFromBottom,
      nearBottom,
    });
  }, []);

  // Conversation / list identity change only — never re-run when highlight clears.
  useEffect(() => {
    lastAnchoredIdRef.current = null;
    const restore = restoreRef.current;
    if (restore && restore.mode !== 'bottom') {
      isNearBottomRef.current = false;
      requestAnimationFrame(() => {
        applyRestore(restore);
      });
      return;
    }

    isNearBottomRef.current = true;
    setShowJumpToLatest(false);
    requestAnimationFrame(() => {
      scrollToBottom('auto');
    });
  }, [scrollKey, applyRestore, scrollToBottom]);

  // One-shot anchor: only when a new anchor id appears; clearing does nothing.
  useEffect(() => {
    if (!anchorMessageId) {
      return;
    }
    if (lastAnchoredIdRef.current === anchorMessageId) {
      return;
    }

    let cancelled = false;
    const tryAnchor = () => {
      if (cancelled) {
        return true;
      }
      if (scrollToMessage(anchorMessageId, 'auto')) {
        lastAnchoredIdRef.current = anchorMessageId;
        return true;
      }
      return false;
    };

    requestAnimationFrame(() => {
      if (tryAnchor()) {
        return;
      }
    });

    const content = contentRef.current;
    if (!content) {
      return () => {
        cancelled = true;
      };
    }

    const observer = new MutationObserver(() => {
      if (tryAnchor()) {
        observer.disconnect();
      }
    });
    observer.observe(content, { childList: true, subtree: true });

    const timeoutId = window.setTimeout(() => {
      observer.disconnect();
      if (!cancelled && lastAnchoredIdRef.current !== anchorMessageId) {
        // Message never appeared — do not yank to bottom.
        cancelled = true;
      }
    }, 2500);

    return () => {
      cancelled = true;
      observer.disconnect();
      window.clearTimeout(timeoutId);
    };
  }, [anchorMessageId, scrollToMessage]);

  useEffect(() => {
    const content = contentRef.current;
    if (!content) {
      return;
    }

    const observer = new ResizeObserver(() => {
      if (suspendStickRef.current) {
        return;
      }
      if (isNearBottomRef.current) {
        scrollToBottom('auto');
      }
    });

    observer.observe(content);
    return () => observer.disconnect();
  }, [scrollToBottom]);

  return {
    containerRef,
    contentRef,
    showJumpToLatest,
    scrollToBottom,
    handleScroll,
    isNearBottomRef,
  };
}
