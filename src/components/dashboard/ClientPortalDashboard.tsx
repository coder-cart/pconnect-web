'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import {
  ChevronRight,
  ClipboardList,
  Clock,
  RefreshCw,
  SlidersHorizontal,
} from 'lucide-react';
import { Badge } from '@/components/ui/Badge';
import { Card } from '@/components/ui/Card';
import { EmptyState } from '@/components/ui/StatePanels';
import { Select } from '@/components/ui/Select';
import { DashboardMetricCard } from '@/components/dashboard/DashboardMetricCard';
import {
  buildWeekSeries,
  OrderStatusDonut,
  OrderWeekBars,
  type StageCount,
} from '@/components/dashboard/OrderStatusCharts';
import {
  clientLifecycleStage,
  CLIENT_LIFECYCLE_LABELS,
  humanize,
  OrderSummary,
  orderPriorityVariant,
  orderStatusVariant,
  type ClientLifecycleStage,
} from '@/lib/orders';

const CLIENT_DONUT_COLORS: Record<ClientLifecycleStage, string> = {
  order_received: '#ea580c',
  in_progress: '#2563eb',
  quality_check: '#7c3aed',
  delivered: '#0891b2',
  completed: '#16a34a',
};

const DATE_PRESETS = [
  { value: 'all', label: 'All time' },
  { value: 'this_week', label: 'This week' },
  { value: 'this_month', label: 'This month' },
  { value: 'last_30', label: 'Last 30 days' },
  { value: 'custom', label: 'Custom range' },
] as const;

type DatePreset = (typeof DATE_PRESETS)[number]['value'];

function startOfDay(value: Date) {
  return new Date(value.getFullYear(), value.getMonth(), value.getDate());
}

function endOfDay(value: Date) {
  return new Date(
    value.getFullYear(),
    value.getMonth(),
    value.getDate(),
    23,
    59,
    59,
    999,
  );
}

function startOfWeek(value: Date) {
  const day = startOfDay(value);
  const weekday = (day.getDay() + 6) % 7;
  day.setDate(day.getDate() - weekday);
  return day;
}

function parseLocalDate(value?: string | null) {
  if (!value) return null;
  const dateOnly = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (dateOnly) {
    return new Date(
      Number(dateOnly[1]),
      Number(dateOnly[2]) - 1,
      Number(dateOnly[3]),
    );
  }
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return null;
  return parsed;
}

function orderAnchorDate(order: OrderSummary) {
  return (
    parseLocalDate(order.dueDate) ??
    parseLocalDate(order.inDate) ??
    parseLocalDate(order.createdAt)
  );
}

function resolveRange(
  preset: DatePreset,
  customFrom: string,
  customTo: string,
): { start: Date | null; end: Date | null } {
  const now = new Date();

  switch (preset) {
    case 'all':
      return { start: null, end: null };
    case 'this_week': {
      const start = startOfWeek(now);
      const end = new Date(start);
      end.setDate(end.getDate() + 6);
      return { start, end: endOfDay(end) };
    }
    case 'this_month':
      return {
        start: new Date(now.getFullYear(), now.getMonth(), 1),
        end: endOfDay(now),
      };
    case 'last_30': {
      const start = startOfDay(now);
      start.setDate(start.getDate() - 29);
      return { start, end: endOfDay(now) };
    }
    case 'custom': {
      const start = customFrom ? startOfDay(new Date(customFrom)) : null;
      const end = customTo ? endOfDay(new Date(customTo)) : null;
      return { start, end };
    }
    default: {
      const _exhaustive: never = preset;
      return _exhaustive;
    }
  }
}

function boardStage(code: string | null | undefined) {
  if (!code || code === 'cancelled' || code === 'completed') {
    return null;
  }
  if (code === 'delivered') return 'delivered' as const;
  if (code === 'new_order' || code === 'on_hold') return 'order_received' as const;
  const stage = clientLifecycleStage(code);
  if (
    stage === 'order_received' ||
    stage === 'in_progress' ||
    stage === 'quality_check' ||
    stage === 'delivered'
  ) {
    return stage;
  }
  return null;
}

function isActiveOrder(order: OrderSummary) {
  return (
    !order.historySavedAt &&
    !['completed', 'cancelled', 'delivered'].includes(order.status)
  );
}

function isRevisionOrder(order: OrderSummary) {
  return Boolean(
    order.hasOpenClientRevision ||
      (order.clientRevisionCount && order.clientRevisionCount > 0) ||
      (order.revisionCount && order.revisionCount > 0) ||
      order.parentOrderId,
  );
}

