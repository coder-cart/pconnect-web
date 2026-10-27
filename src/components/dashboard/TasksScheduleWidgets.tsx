'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { CalendarDays, CheckSquare, Clock3, TriangleAlert } from 'lucide-react';
import { apiRequest } from '@/lib/api-client';
import { ApiResponse } from '@/lib/auth';
import { DashboardMetricCard } from '@/components/dashboard/DashboardMetricCard';

interface TaskItem {
  id: string;
  title: string;
  status: string;
  dueDate?: string | null;
}

interface StudioEvent {
  id: string;
  title: string;
  startsAt: string;
  status: string;
}

export function TasksScheduleWidgets({ enabled }: { enabled: boolean }) {
  const [pending, setPending] = useState(0);
  const [dueSoon, setDueSoon] = useState(0);
  const [overdue, setOverdue] = useState(0);
  const [upcomingEvents, setUpcomingEvents] = useState(0);

  useEffect(() => {
    if (!enabled) return;

    const now = new Date();
    const soon = new Date(now.getTime() + 24 * 60 * 60 * 1000);
    const weekAhead = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

    Promise.all([
      apiRequest<ApiResponse<{ items: TaskItem[] }>>(
        '/tasks?pageSize=100&scope=mine',
      ).catch(() => null),
      apiRequest<ApiResponse<StudioEvent[]>>(
        `/schedule/events?from=${encodeURIComponent(now.toISOString())}&to=${encodeURIComponent(weekAhead.toISOString())}`,
      ).catch(() => null),
    ]).then(([tasksResponse, eventsResponse]) => {
      const tasks = tasksResponse?.data.items ?? [];
      setPending(
        tasks.filter(
          (task) => task.status === 'todo' || task.status === 'in_progress',
        ).length,
      );
      setDueSoon(
        tasks.filter((task) => {
          if (!task.dueDate) return false;
          if (task.status === 'done' || task.status === 'cancelled') return false;
          const due = new Date(task.dueDate);
          return due >= now && due <= soon;
        }).length,
      );
      setOverdue(
        tasks.filter((task) => {
          if (!task.dueDate) return false;
          if (task.status === 'done' || task.status === 'cancelled') return false;
          return new Date(task.dueDate) < now;
        }).length,
      );
      setUpcomingEvents(
        (eventsResponse?.data ?? []).filter(
          (event) => event.status !== 'cancelled',
        ).length,
      );
    });
  }, [enabled]);

  if (!enabled) return null;

  return (
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
      <Link href="/tasks">
        <DashboardMetricCard
          label="My pending tasks"
          value={pending}
          icon={CheckSquare}
          tone="blue"
        />
      </Link>
      <Link href="/tasks">
        <DashboardMetricCard
          label="Due soon"
          value={dueSoon}
          icon={Clock3}
          tone="orange"
        />
      </Link>
      <Link href="/tasks">
        <DashboardMetricCard
          label="Overdue tasks"
          value={overdue}
          icon={TriangleAlert}
          tone="pink"
        />
      </Link>
      <Link href="/schedule">
        <DashboardMetricCard
          label="Upcoming events"
          value={upcomingEvents}
          icon={CalendarDays}
          tone="purple"
        />
      </Link>
    </div>
  );
}
