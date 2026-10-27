'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { apiRequest } from '@/lib/api-client';
import { ApiResponse } from '@/lib/auth';
import { PageHeader } from '@/components/ui/PageHeader';
import { Card } from '@/components/ui/Card';
import { ListSkeleton } from '@/components/ui/Skeleton';
import { EmptyState, ErrorState } from '@/components/ui/StatePanels';
import { useWorkspace } from '@/components/providers/WorkspaceProvider';

interface WorkloadItem {
  user: { id: string; fullName: string; email: string; userType: string };
  pending: number;
  inProgress: number;
  overdue: number;
  completed: number;
  upcomingEvents: number;
}

export default function WorkloadPage() {
  const { refreshKey } = useWorkspace();
  const [items, setItems] = useState<WorkloadItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    void Promise.resolve().then(async () => {
      if (cancelled) return;
      setIsLoading(true);
      setErrorMessage(null);
      try {
        const response = await apiRequest<
          ApiResponse<{ items: WorkloadItem[] }>
        >('/workload/summary');
        if (!cancelled) setItems(response.data.items);
      } catch (error) {
        if (!cancelled) setErrorMessage((error as Error).message);
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [refreshKey]);

  return (
    <div className="space-y-4">
      <PageHeader
        title="Team workload"
        description="Assignment overview only — counts do not mean availability."
        breadcrumbs={[
          { label: 'Workspace', href: '/dashboard' },
          { label: 'Workload' },
        ]}
      />

      {isLoading ? <ListSkeleton rows={5} /> : null}
      {!isLoading && errorMessage ? (
        <ErrorState title="Unable to load workload" description={errorMessage} />
      ) : null}
      {!isLoading && !errorMessage && items.length === 0 ? (
        <EmptyState
          title="No teammates found"
          description="Workload appears once users are assigned tasks or events."
        />
      ) : null}

      {!isLoading && !errorMessage && items.length > 0 ? (
        <Card padding="none" className="overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead className="border-b border-[var(--border)] bg-[var(--surface-muted)] text-xs uppercase tracking-wide text-[var(--muted)]">
              <tr>
                <th className="px-4 py-3 font-semibold">Person</th>
                <th className="px-4 py-3 font-semibold">Pending</th>
                <th className="px-4 py-3 font-semibold">In progress</th>
                <th className="px-4 py-3 font-semibold">Overdue</th>
                <th className="px-4 py-3 font-semibold">Completed</th>
                <th className="px-4 py-3 font-semibold">Upcoming events</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--border)]">
              {items.map((item) => (
                <tr key={item.user.id}>
                  <td className="px-4 py-3">
                    <p className="font-medium text-[var(--foreground)]">
                      {item.user.fullName}
                    </p>
                    <p className="text-xs text-[var(--muted)]">
                      {item.user.userType}
                    </p>
                  </td>
                  <td className="px-4 py-3">
                    <Link
                      href={`/tasks?scope=team`}
                      className="text-[var(--primary)] hover:underline"
                    >
                      {item.pending}
                    </Link>
                  </td>
                  <td className="px-4 py-3">{item.inProgress}</td>
                  <td className="px-4 py-3 text-[var(--danger)]">
                    {item.overdue}
                  </td>
                  <td className="px-4 py-3">{item.completed}</td>
                  <td className="px-4 py-3">
                    <Link
                      href="/schedule"
                      className="text-[var(--primary)] hover:underline"
                    >
                      {item.upcomingEvents}
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      ) : null}
    </div>
  );
}
