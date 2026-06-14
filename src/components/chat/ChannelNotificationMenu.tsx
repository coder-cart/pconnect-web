'use client';

import { useEffect, useRef, useState } from 'react';
import {
  Bell,
  BellOff,
  BellRing,
  Check,
  ChevronRight,
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { ChannelNotificationLevel, ChannelNotificationPreference } from '@/lib/channelMembers';
import { cn } from '@/lib/cn';

interface ChannelNotificationMenuProps {
  preference: ChannelNotificationPreference | null;
  isUpdating?: boolean;
  onChange: (payload: {
    notificationLevel?: ChannelNotificationLevel;
    mutedUntil?: string | null;
  }) => Promise<void>;
}

const OPTIONS: Array<{
  level: ChannelNotificationLevel;
  title: string;
  description: string;
  icon: typeof Bell;
}> = [
  {
    level: 'all',
    title: 'All new posts',
    description: 'Messages and threads you follow',
    icon: BellRing,
  },
  {
    level: 'mentions',
    title: 'Just mentions',
    description: '@you, @channel, @here',
    icon: Bell,
  },
  {
    level: 'mute',
    title: 'Mute and hide',
    description: 'Only badge the channel when someone @mentions you',
    icon: BellOff,
  },
];

function addHours(date: Date, hours: number) {
  return new Date(date.getTime() + hours * 60 * 60 * 1000);
}

function startOfTomorrow() {
  const date = new Date();
  date.setDate(date.getDate() + 1);
  date.setHours(9, 0, 0, 0);
  return date;
}

export function ChannelNotificationMenu({
  preference,
  isUpdating = false,
  onChange,
}: ChannelNotificationMenuProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const [showMore, setShowMore] = useState(false);
  const activeLevel = preference?.effectiveLevel ?? 'all';

  useEffect(() => {
    if (!open) {
      setShowMore(false);
      return;
    }

    function handleClickOutside(event: MouseEvent) {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        setOpen(false);
      }
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        setOpen(false);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [open]);

  async function selectLevel(level: ChannelNotificationLevel) {
    await onChange({
      notificationLevel: level,
      mutedUntil: null,
    });
    setOpen(false);
  }

  async function temporarilyMute(until: Date) {
    await onChange({
      notificationLevel: 'mute',
      mutedUntil: until.toISOString(),
    });
    setOpen(false);
  }

  return (
    <div ref={containerRef} className="relative">
      <Button
        type="button"
        variant="ghost"
        size="sm"
        aria-label="Channel notifications"
        onClick={() => setOpen((value) => !value)}
      >
        {activeLevel === 'mute' ? (
          <BellOff className="h-4 w-4" />
        ) : activeLevel === 'mentions' ? (
          <Bell className="h-4 w-4" />
        ) : (
          <BellRing className="h-4 w-4" />
        )}
      </Button>

      {open ? (
        <div className="absolute right-0 top-[calc(100%+4px)] z-50 w-72 rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--surface)] py-2 shadow-[var(--shadow-md)]">
          <p className="px-3 pb-2 text-xs font-semibold text-[var(--muted)]">
            Notify you about...
          </p>

          {OPTIONS.map(({ level, title, description, icon: Icon }) => (
            <button
              key={level}
              type="button"
              disabled={isUpdating}
              onClick={() => void selectLevel(level)}
              className={cn(
                'flex w-full items-start gap-3 px-3 py-2 text-left transition-colors hover:bg-[var(--surface-muted)]',
                activeLevel === level && 'bg-[var(--primary-soft)]/40',
              )}
            >
              <Icon className="mt-0.5 h-4 w-4 shrink-0 text-[var(--muted)]" />
              <span className="min-w-0 flex-1">
                <span className="block text-sm font-medium text-[var(--foreground)]">
                  {title}
                </span>
                <span className="block text-xs text-[var(--muted)]">
                  {description}
                </span>
              </span>
              {activeLevel === level ? (
                <Check className="mt-0.5 h-4 w-4 shrink-0 text-[var(--primary)]" />
              ) : null}
            </button>
          ))}

          <div className="my-2 border-t border-[var(--border)]" />

          <div className="relative px-1">
            <button
              type="button"
              disabled={isUpdating}
              onMouseEnter={() => setShowMore(true)}
              onFocus={() => setShowMore(true)}
              className="flex w-full items-center justify-between rounded-[var(--radius-md)] px-3 py-2 text-left text-sm text-[var(--primary)] hover:bg-[var(--surface-muted)]"
            >
              More options
              <ChevronRight className="h-4 w-4" />
            </button>

            {showMore ? (
              <div
                className="absolute left-full top-0 ml-1 w-56 rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--surface)] py-2 shadow-[var(--shadow-md)]"
                onMouseEnter={() => setShowMore(true)}
                onMouseLeave={() => setShowMore(false)}
              >
                <p className="px-3 pb-1 text-xs font-semibold text-[var(--muted)]">
                  Temporarily mute...
                </p>
                <button
                  type="button"
                  disabled={isUpdating}
                  onClick={() => void temporarilyMute(startOfTomorrow())}
                  className="block w-full px-3 py-2 text-left text-sm hover:bg-[var(--surface-muted)]"
                >
                  Until tomorrow
                </button>
                <button
                  type="button"
                  disabled={isUpdating}
                  onClick={() => void temporarilyMute(addHours(new Date(), 1))}
                  className="block w-full px-3 py-2 text-left text-sm hover:bg-[var(--surface-muted)]"
                >
                  1 hour
                </button>
                <div className="my-2 border-t border-[var(--border)]" />
                <button
                  type="button"
                  disabled={isUpdating}
                  onClick={() => void selectLevel('all')}
                  className="block w-full px-3 py-2 text-left text-sm hover:bg-[var(--surface-muted)]"
                >
                  Edit default preferences
                </button>
              </div>
            ) : null}
          </div>

          {preference?.mutedUntil ? (
            <p className="px-3 pt-2 text-[10px] text-[var(--muted)]">
              Muted until{' '}
              {new Date(preference.mutedUntil).toLocaleString(undefined, {
                dateStyle: 'medium',
                timeStyle: 'short',
              })}
            </p>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
