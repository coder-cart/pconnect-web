import Link from 'next/link';
import { Card } from '@/components/ui/Card';
import {
  formatNotificationRelativeTime,
  formatNotificationTitle,
  NotificationRecord,
} from '@/lib/notifications';

export function RecentActivityPanel({
  items,
}: {
  items: NotificationRecord[];
}) {
  return (
    <Card className="h-full">
      <div className="mb-3 flex items-center justify-between gap-2">
        <div>
          <h2 className="text-sm font-semibold text-[var(--foreground)]">
            Recent activity
          </h2>
          <p className="text-xs text-[var(--muted)]">Latest workspace updates</p>
        </div>
        <Link
          href="/inbox"
          className="text-xs font-medium text-[var(--primary)] hover:underline"
        >
          View all
        </Link>
      </div>

      {items.length === 0 ? (
        <p className="text-sm text-[var(--muted)]">No recent activity yet.</p>
      ) : (
        <ol className="space-y-3">
          {items.slice(0, 6).map((item, index) => (
            <li key={item.id} className="relative flex gap-3 pl-1">
              <span className="relative mt-1.5 flex h-2.5 w-2.5 shrink-0">
                <span className="absolute inset-0 rounded-full bg-[var(--primary)]" />
                {index < items.length - 1 ? (
                  <span className="absolute left-1/2 top-3 h-6 w-px -translate-x-1/2 bg-[var(--border)]" />
                ) : null}
              </span>
              <div className="min-w-0 flex-1">
                {item.linkUrl ? (
                  <Link
                    href={item.linkUrl}
                    className="block text-sm font-medium text-[var(--foreground)] hover:text-[var(--primary)]"
                  >
                    {formatNotificationTitle(item)}
                  </Link>
                ) : (
                  <p className="text-sm font-medium text-[var(--foreground)]">
                    {formatNotificationTitle(item)}
                  </p>
                )}
                <p className="truncate text-xs text-[var(--muted)]">{item.body}</p>
                <p className="mt-0.5 text-[0.7rem] text-[var(--muted)]">
                  {formatNotificationRelativeTime(item.createdAt)}
                </p>
              </div>
            </li>
          ))}
        </ol>
      )}
    </Card>
  );
}
