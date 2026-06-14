'use client';

import { useEffect, useRef } from 'react';
import { Avatar } from '@/components/ui/Avatar';
import { ChannelMemberOption, getMemberSourceLabel } from '@/lib/channelMembers';
import { cn } from '@/lib/cn';

interface MentionPickerProps {
  open: boolean;
  members: ChannelMemberOption[];
  activeIndex: number;
  currentUserId: string;
  onSelect: (member: ChannelMemberOption) => void;
  onActiveIndexChange: (index: number) => void;
}

export function MentionPicker({
  open,
  members,
  activeIndex,
  currentUserId,
  onSelect,
  onActiveIndexChange,
}: MentionPickerProps) {
  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const activeItem = listRef.current?.querySelector('[data-active="true"]');
    activeItem?.scrollIntoView({ block: 'nearest' });
  }, [activeIndex, open]);

  if (!open || members.length === 0) {
    return null;
  }

  return (
    <div
      className={cn(
        'absolute left-0 z-50 w-full max-w-sm overflow-hidden rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--surface)] shadow-[var(--shadow-md)]',
        'bottom-full mb-2',
      )}
    >
      <div className="border-b border-[var(--border)] px-3 py-2 text-xs font-semibold text-[var(--muted)]">
        Mention a project member
      </div>
      <div ref={listRef} className="max-h-60 overflow-y-auto overscroll-y-contain py-1">
        {members.map((member, index) => (
          <button
            key={member.id}
            type="button"
            data-active={index === activeIndex ? 'true' : 'false'}
            className={cn(
              'flex w-full items-center gap-3 px-3 py-2 text-left text-sm transition-colors',
              index === activeIndex
                ? 'bg-[var(--primary-soft)] text-[var(--primary)]'
                : 'hover:bg-[var(--surface-muted)]',
            )}
            onMouseEnter={() => onActiveIndexChange(index)}
            onClick={() => onSelect(member)}
          >
            <Avatar name={member.fullName} size="sm" />
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
      <div className="border-t border-[var(--border)] px-3 py-2 text-[10px] text-[var(--muted)]">
        ↑↓ to navigate · Enter to select · Esc to dismiss
      </div>
    </div>
  );
}
