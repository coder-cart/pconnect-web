'use client';

import { MutableRefObject, ReactNode, useEffect } from 'react';
import { ArrowDown } from 'lucide-react';
import {
  useChatScroll,
  type ChatScrollRestore,
} from '@/hooks/useChatScroll';
import { cn } from '@/lib/cn';

interface ChatScrollAreaProps {
  scrollKey?: string | null;
  anchorMessageId?: string | null;
  restoreOnKeyChange?: ChatScrollRestore | null;
  onScrollPosition?: (state: {
    scrollTop: number;
    distanceFromBottom: number;
    nearBottom: boolean;
  }) => void;
  suspendStickToBottom?: boolean;
  onReachTop?: () => void;
  scrollContainerRef?: MutableRefObject<HTMLDivElement | null>;
  jumpLabel?: string;
  className?: string;
  containerClassName?: string;
  contentClassName?: string;
  children: ReactNode;
}

const TOP_LOAD_THRESHOLD = 80;

export function ChatScrollArea({
  scrollKey,
  anchorMessageId,
  restoreOnKeyChange,
  onScrollPosition,
  suspendStickToBottom,
  onReachTop,
  scrollContainerRef,
  jumpLabel = 'Jump to latest',
  className,
  containerClassName,
  contentClassName,
  children,
}: ChatScrollAreaProps) {
  const {
    containerRef,
    contentRef,
    showJumpToLatest,
    scrollToBottom,
    handleScroll,
  } = useChatScroll(scrollKey, {
    anchorMessageId,
    restoreOnKeyChange,
    onScrollPosition,
    suspendStickToBottom,
  });

  useEffect(() => {
    if (!scrollContainerRef) {
      return;
    }
    scrollContainerRef.current = containerRef.current;
    return () => {
      scrollContainerRef.current = null;
    };
  }, [scrollContainerRef, containerRef]);

  return (
    <div className={cn('relative min-h-0 flex-1', className)}>
      <div
        ref={containerRef}
        onScroll={(event) => {
          handleScroll();
          if (
            onReachTop &&
            event.currentTarget.scrollTop <= TOP_LOAD_THRESHOLD
          ) {
            onReachTop();
          }
        }}
        className={cn(
          'chat-inset-x h-full overflow-y-auto overscroll-y-contain [overflow-anchor:auto] py-[var(--chat-inset-y)]',
          containerClassName,
        )}
      >
        <div ref={contentRef} className={cn('min-h-full', contentClassName)}>
          {children}
        </div>
      </div>

      {showJumpToLatest ? (
        <div className="pointer-events-none absolute inset-x-0 bottom-3 flex justify-center sm:bottom-4">
          <button
            type="button"
            onClick={() => scrollToBottom('smooth')}
            className="pointer-events-auto inline-flex items-center gap-2 rounded-full border border-[var(--border)] bg-[var(--surface)] px-3 py-1.5 text-sm font-medium text-[var(--foreground)] shadow-[var(--shadow-md)] transition-colors hover:bg-[var(--surface-muted)] sm:px-4 sm:py-2"
          >
            <ArrowDown className="h-4 w-4" />
            {jumpLabel}
          </button>
        </div>
      ) : null}
    </div>
  );
}
