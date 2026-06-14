import { useCallback, useEffect, useRef, useState } from 'react';

const NEAR_BOTTOM_THRESHOLD = 96;

interface UseChatScrollOptions {
  anchorMessageId?: string | null;
}

export function useChatScroll(
  scrollKey?: string | null,
  options: UseChatScrollOptions = {},
) {
  const containerRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const [showJumpToLatest, setShowJumpToLatest] = useState(false);
  const isNearBottomRef = useRef(true);
  const anchorMessageId = options.anchorMessageId ?? null;

  const scrollToBottom = useCallback((behavior: ScrollBehavior = 'smooth') => {
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
    (messageId: string, behavior: ScrollBehavior = 'smooth') => {
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
  }, []);

  useEffect(() => {
    isNearBottomRef.current = true;
    setShowJumpToLatest(false);

    if (anchorMessageId) {
      let cancelled = false;

      const tryAnchor = () => {
        if (cancelled) {
          return true;
        }

        if (scrollToMessage(anchorMessageId, 'auto')) {
          return true;
        }

        return false;
      };

      requestAnimationFrame(() => {
        if (tryAnchor()) {
          return;
        }

        scrollToBottom('auto');
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

      return () => {
        cancelled = true;
        observer.disconnect();
      };
    }

    requestAnimationFrame(() => {
      scrollToBottom('auto');
    });
  }, [scrollKey, anchorMessageId, scrollToBottom, scrollToMessage]);

  useEffect(() => {
    const content = contentRef.current;
    if (!content) {
      return;
    }

    const observer = new ResizeObserver(() => {
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
  };
}
