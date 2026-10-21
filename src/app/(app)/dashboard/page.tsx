'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import {
  CheckCircle2,
  ClipboardList,
  Clock,
  MessageSquare,
  ShieldCheck,
  SlidersHorizontal,
} from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { apiRequest } from '@/lib/api-client';
import {
  ApiResponse,
  isProductionOnlyStaff,
  userHasPermission,
  userIsExternal,
} from '@/lib/auth';
import { ListSkeleton } from '@/components/ui/Skeleton';
import { EmptyState, ErrorState } from '@/components/ui/StatePanels';
import { useWorkspace } from '@/components/providers/WorkspaceProvider';
import { useNotifications } from '@/components/providers/NotificationProvider';
import { getRoleLabel } from '@/lib/navigation';
import {
  clientLifecycleStage,
  OrderLifecycleSummary,
  OrderSummary,
} from '@/lib/orders';
import { OrderKanbanBoard } from '@/components/orders/OrderKanbanBoard';
import { DashboardMetricCard } from '@/components/dashboard/DashboardMetricCard';
import {
  buildWeekSeries,
  OrderStatusDonut,
  OrderWeekBars,
} from '@/components/dashboard/OrderStatusCharts';
import { RecentActivityPanel } from '@/components/dashboard/RecentActivityPanel';
import { RecentMessagesPanel } from '@/components/dashboard/RecentMessagesPanel';
import { RecentOrdersTable } from '@/components/dashboard/RecentOrdersTable';
import { StatCard } from '@/components/ui/StatCard';

function boardStage(code: string | null | undefined) {
  if (!code || code === 'cancelled' || code === 'delivered' || code === 'completed') {
    return null;
  }
  if (code === 'new_order' || code === 'on_hold') return 'order_received' as const;
  const stage = clientLifecycleStage(code);
  if (
    stage === 'order_received' ||
    stage === 'in_progress' ||
    stage === 'quality_check' ||
    stage === 'ready_for_delivery'
  ) {
    return stage;
  }
  return null;
}

