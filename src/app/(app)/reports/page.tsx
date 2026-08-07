'use client';

import { useEffect, useState } from 'react';
import {
  CheckCircle2,
  Clock,
  DollarSign,
  Package,
  ShieldCheck,
  Wallet,
} from 'lucide-react';
import { apiRequest } from '@/lib/api-client';
import { ApiResponse } from '@/lib/auth';
import { PageHeader } from '@/components/ui/PageHeader';
import { Card } from '@/components/ui/Card';
import { StatCard } from '@/components/ui/StatCard';
import { Badge } from '@/components/ui/Badge';
import { ListSkeleton } from '@/components/ui/Skeleton';
import { EmptyState, ErrorState } from '@/components/ui/StatePanels';

interface ReportsOverview {
  throughput: {
    windowDays: number;
    delivered: number;
    approved: number;
    inProgress: number;
  };
  productivity: Array<{
    userId: string;
    fullName: string;
    versionsSubmitted: number;
    loggedHours: number;
  }>;
  qaPassRate: {
    total: number;
    passed: number;
    passRate: number;
    byDecision: Record<string, number>;
  };
  revenue: {
    billed: number;
    collected: number;
    outstanding: number;
  };
}

function formatCurrency(value: number) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  }).format(value);
}

export default function ReportsPage() {
  const [data, setData] = useState<ReportsOverview | null>(null);
  const [productionDashboard, setProductionDashboard] = useState<{
    year: number;
    artistMonthPivot: Array<{
      artistName: string;
      months: Record<number, number>;
      total: number;
    }>;
    editorPerformance: Array<{
      fullName: string;
      ordersCompleted: number;
      imagesEdited: number;
      paymentEarned: number;
    }>;
    folderRollup: Array<{
      status: { name: string };
      orderCount: number;
      inFiles: number;
      outFiles: number;
      totalCost: number;
    }>;
  } | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([
      apiRequest<ApiResponse<ReportsOverview>>('/reports/overview'),
      apiRequest<ApiResponse<typeof productionDashboard>>(
        '/orders/production-dashboard',
      ).catch(() => ({ data: null })),
    ])
      .then(([overviewResponse, productionResponse]) => {
        setData(overviewResponse.data);
        setProductionDashboard(productionResponse.data);
      })
      .catch((error: Error) => setErrorMessage(error.message))
      .finally(() => setIsLoading(false));
  }, []);

  return (
    <div className="space-y-4">
      <PageHeader
        title="Reports & Analytics"
        description="Production throughput, editor productivity, QA pass rate, and revenue."
        breadcrumbs={[
          { label: 'Workspace', href: '/dashboard' },
          { label: 'Reports' },
        ]}
      />

      {isLoading ? <ListSkeleton rows={4} /> : null}
      {!isLoading && errorMessage ? (
        <ErrorState title="Unable to load reports" description={errorMessage} />
      ) : null}

      {!isLoading && !errorMessage && data ? (
        <div className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <StatCard
              icon={Package}
              label={`Delivered (${data.throughput.windowDays}d)`}
              value={String(data.throughput.delivered)}
            />
            <StatCard
              icon={CheckCircle2}
              label="Approved"
              value={String(data.throughput.approved)}
            />
            <StatCard
              icon={Clock}
              label="In progress"
              value={String(data.throughput.inProgress)}
            />
            <StatCard
              icon={ShieldCheck}
              label="QA pass rate"
              value={`${data.qaPassRate.passRate}%`}
            />
          </div>

          <div className="grid gap-4 lg:grid-cols-3">
            <StatCard
              icon={DollarSign}
              label="Billed"
              value={formatCurrency(data.revenue.billed)}
            />
            <StatCard
              icon={Wallet}
              label="Collected"
              value={formatCurrency(data.revenue.collected)}
            />
            <StatCard
              icon={DollarSign}
              label="Outstanding"
              value={formatCurrency(data.revenue.outstanding)}
            />
          </div>

          <Card>
            <h3 className="text-sm font-semibold text-[var(--foreground)]">
              QA decisions
            </h3>
            <div className="mt-3 flex flex-wrap gap-2">
              {Object.entries(data.qaPassRate.byDecision).length === 0 ? (
                <span className="text-sm text-[var(--muted)]">
                  No QA reviews yet.
                </span>
              ) : (
                Object.entries(data.qaPassRate.byDecision).map(
                  ([decision, count]) => (
                    <Badge
                      key={decision}
                      variant={decision === 'approved' ? 'success' : 'neutral'}
                      className="capitalize"
                    >
                      {decision.replaceAll('_', ' ')}: {count}
                    </Badge>
                  ),
                )
              )}
            </div>
          </Card>

          <Card padding="none" className="overflow-hidden">
            <div className="border-b border-[var(--border)] px-4 py-3">
              <h3 className="text-sm font-semibold text-[var(--foreground)]">
                Editor productivity
              </h3>
            </div>
            {data.productivity.length === 0 ? (
              <div className="p-4">
                <EmptyState
                  title="No activity yet"
                  description="Submitted versions and logged hours will appear here."
                />
              </div>
            ) : (
              <ul className="divide-y divide-[var(--border)]">
                {data.productivity.map((row) => (
                  <li
                    key={row.userId}
                    className="grid grid-cols-3 items-center px-4 py-3 text-sm"
                  >
                    <span className="font-medium text-[var(--foreground)]">
                      {row.fullName}
                    </span>
                    <span className="text-[var(--muted)]">
                      {row.versionsSubmitted} versions
                    </span>
                    <span className="text-right text-[var(--muted)]">
                      {row.loggedHours}h logged
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </Card>

          {productionDashboard ? (
            <>
              <Card padding="none" className="overflow-x-auto">
                <div className="border-b border-[var(--border)] px-4 py-3">
                  <h3 className="text-sm font-semibold text-[var(--foreground)]">
                    Artist cost pivot ({productionDashboard.year})
                  </h3>
                </div>
                <table className="min-w-full text-sm">
                  <thead>
                    <tr className="border-b border-[var(--border)] bg-[var(--surface-muted)]">
                      <th className="px-3 py-2 text-left">Artist</th>
                      {Array.from({ length: 12 }, (_, index) => (
                        <th key={index + 1} className="px-3 py-2 text-right">
                          {new Date(2026, index, 1).toLocaleString('en', {
                            month: 'short',
                          })}
                        </th>
                      ))}
                      <th className="px-3 py-2 text-right">Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {productionDashboard.artistMonthPivot.map((row) => (
                      <tr key={row.artistName} className="border-b border-[var(--border)]">
                        <td className="px-3 py-2">{row.artistName}</td>
                        {Array.from({ length: 12 }, (_, index) => (
                          <td key={index + 1} className="px-3 py-2 text-right">
                            {row.months[index + 1]
                              ? `₹${row.months[index + 1].toFixed(0)}`
                              : '—'}
                          </td>
                        ))}
                        <td className="px-3 py-2 text-right font-medium">
                          ₹{row.total.toFixed(0)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </Card>

              <Card padding="none" className="overflow-hidden">
                <div className="border-b border-[var(--border)] px-4 py-3">
                  <h3 className="text-sm font-semibold text-[var(--foreground)]">
                    Editor performance
                  </h3>
                </div>
                <ul className="divide-y divide-[var(--border)]">
                  {productionDashboard.editorPerformance.map((row) => (
                    <li
                      key={row.fullName}
                      className="grid grid-cols-4 px-4 py-3 text-sm"
                    >
                      <span className="font-medium">{row.fullName}</span>
                      <span>{row.ordersCompleted} orders</span>
                      <span>{row.imagesEdited} images</span>
                      <span className="text-right">₹{row.paymentEarned.toFixed(0)}</span>
                    </li>
                  ))}
                </ul>
              </Card>
            </>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
