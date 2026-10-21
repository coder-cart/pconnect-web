import Link from 'next/link';
import { MoreHorizontal } from 'lucide-react';
import { Badge } from '@/components/ui/Badge';
import { Card } from '@/components/ui/Card';
import {
  humanize,
  OrderSummary,
  orderPriorityVariant,
  orderStatusVariant,
} from '@/lib/orders';

export function RecentOrdersTable({
  orders,
  hideClientIdentity,
}: {
  orders: OrderSummary[];
  hideClientIdentity?: boolean;
}) {
  return (
    <Card className="overflow-hidden p-0">
      <div className="flex items-center justify-between gap-2 border-b border-[var(--border)] px-4 py-3">
        <div>
          <h2 className="text-sm font-semibold text-[var(--foreground)]">
            Recent orders
          </h2>
          <p className="text-xs text-[var(--muted)]">Latest active jobs</p>
        </div>
        <Link
          href="/orders"
          className="text-xs font-medium text-[var(--primary)] hover:underline"
        >
          View all
        </Link>
      </div>

      {orders.length === 0 ? (
        <p className="px-4 py-6 text-sm text-[var(--muted)]">No orders to show.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead className="bg-[var(--surface-muted)] text-xs uppercase tracking-wide text-[var(--muted)]">
              <tr>
                <th className="px-4 py-2.5 font-medium">Order ID</th>
                {!hideClientIdentity ? (
                  <th className="px-4 py-2.5 font-medium">Client</th>
                ) : null}
                <th className="px-4 py-2.5 font-medium">Images</th>
                <th className="px-4 py-2.5 font-medium">Status</th>
                <th className="px-4 py-2.5 font-medium">Priority</th>
                <th className="px-4 py-2.5 font-medium">Due</th>
                <th className="px-4 py-2.5 font-medium">
                  <span className="sr-only">Open</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {orders.slice(0, 6).map((order) => (
                <tr
                  key={order.id}
                  className="border-t border-[var(--border)] hover:bg-[var(--surface-muted)]/60"
                >
                  <td className="px-4 py-3">
                    <Link
                      href={`/orders/${order.id}`}
                      className="font-medium text-[var(--foreground)] hover:text-[var(--primary)]"
                    >
                      {order.code}
                    </Link>
                    <p className="truncate text-xs text-[var(--muted)]">{order.name}</p>
                  </td>
                  {!hideClientIdentity ? (
                    <td className="px-4 py-3 text-[var(--muted)]">
                      {order.clientOrganization?.name ?? '—'}
                    </td>
                  ) : null}
                  <td className="px-4 py-3 text-[var(--muted)]">{order.imageCount}</td>
                  <td className="px-4 py-3">
                    <Badge variant={orderStatusVariant(order.status)}>
                      {order.workflowStatus?.name ?? humanize(order.status)}
                    </Badge>
                  </td>
                  <td className="px-4 py-3">
                    <Badge variant={orderPriorityVariant(order.priority)}>
                      {humanize(order.priority)}
                    </Badge>
                  </td>
                  <td className="px-4 py-3 text-[var(--muted)]">
                    {order.dueDate
                      ? new Date(order.dueDate).toLocaleDateString('en-GB', {
                          day: 'numeric',
                          month: 'short',
                          year: 'numeric',
                        })
                      : '—'}
                  </td>
                  <td className="px-4 py-3">
                    <Link
                      href={`/orders/${order.id}`}
                      className="inline-flex rounded-md p-1 text-[var(--muted)] hover:bg-[var(--surface-muted)] hover:text-[var(--foreground)]"
                      aria-label={`Open ${order.code}`}
                    >
                      <MoreHorizontal className="h-4 w-4" />
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Card>
  );
}
