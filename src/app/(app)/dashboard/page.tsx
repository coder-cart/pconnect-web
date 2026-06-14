'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  Briefcase,
  CheckSquare,
  FileText,
  MessageSquare,
} from 'lucide-react';
import { PageHeader } from '@/components/ui/PageHeader';
import { StatCard } from '@/components/ui/StatCard';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Avatar } from '@/components/ui/Avatar';
import { apiRequest } from '@/lib/api-client';
import { ApiResponse } from '@/lib/auth';
import { ListSkeleton } from '@/components/ui/Skeleton';
import { TaskDetailDrawer } from '@/components/tasks/TaskDetailDrawer';
import { useWorkspace } from '@/components/providers/WorkspaceProvider';

interface DashboardSummary {
  openTasks: number;
  activeProjects: number;
  channels: number;
  pendingInvoices: number;
}

interface TaskItem {
  id: string;
  title: string;
  status: string;
  priority: string;
  project?: { name: string };
}

interface DashboardFeed {
  activity: Array<{
    id: string;
    action: string;
    moduleName: string;
    createdAt: string;
    actor?: { fullName: string } | null;
  }>;
  upcomingTasks: Array<{
    id: string;
    title: string;
    dueDate: string;
    project?: { name: string };
  }>;
  teamMembers: Array<{
    id: string;
    fullName: string;
    email: string;
  }>;
}

function priorityVariant(priority: string) {
  if (priority === 'high' || priority === 'urgent') return 'danger' as const;
  if (priority === 'medium') return 'warning' as const;
  return 'success' as const;
}

function formatRelativeTime(value: string) {
  const diffMs = Date.now() - new Date(value).getTime();
  const diffMinutes = Math.floor(diffMs / 60000);
  if (diffMinutes < 1) return 'Just now';
  if (diffMinutes < 60) return `${diffMinutes}m ago`;
  const diffHours = Math.floor(diffMinutes / 60);
  if (diffHours < 24) return `${diffHours}h ago`;
  return new Date(value).toLocaleDateString();
}

