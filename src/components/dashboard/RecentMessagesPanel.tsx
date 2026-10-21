import Link from 'next/link';
import { Card } from '@/components/ui/Card';
import {
  formatNotificationRelativeTime,
  formatNotificationTitle,
  NotificationRecord,
} from '@/lib/notifications';

function initials(value: string) {
  return value
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? '')
    .join('');
}

export function RecentMessagesPanel({
  items,
}: {
  items: NotificationRecord[];
}) {
  return (
    <Card className="h-full">
      <div className="mb-3 flex items-center justify-between gap-2">
        <div>
          <h2 className="text-sm font-semibold text-[var(--foreground)]">
            Recent messages
          </h2>
          <p className="text-xs text-[var(--muted)]">From your notification feed</p>
        </div>
        <Link
          href="/chat"
          className="text-xs font-medium text-[var(--primary)] hover:underline"
        >
          Open chat
        </Link>
      </div>

      {items.length === 0 ? (
        <p className="text-sm text-[var(--muted)]">No recent messages.</p>
      ) : (
        <ul className="space-y-3">
          {items.slice(0, 5).map((item) => {
            const title = formatNotificationTitle(item);
            return (
              <li key={item.id}>
                <Link
                  href={item.linkUrl || '/chat'}
                  className="flex gap-3 rounded-[var(--radius-md)] p-2 hover:bg-[var(--surface-muted)]"
                >
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[var(--primary-soft)] text-xs font-semibold text-[var(--primary)]">
                    {initials(title)}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="flex items-start justify-between gap-2">
                      <span className="truncate text-sm font-medium text-[var(--foreground)]">
                        {title}
                      </span>
                      <span className="shrink-0 text-[0.7rem] text-[var(--muted)]">
                        {formatNotificationRelativeTime(item.createdAt)}
                      </span>
                    </span>
                    <span className="mt-0.5 line-clamp-2 text-xs text-[var(--muted)]">
                      {item.body}
                    </span>
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </Card>
  );
}
