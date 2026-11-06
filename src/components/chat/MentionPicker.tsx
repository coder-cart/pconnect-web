'use client';

import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { UserAvatar } from '@/components/ui/UserAvatar';
import { ChannelMemberOption, getMemberSourceLabel } from '@/lib/channelMembers';
import { cn } from '@/lib/cn';
import { positionPanelAboveAnchor } from '@/lib/viewport-menu';

interface MentionPickerProps {
  open: boolean;
  members: ChannelMemberOption[];
  activeIndex: number;
  currentUserId: string;
  /** Anchor element (composer shell) for fixed positioning. */
  anchorRef?: React.RefObject<HTMLElement | null>;
  onSelect: (member: ChannelMemberOption) => void;
  onActiveIndexChange: (index: number) => void;
}

export function MentionPicker({
  open,
  members,
  activeIndex,
  currentUserId,
  anchorRef,
  onSelect,
  onActiveIndexChange,
}: MentionPickerProps) {
  const listRef = useRef<HTMLDivElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState({ left: 0, top: 0 });
  const [ready, setReady] = useState(false);

  useLayoutEffect(() => {
    if (!open || members.length === 0) {
      setReady(false);
      return;
    }

    function place() {
      const anchor = anchorRef?.current?.getBoundingClientRect();
      const panel = panelRef.current?.getBoundingClientRect();
      if (!anchor || !panel) return;
      setPos(
        positionPanelAboveAnchor(
          anchor,
          Math.min(panel.width, window.innerWidth - 16),
          panel.height,
        ),
      );
      setReady(true);
    }

    place();
    const vv = window.visualViewport;
    vv?.addEventListener('resize', place);
    vv?.addEventListener('scroll', place);
    window.addEventListener('resize', place);
    return () => {
      vv?.removeEventListener('resize', place);
      vv?.removeEventListener('scroll', place);
      window.removeEventListener('resize', place);
    };
  }, [open, members.length, activeIndex, anchorRef]);

  useEffect(() => {
    if (!open) return;
    const activeItem = listRef.current?.querySelector('[data-active="true"]');
    activeItem?.scrollIntoView({ block: 'nearest' });
  }, [activeIndex, open]);

  if (!open || members.length === 0) {
    return null;
  }

  const panel = (
    <div
      ref={panelRef}
      className={cn(
        'z-[90] w-[min(24rem,calc(100vw-1rem))] overflow-hidden rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--surface)] shadow-[var(--shadow-md)]',
        anchorRef ? 'fixed' : 'absolute bottom-full left-0 mb-2',
      )}
      style={
        anchorRef
          ? {
              left: pos.left,
              top: pos.top,
              visibility: ready ? 'visible' : 'hidden',
            }
          : undefined
      }
    >
      <div className="border-b border-[var(--border)] px-3 py-2 text-xs font-semibold text-[var(--muted)]">
        Mention a project member
      </div>
      <div
        ref={listRef}
        className="max-h-[min(15rem,40dvh)] overflow-y-auto overscroll-y-contain py-1"
      >
        {members.map((member, index) => (
          <button
            key={member.id}
            type="button"
            data-active={index === activeIndex ? 'true' : 'false'}
            className={cn(
              'flex min-h-touch w-full items-center gap-3 px-3 py-2 text-left text-sm transition-colors sm:min-h-0',
              index === activeIndex
                ? 'bg-[var(--primary-soft)] text-[var(--primary)]'
                : 'hover:bg-[var(--surface-muted)]',
            )}
            onMouseEnter={() => onActiveIndexChange(index)}
            onClick={() => onSelect(member)}
          >
            <UserAvatar
              user={{
                id: member.id,
                fullName: member.fullName,
                avatarUpdatedAt: member.avatarUpdatedAt,
              }}
              size="sm"
            />
            <span className="min-w-0 flex-1">
              <span className="block truncate font-medium">
                {member.fullName}
                {member.id === currentUserId ? ' (you)' : ''}
              </span>
              <span className="block truncate text-xs text-[var(--muted)]">
                {getMemberSourceLabel(member)} · {member.email}
              </span>
            </span>
          </button>
        ))}
      </div>
      <div className="hidden border-t border-[var(--border)] px-3 py-2 text-[10px] text-[var(--muted)] sm:block">
        ↑↓ to navigate · Enter to select · Esc to dismiss
      </div>
    </div>
  );

  if (anchorRef && typeof document !== 'undefined') {
    return createPortal(panel, document.body);
  }

  return panel;
}
