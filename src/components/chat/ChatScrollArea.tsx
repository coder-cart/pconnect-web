'use client';

import { ReactNode } from 'react';
import { ArrowDown } from 'lucide-react';
import { useChatScroll } from '@/hooks/useChatScroll';
import { cn } from '@/lib/cn';

interface ChatScrollAreaProps {
  scrollKey?: string | null;
  anchorMessageId?: string | null;
  jumpLabel?: string;
  className?: string;
  containerClassName?: string;
  contentClassName?: string;
  children: ReactNode;
}

export function ChatScrollArea({
  scrollKey,
  anchorMessageId,
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
  } = useChatScroll(scrollKey, { anchorMessageId });

  return (
    <div className={cn('relative min-h-0 flex-1', className)}>
      <div
        ref={containerRef}
        onScroll={handleScroll}
        className={cn(
          'h-full overflow-y-auto overscroll-y-contain scroll-smooth px-4 py-4 sm:px-6',
          containerClassName,
        )}
      >
        <div ref={contentRef} className={cn('min-h-full', contentClassName)}>
          {children}
        </div>
      </div>

      {showJumpToLatest ? (
        <div className="pointer-events-none absolute inset-x-0 bottom-4 flex justify-center">
          <button
            type="button"
            onClick={() => scrollToBottom('smooth')}
            className="pointer-events-auto inline-flex items-center gap-2 rounded-full border border-[var(--border)] bg-[var(--surface)] px-4 py-2 text-sm font-medium text-[var(--foreground)] shadow-[var(--shadow-md)] transition-colors hover:bg-[var(--surface-muted)]"
          >
            <ArrowDown className="h-4 w-4" />
            {jumpLabel}
          </button>
        </div>
      ) : null}
    </div>
  );
}
