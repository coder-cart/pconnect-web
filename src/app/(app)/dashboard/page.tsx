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
import { ErrorState } from '@/components/ui/StatePanels';
import { useWorkspace } from '@/components/providers/WorkspaceProvider';
import { useNotifications } from '@/components/providers/NotificationProvider';
import { getRoleLabel } from '@/lib/navigation';
import {
  clientLifecycleStage,
  OrderSummary,
} from '@/lib/orders';
import { DashboardMetricCard } from '@/components/dashboard/DashboardMetricCard';
import { ClientPortalDashboard } from '@/components/dashboard/ClientPortalDashboard';
import {
  buildWeekSeries,
  OrderStatusDonut,
  OrderWeekBars,
} from '@/components/dashboard/OrderStatusCharts';
import { RecentActivityPanel } from '@/components/dashboard/RecentActivityPanel';
import { RecentMessagesPanel } from '@/components/dashboard/RecentMessagesPanel';
import { RecentOrdersTable } from '@/components/dashboard/RecentOrdersTable';

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

export default function DashboardPage() {
  const { user, refreshKey } = useWorkspace();
  const { notifications } = useNotifications();
  const [orders, setOrders] = useState<OrderSummary[]>([]);
  const [clientOrders, setClientOrders] = useState<OrderSummary[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const isExternal = userIsExternal(user);
  const hideClientIdentity = isProductionOnlyStaff(user?.roleCodes);
  const roleLabel = getRoleLabel(user.userType, user.roleCodes);
  const canViewOrders = userHasPermission(user, 'orders.view');
  const firstName = user.fullName.split(' ')[0] || user.fullName;

  useEffect(() => {
    setIsLoading(true);
    setErrorMessage(null);

    const tasks: Promise<void>[] = [];

    if (isExternal && canViewOrders) {
      tasks.push(
        apiRequest<ApiResponse<{ items: OrderSummary[] }>>(
          '/orders?pageSize=100',
        )
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
          '/orders?pageSize=100&listScope=board',
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
      delivered: 0,
    };
    for (const order of activeOrders) {
      const stage = boardStage(order.workflowStatus?.code);
      if (!stage || stage === 'delivered') {
        if (stage === 'delivered') counts.delivered += 1;
        continue;
      }
      counts[stage] += 1;
    }
    return counts;
  }, [activeOrders]);

  const totalActive = useMemo(
    () =>
      stageCounts.order_received +
      stageCounts.in_progress +
      stageCounts.quality_check +
      stageCounts.delivered,
    [stageCounts],
  );

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
      id: 'delivered',
      label: 'Delivered',
      count: stageCounts.delivered,
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
          <h1 className="break-words text-xl font-semibold tracking-tight text-[var(--foreground)] sm:text-2xl">
            Welcome back, {firstName}
          </h1>
          <p className="mt-1 text-sm text-[var(--muted)]">
            Here&apos;s what&apos;s happening in your workspace today · {roleLabel}
          </p>
        </div>
        <div className="inline-flex max-w-full items-center rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-xs text-[var(--muted)] shadow-[var(--shadow-sm)] sm:text-sm">
          <span className="break-words">{today}</span>
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
        canViewOrders ? (
          <ClientPortalDashboard orders={clientOrders} />
        ) : (
          <Card>
            <p className="text-sm text-[var(--muted)]">
              Order metrics are hidden for your access level. Use Messages from the
              sidebar to stay in touch with your studio.
            </p>
            <Link
              href="/chat"
              className="mt-3 inline-flex items-center gap-2 text-sm font-medium text-[var(--primary)]"
            >
              <MessageSquare className="h-4 w-4" />
              Open messages
            </Link>
          </Card>
        )
      ) : null}

      {!isLoading && !errorMessage && !isExternal ? (
        <div className="space-y-6">
          {canViewOrders ? (
            <div className="grid grid-cols-2 gap-2 sm:gap-3 lg:grid-cols-3 xl:grid-cols-5">
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
                label="QA"
                value={stageCounts.quality_check}
                icon={ShieldCheck}
                tone="pink"
              />
              <DashboardMetricCard
                label="Delivered"
                value={stageCounts.delivered}
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
            <div className="grid min-w-0 gap-4 xl:grid-cols-[1.4fr_0.85fr]">
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
