'use client';

import {
  AtSign,
  Bell,
  CreditCard,
  Hash,
  CheckSquare,
} from 'lucide-react';
import Link from 'next/link';
import { Badge } from '@/components/ui/Badge';
import { Card } from '@/components/ui/Card';
import {
  NotificationRecord,
  formatNotificationRelativeTime,
  getNotificationIconType,
} from '@/lib/notifications';
import { cn } from '@/lib/cn';

interface NotificationListItemProps {
  notification: NotificationRecord;
  compact?: boolean;
  onMarkRead?: (notificationId: string) => void;
  onNavigate?: () => void;
}

function NotificationIcon({ type }: { type: string }) {
  const iconType = getNotificationIconType(type);
  const className = 'h-4 w-4';

  if (iconType === 'mention') return <AtSign className={className} />;
  if (iconType === 'invite') return <Hash className={className} />;
  if (iconType === 'invoice') return <CreditCard className={className} />;
  if (iconType === 'task') return <CheckSquare className={className} />;
  return <Bell className={className} />;
}

export function NotificationListItem({
  notification,
  compact = false,
  onMarkRead,
  onNavigate,
}: NotificationListItemProps) {
  const content = (
    <>
      <div
        className={cn(
          'flex shrink-0 items-center justify-center rounded-[var(--radius-md)] bg-[var(--primary-soft)] text-[var(--primary)]',
          compact ? 'h-8 w-8' : 'h-10 w-10',
        )}
      >
        <NotificationIcon type={notification.type} />
      </div>

      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <h2
            className={cn(
              'font-semibold text-[var(--foreground)]',
              compact ? 'text-sm' : 'text-sm',
            )}
          >
            {notification.title}
          </h2>
          {!notification.isRead ? <Badge variant="primary">New</Badge> : null}
        </div>
        <p
          className={cn(
            'mt-1 text-[var(--muted)]',
            compact ? 'line-clamp-2 text-xs' : 'text-sm',
          )}
        >
          {notification.body}
        </p>
        <div className="mt-2 flex flex-wrap items-center gap-3">
          <span className="text-xs text-[var(--muted)]">
            {formatNotificationRelativeTime(notification.createdAt)}
          </span>
          {!notification.isRead && onMarkRead ? (
            <button
              type="button"
              onClick={(event) => {
                event.preventDefault();
                event.stopPropagation();
                onMarkRead(notification.id);
              }}
              className="text-xs font-medium text-[var(--primary)]"
            >
              Mark read
            </button>
          ) : null}
        </div>
      </div>
    </>
  );

  if (compact) {
    const inner = notification.linkUrl ? (
      <Link
        href={notification.linkUrl}
        onClick={() => {
          if (!notification.isRead && onMarkRead) {
            void onMarkRead(notification.id);
          }
          onNavigate?.();
        }}
        className={cn(
          'flex w-full items-start gap-3 rounded-[var(--radius-md)] px-3 py-2 text-left transition-colors hover:bg-[var(--surface-muted)]',
          !notification.isRead && 'bg-[var(--primary-soft)]/20',
        )}
      >
        {content}
      </Link>
    ) : (
      <div
        className={cn(
          'flex w-full items-start gap-3 rounded-[var(--radius-md)] px-3 py-2',
          !notification.isRead && 'bg-[var(--primary-soft)]/20',
        )}
      >
        {content}
      </div>
    );

    return inner;
  }

  return (
    <Card className={notification.isRead ? 'opacity-80' : undefined}>
      <div className="flex items-start gap-3">
        {notification.linkUrl ? (
          <Link
            href={notification.linkUrl}
            onClick={() => {
              if (!notification.isRead && onMarkRead) {
                void onMarkRead(notification.id);
              }
            }}
            className="flex min-w-0 flex-1 items-start gap-3"
          >
            {content}
          </Link>
        ) : (
          content
        )}
      </div>
    </Card>
  );
}