export default function DashboardPage() {
  const { user, refreshKey } = useWorkspace();
  const { notifications } = useNotifications();
  const [orders, setOrders] = useState<OrderSummary[]>([]);
  const [clientOrders, setClientOrders] = useState<OrderSummary[]>([]);
  const [lifecycle, setLifecycle] = useState<OrderLifecycleSummary | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const isExternal = userIsExternal(user);
  const hideClientIdentity = isProductionOnlyStaff(user?.roleCodes);
  const roleLabel = getRoleLabel(user.userType, user.roleCodes);
  const canViewOrders = userHasPermission(user, 'orders.view');
  const canManageOrders = userHasPermission(user, 'orders.manage');
  const firstName = user.fullName.split(' ')[0] || user.fullName;

  useEffect(() => {
    setIsLoading(true);
    setErrorMessage(null);

    const tasks: Promise<void>[] = [];

    if (isExternal && canViewOrders) {
      tasks.push(
        apiRequest<ApiResponse<OrderLifecycleSummary>>('/orders/lifecycle-summary')
          .then((response) => setLifecycle(response.data))
          .catch(() => setLifecycle(null)),
      );
      tasks.push(
        apiRequest<ApiResponse<{ items: OrderSummary[] }>>('/orders?pageSize=8')
          .then((response) => setClientOrders(response.data.items))
          .catch((error: Error) => {
            setClientOrders([]);
            setErrorMessage(error.message);
          }),
      );
    }

    if (!isExternal && canViewOrders) {
      tasks.push(
        apiRequest<ApiResponse<{ items: OrderSummary[] }>>(
          '/orders?pageSize=100&listScope=active',
        )
          .then((response) => setOrders(response.data.items))
          .catch((error: Error) => {
            setOrders([]);
            setErrorMessage(error.message);
          }),
      );
    }

    if (tasks.length === 0) {
      setIsLoading(false);
      return;
    }

    Promise.all(tasks).finally(() => setIsLoading(false));
  }, [refreshKey, isExternal, canViewOrders]);

  const activeOrders = useMemo(
    () => orders.filter((order) => !order.historySavedAt),
    [orders],
  );

  const stageCounts = useMemo(() => {
    const counts = {
      order_received: 0,
      in_progress: 0,
      quality_check: 0,
      ready_for_delivery: 0,
    };
    for (const order of activeOrders) {
      const stage = boardStage(order.workflowStatus?.code);
      if (stage) counts[stage] += 1;
    }
    return counts;
  }, [activeOrders]);

  const totalActive =
    stageCounts.order_received +
    stageCounts.in_progress +
    stageCounts.quality_check +
    stageCounts.ready_for_delivery;

  const weekSeries = useMemo(
    () =>
      buildWeekSeries(
        activeOrders.map((order) => ({
          dueDate: order.dueDate,
          stage: boardStage(order.workflowStatus?.code),
        })),
      ),
    [activeOrders],
  );

  const donutStages = [
    {
      id: 'pending',
      label: 'Pending',
      count: stageCounts.order_received,
      color: '#f97316',
    },
    {
      id: 'progress',
      label: 'In progress',
      count: stageCounts.in_progress,
      color: '#3b82f6',
    },
    {
      id: 'qc',
      label: 'Quality check',
      count: stageCounts.quality_check,
      color: '#8b5cf6',
    },
    {
      id: 'ready',
      label: 'Ready',
      count: stageCounts.ready_for_delivery,
      color: '#10b981',
    },
  ];

  const messageNotifications = useMemo(
    () =>
      notifications.filter(
        (item) =>
          item.type.startsWith('message.') || item.type === 'channel.invite',
      ),
    [notifications],
  );

  const today = new Intl.DateTimeFormat('en-GB', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(new Date());

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-xl font-semibold tracking-tight text-[var(--foreground)] sm:text-2xl">
            Welcome back, {firstName}
          </h1>
          <p className="mt-1 text-sm text-[var(--muted)]">
            Here&apos;s what&apos;s happening in your workspace today · {roleLabel}
          </p>
        </div>
        <div className="inline-flex items-center rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-sm text-[var(--muted)] shadow-[var(--shadow-sm)]">
          {today}
        </div>
      </div>

      {user.mustChangePassword ? (
        <Card className="border-[var(--warning)]/40 bg-[var(--warning)]/10">
          <p className="text-sm font-medium text-[var(--foreground)]">
            Password change required
          </p>
          <p className="mt-1 text-sm text-[var(--muted)]">
            You signed in with a temporary password. Choose a new password before
            continuing.
          </p>
          <Link
            href="/account/password"
            className="mt-3 inline-block text-sm font-medium text-[var(--primary)]"
          >
            Change password
          </Link>
        </Card>
      ) : null}

      {isLoading ? <ListSkeleton rows={5} /> : null}

      {!isLoading && errorMessage ? (
        <ErrorState title="Unable to load dashboard" description={errorMessage} />
      ) : null}

      {!isLoading && !errorMessage && isExternal ? (
        <ClientPortal
          newOrders={lifecycle?.newOrders ?? 0}
          revisionOrders={lifecycle?.revisionOrders ?? 0}
          activeOrders={
            lifecycle?.activeOrders ??
            clientOrders.filter(
              (order) =>
                !['completed', 'cancelled', 'delivered'].includes(order.status),
            ).length
          }
          recentOrders={clientOrders}
        />
      ) : null}

      {!isLoading && !errorMessage && !isExternal ? (
        <div className="space-y-6">
          {canViewOrders ? (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
              <DashboardMetricCard
                label="Total orders"
                value={totalActive}
                icon={ClipboardList}
                tone="blue"
              />
              <DashboardMetricCard
                label="Pending orders"
                value={stageCounts.order_received}
                icon={Clock}
                tone="orange"
              />
              <DashboardMetricCard
                label="In progress"
                value={stageCounts.in_progress}
                icon={SlidersHorizontal}
                tone="purple"
              />
              <DashboardMetricCard
                label="For quality check"
                value={stageCounts.quality_check}
                icon={ShieldCheck}
                tone="pink"
              />
              <DashboardMetricCard
                label="Ready for delivery"
                value={stageCounts.ready_for_delivery}
                icon={CheckCircle2}
                tone="green"
              />
            </div>
          ) : (
            <Card>
              <p className="text-sm text-[var(--muted)]">
                Order metrics are hidden for your role. Use Messages or your assigned
                work areas from the sidebar.
              </p>
              <Link
                href="/chat"
                className="mt-3 inline-flex items-center gap-2 text-sm font-medium text-[var(--primary)]"
              >
                <MessageSquare className="h-4 w-4" />
                Open messages
              </Link>
            </Card>
          )}

          {canManageOrders ? <OrderKanbanBoard refreshKey={refreshKey} /> : null}

          {canViewOrders ? (
            <div className="grid gap-4 xl:grid-cols-3">
              <OrderWeekBars series={weekSeries} />
              <OrderStatusDonut stages={donutStages} />
              <RecentActivityPanel items={notifications} />
            </div>
          ) : (
            <div className="grid gap-4 lg:grid-cols-2">
              <RecentActivityPanel items={notifications} />
              <RecentMessagesPanel items={messageNotifications} />
            </div>
          )}

          {canViewOrders ? (
            <div className="grid gap-4 xl:grid-cols-[1.4fr_0.85fr]">
              <RecentOrdersTable
                orders={activeOrders}
                hideClientIdentity={hideClientIdentity}
              />
              <RecentMessagesPanel items={messageNotifications} />
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

function ClientPortal({
  newOrders,
  revisionOrders,
  activeOrders,
  recentOrders,
}: {
  newOrders: number;
  revisionOrders: number;
  activeOrders: number;
  recentOrders: OrderSummary[];
}) {
  return (
    <div className="space-y-6">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 sm:gap-4">
        <StatCard
          label="New orders"
          value={String(newOrders)}
          trend="Original requests"
          trendDirection="up"
          icon={ClipboardList}
        />
        <StatCard
          label="Revisions"
          value={String(revisionOrders)}
          trend="Follow-up orders"
          trendDirection="up"
          icon={ClipboardList}
        />
        <StatCard
          label="Active orders"
          value={String(activeOrders)}
          trend="Not in history"
          trendDirection="up"
          icon={ClipboardList}
        />
      </div>

      <Card>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-base font-semibold text-[var(--foreground)]">
            Recent orders
          </h2>
          <Link
            href="/orders"
            className="text-sm font-medium text-[var(--primary)]"
          >
            View all
          </Link>
        </div>
        {recentOrders.length === 0 ? (
          <EmptyState
            title="No orders yet"
            description="When your studio creates a job for you, it will show up here."
          />
        ) : (
          <div className="space-y-2">
            {recentOrders.slice(0, 6).map((order) => (
              <Link
                key={order.id}
                href={`/orders/${order.id}`}
                className="block rounded-[var(--radius-md)] border border-[var(--border)] px-3 py-2 hover:bg-[var(--surface-muted)]"
              >
                <p className="text-sm font-medium text-[var(--foreground)]">
                  {order.name}
                </p>
                <p className="text-xs text-[var(--muted)]">{order.code}</p>
              </Link>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}
