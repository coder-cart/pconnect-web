'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  Building2,
  ClipboardList,
  MessageSquare,
} from 'lucide-react';
import { PageHeader } from '@/components/ui/PageHeader';
import { StatCard } from '@/components/ui/StatCard';
import { Card } from '@/components/ui/Card';
import { apiRequest } from '@/lib/api-client';
import { ApiResponse, userHasPermission, userIsExternal } from '@/lib/auth';
import { ListSkeleton } from '@/components/ui/Skeleton';
import { EmptyState, ErrorState } from '@/components/ui/StatePanels';
import { useWorkspace } from '@/components/providers/WorkspaceProvider';
import { getRoleLabel } from '@/lib/navigation';
import { OrderLifecycleSummary, OrderSummary } from '@/lib/orders';
import { OrderKanbanBoard } from '@/components/orders/OrderKanbanBoard';

interface DashboardMetrics {
  totals: {
    pendingApprovals: number;
    openOrders?: number;
  };
  ordersDueThisWeek?: Array<{
    id: string;
    code: string;
    name: string;
    dueDate?: string | null;
    status: string;
    clientOrganization?: { name: string } | null;
  }>;
}

export default function DashboardPage() {
  const { user, refreshKey } = useWorkspace();
  const [metrics, setMetrics] = useState<DashboardMetrics | null>(null);
  const [clientOrders, setClientOrders] = useState<OrderSummary[]>([]);
  const [lifecycle, setLifecycle] = useState<OrderLifecycleSummary | null>(null);
  const [clientOrgCount, setClientOrgCount] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const isExternal = userIsExternal(user);
  const roleLabel = getRoleLabel(user.userType, user.roleCodes);
  const canViewOrders = userHasPermission(user, 'orders.view');
  const canViewClients = userHasPermission(user, 'clients.view');
  const canManageOrders = userHasPermission(user, 'orders.manage');

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
    }

    if (isExternal && canViewOrders) {
      tasks.push(
        apiRequest<ApiResponse<{ items: OrderSummary[] }>>(
          '/orders?pageSize=8',
        )
          .then((response) => setClientOrders(response.data.items))
          .catch((error: Error) => {
            setClientOrders([]);
            setErrorMessage(error.message);
          }),
      );
    }

    tasks.push(
      apiRequest<ApiResponse<DashboardMetrics>>('/production/dashboard')
        .then((response) => setMetrics(response.data))
        .catch((error: Error) => {
          setMetrics(null);
          setErrorMessage(error.message);
        }),
    );

    if (!isExternal && canViewClients) {
      tasks.push(
        apiRequest<ApiResponse<unknown[]>>('/clients')
          .then((response) => setClientOrgCount(response.data.length))
          .catch(() => setClientOrgCount(null)),
      );
    }

    Promise.all(tasks).finally(() => setIsLoading(false));
  }, [refreshKey, isExternal, canViewOrders, canViewClients, canManageOrders]);

  const today = new Intl.DateTimeFormat('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  }).format(new Date());

  const totals = metrics?.totals;
  const openClientOrders = clientOrders.filter(
    (order) => !['completed', 'cancelled', 'delivered'].includes(order.status),
  ).length;
  const dueThisWeek = metrics?.ordersDueThisWeek ?? [];

  return (
    <div className="space-y-6">
      <PageHeader
        title={`Welcome, ${user.fullName.split(' ')[0]}`}
        description={`${today} · ${roleLabel} workspace`}
      />

      {user.mustChangePassword ? (
        <Card className="border-[var(--warning)]/40 bg-[var(--warning)]/10">
          <p className="text-sm font-medium text-[var(--foreground)]">
            Password change required
          </p>
          <p className="mt-1 text-sm text-[var(--muted)]">
            You signed in with a temporary password. Update it from your profile
            or use the forgot-password flow before continuing sensitive work.
          </p>
          <Link
            href="/reset-password"
            className="mt-3 inline-block text-sm font-medium text-[var(--primary)]"
          >
            Change password
          </Link>
        </Card>
      ) : null}

      {isLoading ? <ListSkeleton rows={4} /> : null}

      {!isLoading && errorMessage ? (
        <ErrorState
          title="Unable to load dashboard"
          description={errorMessage}
        />
      ) : null}

      {!isLoading && !errorMessage && isExternal ? (
        <ClientPortal
          newOrders={lifecycle?.newOrders ?? 0}
          revisionOrders={lifecycle?.revisionOrders ?? 0}
          activeOrders={lifecycle?.activeOrders ?? openClientOrders}
          recentOrders={clientOrders}
        />
      ) : null}

      {!isLoading && !errorMessage && !isExternal ? (
        <div className="space-y-6">
          {canManageOrders ? <OrderKanbanBoard refreshKey={refreshKey} /> : null}
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {canViewOrders ? (
              <StatCard
                label="Open Orders"
                value={String(totals?.openOrders ?? 0)}
                trend="Active"
                trendDirection="up"
                icon={ClipboardList}
              />
            ) : null}
            {canViewClients && clientOrgCount != null ? (
              <StatCard
                label="Client orgs"
                value={String(clientOrgCount)}
                trend="Onboarding"
                trendDirection="up"
                icon={Building2}
              />
            ) : null}
          </div>

          <div className="grid gap-6 xl:grid-cols-2">
            {canViewOrders ? (
              <QuickPanel
                title="Orders"
                icon={<ClipboardList className="h-4 w-4" />}
                value={totals?.openOrders ?? 0}
                valueLabel="open orders across the workspace"
                href="/orders"
                cta={canManageOrders ? 'Manage orders' : 'View orders'}
              />
            ) : null}

            {canViewClients ? (
              <QuickPanel
                title="Clients"
                icon={<Building2 className="h-4 w-4" />}
                valueLabel="Onboarding, services, and portal members"
                href="/clients"
                cta="Open clients"
              />
            ) : null}

            <QuickPanel
              title="Messages"
              icon={<MessageSquare className="h-4 w-4" />}
              valueLabel="Channels and client conversations"
              href="/chat"
              cta="Open messages"
            />

            {canViewOrders ? (
              <Card>
                <h2 className="text-base font-semibold text-[var(--foreground)]">
                  Due this week
                </h2>
                {dueThisWeek.length === 0 ? (
                  <p className="mt-3 text-sm text-[var(--muted)]">
                    No orders due in the next 7 days.
                  </p>
                ) : (
                  <div className="mt-3 space-y-2">
                    {dueThisWeek.map((order) => (
                      <Link
                        key={order.id}
                        href={`/orders/${order.id}`}
                        className="block rounded-[var(--radius-md)] border border-[var(--border)] px-3 py-2 hover:bg-[var(--surface-muted)]"
                      >
                        <p className="text-sm font-medium text-[var(--foreground)]">
                          {order.name}
                          <span className="text-[var(--muted)]">
                            {' '}
                            · {order.code}
                          </span>
                        </p>
                        <p className="text-xs text-[var(--muted)]">
                          {order.clientOrganization?.name ?? 'Internal'} ·{' '}
                          {order.dueDate
                            ? new Date(order.dueDate).toLocaleDateString()
                            : 'No due date'}
                        </p>
                      </Link>
                    ))}
                  </div>
                )}
              </Card>
            ) : null}
          </div>
        </div>
      ) : null}
    </div>
  );
}

function QuickPanel({
  title,
  icon,
  value,
  valueLabel,
  href,
  cta,
}: {
  title: string;
  icon: React.ReactNode;
  value?: number;
  valueLabel: string;
  href: string;
  cta: string;
}) {
  return (
    <Card>
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2 text-[var(--muted)]">
            {icon}
            <h2 className="text-base font-semibold text-[var(--foreground)]">
              {title}
            </h2>
          </div>
          <p className="mt-2 text-sm text-[var(--muted)]">
            {typeof value === 'number' ? (
              <>
                <span className="font-semibold text-[var(--foreground)]">
                  {value}
                </span>{' '}
                {valueLabel}
              </>
            ) : (
              valueLabel
            )}
          </p>
        </div>
        <Link
          href={href}
          className="text-sm font-medium text-[var(--primary)] hover:underline"
        >
          {cta}
        </Link>
      </div>
    </Card>
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
      <div className="grid gap-4 sm:grid-cols-3">
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