function formatDue(value?: string | null) {
  if (!value) return 'No due date';
  return new Date(value).toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

export function ClientPortalDashboard({
  orders,
}: {
  orders: OrderSummary[];
}) {
  const [datePreset, setDatePreset] = useState<DatePreset>('all');
  const [customFrom, setCustomFrom] = useState('');
  const [customTo, setCustomTo] = useState('');

  const range = useMemo(
    () => resolveRange(datePreset, customFrom, customTo),
    [datePreset, customFrom, customTo],
  );

  const filteredOrders = useMemo(() => {
    if (!range.start && !range.end) return orders;
    return orders.filter((order) => {
      const anchor = orderAnchorDate(order);
      if (!anchor) return false;
      if (range.start && anchor < range.start) return false;
      if (range.end && anchor > range.end) return false;
      return true;
    });
  }, [orders, range.end, range.start]);

  const metrics = useMemo(() => {
    const active = filteredOrders.filter(isActiveOrder);
    const revisions = active.filter(isRevisionOrder);
    return {
      newOrders: Math.max(0, active.length - revisions.length),
      revisionOrders: revisions.length,
      activeOrders: active.length,
    };
  }, [filteredOrders]);

  const donutStages: StageCount[] = useMemo(() => {
    const counts: Record<ClientLifecycleStage, number> = {
      order_received: 0,
      in_progress: 0,
      quality_check: 0,
      delivered: 0,
      completed: 0,
    };

    for (const order of filteredOrders) {
      if (!isActiveOrder(order) && order.status !== 'delivered') {
        if (order.status === 'completed') {
          counts.completed += 1;
        }
        continue;
      }
      const stage =
        clientLifecycleStage(order.workflowStatus?.code) ??
        (order.status === 'delivered' ? 'delivered' : null);
      if (!stage) continue;
      counts[stage] += 1;
    }

    return (Object.keys(counts) as ClientLifecycleStage[]).map((stage) => ({
      id: stage,
      label: CLIENT_LIFECYCLE_LABELS[stage],
      count: counts[stage],
      color: CLIENT_DONUT_COLORS[stage],
    }));
  }, [filteredOrders]);

  const weekSeries = useMemo(
    () =>
      buildWeekSeries(
        filteredOrders.map((order) => ({
          dueDate: order.dueDate,
          stage: boardStage(order.workflowStatus?.code),
        })),
      ),
    [filteredOrders],
  );

  const listOrders = filteredOrders.slice(0, 8);
  const rangeLabel =
    datePreset === 'all'
      ? 'All orders'
      : DATE_PRESETS.find((item) => item.value === datePreset)?.label ??
        'Selected range';

  return (
    <div className="space-y-5">
      <Card padding="sm">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
          <div className="min-w-0">
            <p className="text-sm font-semibold text-[var(--foreground)]">
              Dashboard filter
            </p>
            <p className="mt-0.5 text-xs text-[var(--muted)]">
              Filter KPIs, charts, and recent orders by due / intake date ·{' '}
              {filteredOrders.length} order
              {filteredOrders.length === 1 ? '' : 's'} in view
            </p>
          </div>
          <div className="flex w-full flex-col gap-2 sm:flex-row sm:items-end lg:w-auto">
            <div className="min-w-[11rem] sm:w-44">
              <Select
                aria-label="Date range"
                value={datePreset}
                onChange={(event) =>
                  setDatePreset(event.target.value as DatePreset)
                }
                options={DATE_PRESETS.map((item) => ({
                  value: item.value,
                  label: item.label,
                }))}
                className="h-10"
              />
            </div>
            {datePreset === 'custom' ? (
              <div className="flex flex-1 flex-col gap-2 sm:flex-row">
                <label className="block min-w-0 flex-1 space-y-1">
                  <span className="text-xs font-medium text-[var(--muted)]">
                    From
                  </span>
                  <input
                    type="date"
                    value={customFrom}
                    onChange={(event) => setCustomFrom(event.target.value)}
                    className="h-10 w-full rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--surface)] px-3 text-sm text-[var(--foreground)] focus:border-[var(--primary)] focus:outline-none focus:ring-2 focus:ring-[var(--primary-soft)]"
                  />
                </label>
                <label className="block min-w-0 flex-1 space-y-1">
                  <span className="text-xs font-medium text-[var(--muted)]">
                    To
                  </span>
                  <input
                    type="date"
                    value={customTo}
                    onChange={(event) => setCustomTo(event.target.value)}
                    className="h-10 w-full rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--surface)] px-3 text-sm text-[var(--foreground)] focus:border-[var(--primary)] focus:outline-none focus:ring-2 focus:ring-[var(--primary-soft)]"
                  />
                </label>
              </div>
            ) : null}
          </div>
        </div>
      </Card>

      <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-3 sm:gap-3">
        <DashboardMetricCard
          label="New orders"
          value={metrics.newOrders}
          icon={ClipboardList}
          tone="blue"
        />
        <DashboardMetricCard
          label="Revisions"
          value={metrics.revisionOrders}
          icon={RefreshCw}
          tone="orange"
        />
        <DashboardMetricCard
          label="Active orders"
          value={metrics.activeOrders}
          icon={SlidersHorizontal}
          tone="purple"
        />
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        <OrderStatusDonut
          stages={donutStages}
          title="Orders by stage"
          description={`Where jobs sit · ${rangeLabel}`}
        />
        <OrderWeekBars series={weekSeries} />
      </div>

      <Card padding="none" className="overflow-hidden">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[var(--border)] px-4 py-3">
          <div>
            <h2 className="text-sm font-semibold text-[var(--foreground)]">
              Recent orders
            </h2>
            <p className="text-xs text-[var(--muted)]">
              {rangeLabel} · showing {listOrders.length} of{' '}
              {filteredOrders.length}
            </p>
          </div>
          <Link
            href="/orders"
            className="inline-flex items-center gap-1 text-xs font-medium text-[var(--primary)] hover:underline"
          >
            View all
            <ChevronRight className="h-3.5 w-3.5" />
          </Link>
        </div>

        {listOrders.length === 0 ? (
          <div className="px-4 py-8">
            <EmptyState
              title={orders.length === 0 ? 'No orders yet' : 'No orders in range'}
              description={
                orders.length === 0
                  ? 'When your studio creates a job for you, it will show up here.'
                  : 'Try another date range to see matching orders.'
              }
            />
          </div>
        ) : (
          <>
            <ul className="divide-y divide-[var(--border)] md:hidden">
              {listOrders.map((order) => (
                <li key={order.id}>
                  <Link
                    href={`/orders/${order.id}`}
                    className="block px-4 py-3 transition-colors hover:bg-[var(--surface-muted)]/70"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold text-[var(--foreground)]">
                          {order.name}
                        </p>
                        <p className="mt-0.5 text-xs text-[var(--muted)]">
                          {order.code}
                          {order.imageCount
                            ? ` · ${order.imageCount} image${order.imageCount === 1 ? '' : 's'}`
                            : ''}
                        </p>
                      </div>
                      <Badge variant={orderStatusVariant(order.status)}>
                        {order.workflowStatus?.name ?? humanize(order.status)}
                      </Badge>
                    </div>
                    <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-[var(--muted)]">
                      <span className="inline-flex items-center gap-1">
                        <Clock className="h-3.5 w-3.5" />
                        {formatDue(order.dueDate)}
                      </span>
                      <Badge variant={orderPriorityVariant(order.priority)}>
                        {humanize(order.priority)}
                      </Badge>
                    </div>
                  </Link>
                </li>
              ))}
            </ul>

            <div className="hidden max-w-full overflow-x-auto md:block">
              <table className="min-w-full text-left text-sm">
                <thead className="bg-[var(--surface-muted)]/80 text-xs uppercase tracking-wide text-[var(--muted)]">
                  <tr>
                    <th className="px-4 py-2.5 font-medium">Order</th>
                    <th className="px-4 py-2.5 font-medium">Images</th>
                    <th className="px-4 py-2.5 font-medium">Status</th>
                    <th className="px-4 py-2.5 font-medium">Priority</th>
                    <th className="px-4 py-2.5 font-medium">Due</th>
                  </tr>
                </thead>
                <tbody>
                  {listOrders.map((order) => (
                    <tr
                      key={order.id}
                      className="border-t border-[var(--border)] transition-colors hover:bg-[var(--surface-muted)]/50"
                    >
                      <td className="px-4 py-3">
                        <Link
                          href={`/orders/${order.id}`}
                          className="font-medium text-[var(--foreground)] hover:text-[var(--primary)]"
                        >
                          {order.code}
                        </Link>
                        <p className="mt-0.5 max-w-[18rem] truncate text-xs text-[var(--muted)]">
                          {order.name}
                        </p>
                      </td>
                      <td className="px-4 py-3 tabular-nums text-[var(--muted)]">
                        {order.imageCount}
                      </td>
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
                        {formatDue(order.dueDate)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </Card>
    </div>
  );
}