export default function DashboardPage() {
  const { refreshKey } = useWorkspace();
  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [tasks, setTasks] = useState<TaskItem[]>([]);
  const [feed, setFeed] = useState<DashboardFeed | null>(null);
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  function loadDashboard() {
    setIsLoading(true);
    Promise.all([
      apiRequest<ApiResponse<DashboardSummary>>('/projects/summary/dashboard'),
      apiRequest<ApiResponse<TaskItem[]>>('/tasks'),
      apiRequest<ApiResponse<DashboardFeed>>('/projects/summary/feed'),
    ])
      .then(([summaryResponse, tasksResponse, feedResponse]) => {
        setSummary(summaryResponse.data);
        setTasks(tasksResponse.data.slice(0, 3));
        setFeed(feedResponse.data);
      })
      .finally(() => setIsLoading(false));
  }

  useEffect(() => {
    loadDashboard();
  }, [refreshKey]);

  async function completeTask(taskId: string) {
    await apiRequest(`/tasks/${taskId}/status`, {
      method: 'POST',
      body: JSON.stringify({ status: 'done' }),
    });
    loadDashboard();
  }

  const today = new Intl.DateTimeFormat('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  }).format(new Date());

  const upcomingCount = feed?.upcomingTasks.length ?? 0;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Good morning"
        description={`${today} · ${upcomingCount} upcoming task${upcomingCount === 1 ? '' : 's'} due this week.`}
      />

      {isLoading ? (
        <ListSkeleton rows={4} />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <StatCard
            label="Open Tasks"
            value={String(summary?.openTasks ?? 0)}
            trend="Live"
            trendDirection="up"
            icon={CheckSquare}
          />
          <StatCard
            label="Active Projects"
            value={String(summary?.activeProjects ?? 0)}
            trend="Live"
            trendDirection="up"
            icon={Briefcase}
          />
          <StatCard
            label="Accessible Channels"
            value={String(summary?.channels ?? 0)}
            trend="Live"
            trendDirection="up"
            icon={MessageSquare}
          />
          <StatCard
            label="Pending Invoices"
            value={String(summary?.pendingInvoices ?? 0)}
            trend="Live"
            trendDirection="up"
            icon={FileText}
          />
        </div>
      )}

      <div className="grid gap-6 xl:grid-cols-[2fr_1fr]">
        <Card>
          <div className="mb-4 flex items-center justify-between gap-3">
            <h2 className="text-base font-semibold text-[var(--foreground)]">
              My Tasks
            </h2>
            <Link href="/tasks" className="text-sm font-medium text-[var(--primary)]">
              View all
            </Link>
          </div>

          <div className="space-y-3">
            {tasks.map((task) => (
              <div
                key={task.id}
                className="flex flex-col gap-3 rounded-[var(--radius-md)] border border-[var(--border)] p-3 transition-colors hover:bg-[var(--surface-muted)] sm:flex-row sm:items-center"
              >
                <div className="flex min-w-0 flex-1 items-start gap-3">
                  <input
                    type="checkbox"
                    checked={task.status === 'done'}
                    onChange={() => void completeTask(task.id)}
                    className="mt-1 h-4 w-4 rounded border-[var(--border)] text-[var(--primary)]"
                    aria-label={`Mark ${task.title} complete`}
                  />
                  <button
                    type="button"
                    onClick={() => setSelectedTaskId(task.id)}
                    className="text-left"
                  >
                    <p className="text-sm font-medium text-[var(--foreground)]">
                      {task.title}
                    </p>
                    <p className="text-xs text-[var(--muted)]">
                      {task.project?.name ?? 'No project'}
                    </p>
                  </button>
                </div>

                <Badge variant={priorityVariant(task.priority)} className="w-fit">
                  {task.priority}
                </Badge>
              </div>
            ))}
          </div>
        </Card>

        <Card>
          <h2 className="text-base font-semibold text-[var(--foreground)]">
            Upcoming
          </h2>
          <div className="mt-4 space-y-4">
            {(feed?.upcomingTasks ?? []).length === 0 ? (
              <p className="text-sm text-[var(--muted)]">No upcoming due dates this week.</p>
            ) : (
              feed?.upcomingTasks.map((task) => (
                <div key={task.id}>
                  <p className="text-xs font-semibold uppercase tracking-wide text-[var(--muted)]">
                    {new Date(task.dueDate).toLocaleDateString(undefined, {
                      weekday: 'short',
                      month: 'short',
                      day: 'numeric',
                    })}
                  </p>
                  <button
                    type="button"
                    onClick={() => setSelectedTaskId(task.id)}
                    className="mt-2 block w-full rounded-[var(--radius-md)] border border-[var(--primary-soft)] bg-[var(--primary-soft)] p-3 text-left"
                  >
                    <p className="text-xs text-[var(--primary)]">
                      {task.project?.name ?? 'Task'}
                    </p>
                    <p className="mt-1 text-sm font-medium text-[var(--foreground)]">
                      {task.title}
                    </p>
                  </button>
                </div>
              ))
            )}
          </div>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <h2 className="text-base font-semibold text-[var(--foreground)]">
            Recent Activity
          </h2>
          <div className="mt-4 space-y-4">
            {(feed?.activity ?? []).slice(0, 5).map((entry) => (
              <div key={entry.id} className="flex items-start gap-3">
                <Avatar name={entry.actor?.fullName ?? 'System'} size="sm" />
                <div>
                  <p className="text-sm text-[var(--foreground)]">
                    <span className="font-medium">
                      {entry.actor?.fullName ?? 'System'}
                    </span>{' '}
                    {entry.action.replaceAll('.', ' ')} in {entry.moduleName}
                  </p>
                  <p className="text-xs text-[var(--muted)]">
                    {formatRelativeTime(entry.createdAt)}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </Card>

        <Card>
          <h2 className="text-base font-semibold text-[var(--foreground)]">
            Team Pulse
          </h2>
          <p className="mt-2 text-sm text-[var(--muted)]">
            {feed?.teamMembers.length ?? 0} active teammates in this workspace.
          </p>
          <div className="mt-4 flex -space-x-2">
            {(feed?.teamMembers ?? []).map((member) => (
              <Avatar
                key={member.id}
                name={member.fullName}
                size="sm"
                className="ring-2 ring-[var(--surface)]"
              />
            ))}
          </div>
        </Card>
      </div>

      <TaskDetailDrawer
        taskId={selectedTaskId}
        onClose={() => setSelectedTaskId(null)}
        onUpdated={loadDashboard}
      />
    </div>
  );
}
