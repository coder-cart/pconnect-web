'use client';

import { Card } from '@/components/ui/Card';
import {
  OrderStatusDonut,
  type StageCount,
} from '@/components/dashboard/OrderStatusCharts';

export type ClientListChartItem = {
  id: string;
  name: string;
  status: string;
  orderCount: number;
};

const STATUS_COLORS: Record<string, string> = {
  active: '#16a34a',
  onboarding: '#d97706',
  inactive: '#dc2626',
};

export function buildClientStatusStages(
  items: Array<{ status: string }>,
): StageCount[] {
  const counts: Record<string, number> = {
    active: 0,
    onboarding: 0,
    inactive: 0,
  };

  for (const item of items) {
    if (item.status in counts) {
      counts[item.status] += 1;
    }
  }

  return [
    {
      id: 'active',
      label: 'Active',
      count: counts.active,
      color: STATUS_COLORS.active,
    },
    {
      id: 'onboarding',
      label: 'Onboarding',
      count: counts.onboarding,
      color: STATUS_COLORS.onboarding,
    },
    {
      id: 'inactive',
      label: 'Inactive',
      count: counts.inactive,
      color: STATUS_COLORS.inactive,
    },
  ];
}

export function ClientStatusDonut({
  items,
}: {
  items: Array<{ status: string }>;
}) {
  return (
    <OrderStatusDonut
      stages={buildClientStatusStages(items)}
      title="Clients by status"
      description="Portfolio health across organizations"
    />
  );
}

