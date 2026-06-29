'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  AlertTriangle,
  BadgeCheck,
  Brush,
  CreditCard,
  FileText,
  Package,
  ShieldCheck,
} from 'lucide-react';
import { PageHeader } from '@/components/ui/PageHeader';
import { StatCard } from '@/components/ui/StatCard';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { apiRequest } from '@/lib/api-client';
import { ApiResponse, userHasPermission, userIsExternal } from '@/lib/auth';
import { ListSkeleton } from '@/components/ui/Skeleton';
import { useWorkspace } from '@/components/providers/WorkspaceProvider';
import { getRoleLabel } from '@/lib/navigation';
import { humanize } from '@/lib/production';

interface DashboardMetrics {
  batchesByStatus: Record<string, number>;
  assetsByStatus: Record<string, number>;
  totals: {
    batches: number;
    assets: number;
    assetsInQa: number;
    overdueAssets: number;
    pendingApprovals: number;
    outstandingInvoices: number;
    myAssignedAssets: number;
    myLoggedMinutes: number;
  };
}

export default function DashboardPage() {
  const { user, refreshKey } = useWorkspace();
  const [metrics, setMetrics] = useState<DashboardMetrics | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    setIsLoading(true);
    apiRequest<ApiResponse<DashboardMetrics>>('/production/dashboard')
      .then((response) => setMetrics(response.data))
      .finally(() => setIsLoading(false));
  }, [refreshKey]);

  const isExternal = userIsExternal(user);
  const roleLabel = getRoleLabel(user.userType, user.roleCodes);
  const isEditor = userHasPermission(user, 'assets.manage');
  const isQa = userHasPermission(user, 'qa.review');
  const isManager = userHasPermission(user, 'batches.manage');

  const today = new Intl.DateTimeFormat('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  }).format(new Date());

  const totals = metrics?.totals;

  return (
    <div className="space-y-6">
      <PageHeader
        title={`Welcome, ${user.fullName.split(' ')[0]}`}
        description={`${today} · ${roleLabel} workspace`}
      />

      {isLoading ? <ListSkeleton rows={4} /> : null}

      {!isLoading && isExternal ? (
        <ClientPortal
          totals={totals}
          deliveredCount={metrics?.assetsByStatus?.delivered ?? 0}
        />
      ) : null}

      {!isLoading && !isExternal ? (
        <div className="space-y-6">
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <StatCard
              label="Active Batches"
              value={String(totals?.batches ?? 0)}
              trend="Live"
              trendDirection="up"
              icon={Package}
            />
            <StatCard
              label="Awaiting QA"
              value={String(totals?.assetsInQa ?? 0)}
              trend="Queue"
              trendDirection="up"
              icon={ShieldCheck}
            />
            <StatCard
              label="Overdue Assets"
              value={String(totals?.overdueAssets ?? 0)}
              trend={totals && totals.overdueAssets > 0 ? 'Action' : 'Clear'}
              trendDirection={
                totals && totals.overdueAssets > 0 ? 'down' : 'up'
              }
              icon={AlertTriangle}
            />
            <StatCard
              label="Pending Approvals"
              value={String(totals?.pendingApprovals ?? 0)}
              trend="Client"
              trendDirection="up"
              icon={BadgeCheck}
            />
          </div>

          <div className="grid gap-6 xl:grid-cols-[1fr_1fr]">
            {isEditor ? (
              <QuickPanel
                title="Editor workspace"
                icon={<Brush className="h-4 w-4" />}
                value={totals?.myAssignedAssets ?? 0}
                valueLabel="assets assigned to you"
                href="/my-work"
                cta="Open My Work"
              />
            ) : null}

            {isQa ? (
              <QuickPanel
                title="QA review queue"
                icon={<ShieldCheck className="h-4 w-4" />}
                value={totals?.assetsInQa ?? 0}
                valueLabel="assets awaiting review"
                href="/qa"
                cta="Open QA queue"
              />
            ) : null}

            {isManager ? (
              <Card>
                <h2 className="text-base font-semibold text-[var(--foreground)]">
                  Pipeline by status
                </h2>
                <div className="mt-3 flex flex-wrap gap-2">
                  {Object.entries(metrics?.batchesByStatus ?? {}).map(
                    ([status, count]) => (
                      <Badge key={status} variant="neutral" className="capitalize">
                        {humanize(status)}: {count}
                      </Badge>
                    ),
                  )}
                  {Object.keys(metrics?.batchesByStatus ?? {}).length === 0 ? (
                    <p className="text-sm text-[var(--muted)]">
                      No batches yet.
                    </p>
                  ) : null}
                </div>
                <Link
                  href="/production"
                  className="mt-4 inline-block text-sm font-medium text-[var(--primary)]"
                >
                  Manage production
                </Link>
              </Card>
            ) : null}

            {isManager ? (
              <QuickPanel
                title="Finance"
                icon={<CreditCard className="h-4 w-4" />}
                value={totals?.outstandingInvoices ?? 0}
                valueLabel="outstanding invoices"
                href="/finance"
                cta="Open Finance"
              />
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
  value: number;
  valueLabel: string;
  href: string;
  cta: string;
}) {
  return (
    <Card>
      <div className="flex items-center gap-2 text-[var(--foreground)]">
        {icon}
        <h2 className="text-base font-semibold">{title}</h2>
      </div>
      <p className="mt-3 text-3xl font-semibold text-[var(--foreground)]">
        {value}
      </p>
      <p className="text-sm text-[var(--muted)]">{valueLabel}</p>
      <Link
        href={href}
        className="mt-4 inline-block text-sm font-medium text-[var(--primary)]"
      >
        {cta}
      </Link>
    </Card>
  );
}

function ClientPortal({
  totals,
  deliveredCount,
}: {
  totals?: DashboardMetrics['totals'];
  deliveredCount: number;
}) {
  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard
          label="Awaiting Your Approval"
          value={String(totals?.pendingApprovals ?? 0)}
          trend="Review"
          trendDirection="up"
          icon={BadgeCheck}
        />
        <StatCard
          label="Outstanding Invoices"
          value={String(totals?.outstandingInvoices ?? 0)}
          trend="Billing"
          trendDirection="up"
          icon={FileText}
        />
        <StatCard
          label="Deliverables"
          value={String(deliveredCount)}
          trend="Files"
          trendDirection="up"
          icon={Package}
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <PortalLink href="/approvals" title="Approvals" icon={<BadgeCheck className="h-5 w-5" />} />
        <PortalLink href="/files" title="Deliverables" icon={<Package className="h-5 w-5" />} />
        <PortalLink href="/finance" title="Invoices" icon={<CreditCard className="h-5 w-5" />} />
        <PortalLink href="/chat" title="Messages" icon={<FileText className="h-5 w-5" />} />
      </div>
    </div>
  );
}

function PortalLink({
  href,
  title,
  icon,
}: {
  href: string;
  title: string;
  icon: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      className="flex items-center gap-3 rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--surface)] p-4 transition-colors hover:bg-[var(--surface-muted)]"
    >
      <span className="flex h-10 w-10 items-center justify-center rounded-[var(--radius-md)] bg-[var(--primary-soft)] text-[var(--primary)]">
        {icon}
      </span>
      <span className="text-sm font-medium text-[var(--foreground)]">
        {title}
      </span>
    </Link>
  );
}
