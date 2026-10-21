'use client';

import { useRouter } from 'next/navigation';
import { CheckCheck } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { NotificationListItem } from '@/components/notifications/NotificationListItem';
import { useNotificationPreview } from '@/components/providers/NotificationProvider';
import { ListSkeleton } from '@/components/ui/Skeleton';

interface NotificationPopoverProps {
  onClose: () => void;
}

export function NotificationPopover({ onClose }: NotificationPopoverProps) {
  const router = useRouter();
  const {
    previewNotifications,
    unreadCount,
    isLoading,
    errorMessage,
    markRead,
    markAllRead,
  } = useNotificationPreview();

  return (
    <div className="fixed inset-x-2 top-[3.75rem] z-30 flex max-h-[min(32rem,calc(100dvh-5rem))] w-auto flex-col overflow-hidden rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--surface)] shadow-[var(--shadow-md)] sm:absolute sm:inset-x-auto sm:right-0 sm:top-[calc(100%+8px)] sm:max-h-96 sm:w-96 sm:max-w-[calc(100vw-2rem)]">
      <div className="flex shrink-0 items-center justify-between gap-2 border-b border-[var(--border)] px-4 py-3">
        <div className="min-w-0">
          <p className="text-sm font-semibold text-[var(--foreground)]">
            Notifications
          </p>
          {unreadCount > 0 ? (
            <p className="text-xs text-[var(--muted)]">
              {unreadCount} unread
            </p>
          ) : null}
        </div>
        {unreadCount > 0 ? (
          <button
            type="button"
            onClick={() => void markAllRead()}
            className="inline-flex min-h-touch shrink-0 items-center gap-1 px-1 text-xs font-medium text-[var(--primary)] hover:underline"
          >
            <CheckCheck className="h-3.5 w-3.5" />
            Mark all read
          </button>
        ) : null}
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto overscroll-y-contain py-1">
        {isLoading ? (
          <div className="px-3 py-2">
            <ListSkeleton rows={3} />
          </div>
        ) : errorMessage ? (
          <p className="px-4 py-6 text-sm text-[var(--danger)]">{errorMessage}</p>
        ) : previewNotifications.length === 0 ? (
          <p className="px-4 py-8 text-center text-sm text-[var(--muted)]">
            You&apos;re all caught up.
          </p>
        ) : (
          previewNotifications.map((notification) => (
            <NotificationListItem
              key={notification.id}
              notification={notification}
              compact
              onMarkRead={markRead}
              onNavigate={onClose}
            />
          ))
        )}
      </div>

      <div
        className="shrink-0 border-t border-[var(--border)] p-3"
        style={{ paddingBottom: 'max(0.75rem, var(--safe-bottom))' }}
      >
        <Button
          variant="secondary"
          size="sm"
          className="h-11 w-full sm:h-8"
          onClick={() => {
            onClose();
            router.push('/inbox');
          }}
        >
          View all notifications
        </Button>
      </div>
    </div>
  );
}