export function TopClientsOrdersBars({
  items,
  limit = 6,
}: {
  items: ClientListChartItem[];
  limit?: number;
}) {
  const ranked = [...items]
    .sort((left, right) => right.orderCount - left.orderCount)
    .slice(0, limit);
  const maxOrders = Math.max(0, ...ranked.map((item) => item.orderCount));
  const totalOrders = items.reduce((sum, item) => sum + item.orderCount, 0);

  return (
    <Card className="h-full">
      <h2 className="text-sm font-semibold text-[var(--foreground)]">
        Orders by client
      </h2>
      <p className="mt-0.5 text-xs text-[var(--muted)]">
        Top organizations by order volume · {totalOrders} total
      </p>
      {ranked.length === 0 || maxOrders === 0 ? (
        <div className="mt-4 flex h-40 items-center justify-center rounded-[var(--radius-md)] border border-dashed border-[var(--border)] bg-[var(--surface-muted)]/40">
          <p className="px-4 text-center text-xs text-[var(--muted)]">
            No client orders to chart yet
          </p>
        </div>
      ) : (
        <ul className="mt-4 space-y-2.5">
          {ranked.map((item) => {
            const widthPct =
              maxOrders === 0 ? 0 : Math.max(6, (item.orderCount / maxOrders) * 100);
            return (
              <li key={item.id} className="space-y-1">
                <div className="flex items-center justify-between gap-3 text-xs">
                  <span className="truncate font-medium text-[var(--foreground)]">
                    {item.name}
                  </span>
                  <span className="shrink-0 tabular-nums text-[var(--muted)]">
                    {item.orderCount}
                  </span>
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-[var(--surface-muted)]">
                  <div
                    className="h-full rounded-full bg-[var(--primary)]"
                    style={{ width: `${widthPct}%` }}
                    title={`${item.name}: ${item.orderCount} orders`}
                  />
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </Card>
  );
}

export function ClientOrderMixDonut({
  activeOrders,
  completedOrders,
}: {
  activeOrders: number;
  completedOrders: number;
}) {
  const stages: StageCount[] = [
    {
      id: 'open',
      label: 'Open',
      count: activeOrders,
      color: '#2563eb',
    },
    {
      id: 'completed',
      label: 'Completed',
      count: completedOrders,
      color: '#16a34a',
    },
  ];

  return (
    <OrderStatusDonut
      stages={stages}
      title="Order mix"
      description="Open vs completed work for this client"
    />
  );
}

export function ClientPipelineBars({
  pendingOrders,
  ordersInQa,
  activeOrders,
}: {
  pendingOrders: number;
  ordersInQa: number;
  activeOrders: number;
}) {
  const inProgress = Math.max(0, activeOrders - pendingOrders - ordersInQa);
  const rows = [
    { id: 'pending', label: 'Pending', count: pendingOrders, color: 'bg-orange-500' },
    { id: 'progress', label: 'In progress', count: inProgress, color: 'bg-blue-500' },
    { id: 'qa', label: 'In QA', count: ordersInQa, color: 'bg-violet-500' },
  ];
  const maxCount = Math.max(1, ...rows.map((row) => row.count));

  return (
    <Card className="h-full">
      <h2 className="text-sm font-semibold text-[var(--foreground)]">
        Open pipeline
      </h2>
      <p className="mt-0.5 text-xs text-[var(--muted)]">
        Where active orders sit right now
      </p>
      {activeOrders === 0 ? (
        <div className="mt-4 flex h-40 items-center justify-center rounded-[var(--radius-md)] border border-dashed border-[var(--border)] bg-[var(--surface-muted)]/40">
          <p className="px-4 text-center text-xs text-[var(--muted)]">
            No open orders in the pipeline
          </p>
        </div>
      ) : (
        <ul className="mt-5 space-y-3">
          {rows.map((row) => {
            const widthPct = Math.max(4, (row.count / maxCount) * 100);
            return (
              <li key={row.id} className="space-y-1.5">
                <div className="flex items-center justify-between gap-3 text-xs">
                  <span className="inline-flex items-center gap-2 text-[var(--muted)]">
                    <span className={`h-2 w-2 rounded-full ${row.color}`} />
                    {row.label}
                  </span>
                  <span className="font-semibold tabular-nums text-[var(--foreground)]">
                    {row.count}
                  </span>
                </div>
                <div className="h-2.5 overflow-hidden rounded-full bg-[var(--surface-muted)]">
                  <div
                    className={`h-full rounded-full ${row.color}`}
                    style={{ width: `${widthPct}%` }}
                  />
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </Card>
  );
}

export function ClientFinanceBars({
  totalRevenue,
  outstandingAmount,
  currencyLabel,
}: {
  totalRevenue: number;
  outstandingAmount: number;
  currencyLabel: (value: number) => string;
}) {
  const maxValue = Math.max(totalRevenue, outstandingAmount, 1);
  const rows = [
    {
      id: 'revenue',
      label: 'Paid revenue',
      value: totalRevenue,
      color: 'bg-emerald-500',
    },
    {
      id: 'outstanding',
      label: 'Outstanding',
      value: outstandingAmount,
      color: 'bg-orange-500',
    },
  ];

  return (
    <Card className="h-full">
      <h2 className="text-sm font-semibold text-[var(--foreground)]">
        Finance snapshot
      </h2>
      <p className="mt-0.5 text-xs text-[var(--muted)]">
        Paid vs open balance for this organization
      </p>
      <div className="mt-5 space-y-4">
        {rows.map((row) => {
          const widthPct = Math.max(4, (row.value / maxValue) * 100);
          return (
            <div key={row.id} className="space-y-1.5">
              <div className="flex items-center justify-between gap-3 text-xs">
                <span className="inline-flex items-center gap-2 text-[var(--muted)]">
                  <span className={`h-2 w-2 rounded-full ${row.color}`} />
                  {row.label}
                </span>
                <span className="font-semibold tabular-nums text-[var(--foreground)]">
                  {currencyLabel(row.value)}
                </span>
              </div>
              <div className="h-3 overflow-hidden rounded-full bg-[var(--surface-muted)]">
                <div
                  className={`h-full rounded-full ${row.color}`}
                  style={{ width: `${widthPct}%` }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </Card>
  );
}
