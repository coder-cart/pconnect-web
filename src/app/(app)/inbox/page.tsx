'use client';

import { CheckCheck } from 'lucide-react';
import { PageHeader } from '@/components/ui/PageHeader';
import { Button } from '@/components/ui/Button';
import { EmptyState, ErrorState } from '@/components/ui/StatePanels';
import { ListSkeleton } from '@/components/ui/Skeleton';
import { NotificationListItem } from '@/components/notifications/NotificationListItem';
import { useNotifications } from '@/components/providers/NotificationProvider';

export default function InboxPage() {
  const {
    notifications,
    unreadCount,
    isLoading,
    errorMessage,
    markRead,
    markAllRead,
    refreshNotifications,
  } = useNotifications();

  return (
    <div className="space-y-6">
      <PageHeader
        title="Inbox"
        description="Notifications, mentions, and action items in one place."
        breadcrumbs={[
          { label: 'Workspace', href: '/dashboard' },
          { label: 'Inbox' },
        ]}
        action={
          unreadCount > 0 ? (
            <Button variant="secondary" onClick={() => void markAllRead()}>
              <CheckCheck className="h-4 w-4" />
              Mark all read
            </Button>
          ) : undefined
        }
      />

      {errorMessage ? (
        <div className="space-y-3">
          <ErrorState title="Unable to load inbox" description={errorMessage} />
          <Button variant="secondary" onClick={() => void refreshNotifications()}>
            Retry
          </Button>
        </div>
      ) : null}

      {isLoading ? (
        <ListSkeleton rows={4} />
      ) : notifications.length === 0 ? (
        <EmptyState
          title="Inbox is clear"
          description="New mentions, approvals, and updates will appear here."
        />
      ) : (
        <div className="space-y-3">
          {notifications.map((notification) => (
            <NotificationListItem
              key={notification.id}
              notification={notification}
              onMarkRead={markRead}
            />
          ))}
        </div>
      )}
    </div>
  );
}
