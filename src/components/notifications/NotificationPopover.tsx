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
    <div className="absolute right-0 top-[calc(100%+8px)] z-30 flex w-96 max-w-[calc(100vw-2rem)] flex-col overflow-hidden rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--surface)] shadow-[var(--shadow-md)]">
      <div className="flex items-center justify-between border-b border-[var(--border)] px-4 py-3">
        <div>
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
            className="inline-flex items-center gap-1 text-xs font-medium text-[var(--primary)] hover:underline"
          >
            <CheckCheck className="h-3.5 w-3.5" />
            Mark all read
          </button>
        ) : null}
      </div>

      <div className="max-h-96 overflow-y-auto overscroll-y-contain py-1">
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

      <div className="border-t border-[var(--border)] p-3">
        <Button
          variant="secondary"
          size="sm"
          className="w-full"
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
