'use client';

import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { Plus } from 'lucide-react';
import { apiRequest } from '@/lib/api-client';
import { ApiResponse, userHasPermission } from '@/lib/auth';
import { PageHeader } from '@/components/ui/PageHeader';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { SearchInput } from '@/components/ui/SearchInput';
import { Tabs } from '@/components/ui/Tabs';
import { ListSkeleton } from '@/components/ui/Skeleton';
import { EmptyState, ErrorState } from '@/components/ui/StatePanels';
import { TaskDetailDrawer } from '@/components/tasks/TaskDetailDrawer';
import { TaskKanban } from '@/components/tasks/TaskKanban';
import { TaskTemplatesPanel } from '@/components/tasks/TaskTemplatesPanel';
import { TaskCalendar } from '@/components/tasks/TaskCalendar';
import { CreateTaskModal } from '@/components/modals/CreateTaskModal';
import { useWorkspace } from '@/components/providers/WorkspaceProvider';
import { cn } from '@/lib/cn';

interface TaskItem {
  id: string;
  title: string;
  status: string;
  priority: string;
  visibilityScope: string;
  dueDate?: string | null;
  startDate?: string | null;
  assigneeUserId?: string | null;
  assignee?: { id: string; fullName: string } | null;
  project?: {
    name: string;
    code: string;
    clientOrganization?: { name: string } | null;
  };
}

function priorityVariant(priority: string) {
  if (priority === 'high' || priority === 'urgent') return 'danger' as const;
  if (priority === 'medium') return 'warning' as const;
  return 'neutral' as const;
}

function statusLabel(status: string) {
  if (status === 'in_review' || status === 'on_hold') return 'On Hold';
  if (status === 'in_progress') return 'In Progress';
  if (status === 'done') return 'Completed';
  if (status === 'cancelled') return 'Cancelled';
  return 'To Do';
}

function statusVariant(status: string) {
  if (status === 'done') return 'success' as const;
  if (status === 'in_progress') return 'primary' as const;
  if (status === 'on_hold' || status === 'in_review') return 'warning' as const;
  return 'neutral' as const;
}

function isOverdue(task: TaskItem) {
  return Boolean(
    task.dueDate &&
      new Date(task.dueDate) < new Date() &&
      task.status !== 'done' &&
      task.status !== 'cancelled',
  );
}

export default function TasksPage() {
  const { user, refreshKey, notifyRefresh } = useWorkspace();
  const searchParams = useSearchParams();
  const canManageTemplates = userHasPermission(user, 'templates.manage');
  const [activeTab, setActiveTab] = useState('my-tasks');
  const [tasks, setTasks] = useState<TaskItem[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  function loadTasks() {
    setIsLoading(true);
    setErrorMessage(null);
    const scope =
      activeTab === 'my-tasks'
        ? 'mine'
        : activeTab === 'completed'
          ? 'completed'
          : 'all';
    const params = new URLSearchParams({
      pageSize: '100',
      scope,
    });
    if (searchQuery.trim()) {
      params.set('q', searchQuery.trim());
    }

    apiRequest<ApiResponse<{ items: TaskItem[] }>>(`/tasks?${params}`)
      .then((response) => setTasks(response.data.items))
      .catch((error: Error) => setErrorMessage(error.message))
      .finally(() => setIsLoading(false));
  }

  useEffect(() => {
    void Promise.resolve().then(() => loadTasks());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [refreshKey, activeTab]);

  useEffect(() => {
    const taskId = searchParams.get('task');
    if (!taskId) return;
    void Promise.resolve().then(() => setSelectedTaskId(taskId));
  }, [searchParams]);

  async function handleStatusChange(taskId: string, status: string) {
    setTasks((current) =>
      current.map((task) => (task.id === taskId ? { ...task, status } : task)),
    );
    try {
      await apiRequest(`/tasks/${taskId}/status`, {
        method: 'POST',
        body: JSON.stringify({ status }),
      });
    } catch {
      loadTasks();
    }
  }

  const overdueCount = useMemo(
    () => tasks.filter((task) => isOverdue(task)).length,
    [tasks],
  );

  const filteredTasks = useMemo(() => {
    return tasks.filter((task) => {
      const query = searchQuery.toLowerCase();
      const matchesSearch = `${task.title} ${task.status} ${task.project?.name ?? ''} ${task.assignee?.fullName ?? ''}`
        .toLowerCase()
        .includes(query);
      if (!matchesSearch) return false;
      if (activeTab === 'overdue') return isOverdue(task);
      if (activeTab === 'team-tasks') return true;
      return true;
    });
  }, [tasks, searchQuery, activeTab]);

  const calendarTasks = activeTab === 'calendar' ? filteredTasks : [];

  return (
    <div className="space-y-4">
      <PageHeader
        title="Tasks"
        description="Studio and team to-dos. Assign work to your teammates or Colabdeck staff."
        breadcrumbs={[
          { label: 'Workspace', href: '/dashboard' },
          { label: 'Tasks' },
        ]}
        action={
          <Button onClick={() => setCreateOpen(true)}>
            <Plus className="h-4 w-4" />
            New Task
          </Button>
        }
      />

      <Tabs
        activeId={activeTab}
        onChange={setActiveTab}
        items={[
          { id: 'my-tasks', label: 'My Tasks' },
          { id: 'team-tasks', label: 'Team Tasks' },
          {
            id: 'overdue',
            label: 'Overdue',
            badge: overdueCount > 0 ? overdueCount : undefined,
          },
          { id: 'board', label: 'Board' },
          { id: 'calendar', label: 'Calendar' },
          { id: 'completed', label: 'Completed' },
          ...(canManageTemplates
            ? [{ id: 'templates', label: 'Templates' }]
            : []),
        ]}
      />

      {activeTab === 'templates' ? (
        <TaskTemplatesPanel canManage={canManageTemplates} />
      ) : activeTab === 'board' ? (
        <>
          <Card padding="sm">
            <SearchInput
              placeholder="Search tasks..."
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
            />
          </Card>
          {isLoading ? <ListSkeleton rows={4} /> : null}
          {!isLoading && errorMessage ? (
            <ErrorState title="Unable to load tasks" description={errorMessage} />
          ) : null}
          {!isLoading && !errorMessage ? (
            <TaskKanban
              tasks={filteredTasks}
              onStatusChange={handleStatusChange}
              onSelect={setSelectedTaskId}
            />
          ) : null}
        </>
      ) : activeTab === 'calendar' ? (
        <>
          {isLoading ? <ListSkeleton rows={4} /> : null}
          {!isLoading && errorMessage ? (
            <ErrorState title="Unable to load tasks" description={errorMessage} />
          ) : null}
          {!isLoading && !errorMessage ? (
            <TaskCalendar
              tasks={calendarTasks}
              onSelect={setSelectedTaskId}
            />
          ) : null}
        </>
      ) : (
        <>
          <Card padding="sm">
            <SearchInput
              placeholder="Search tasks..."
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
            />
          </Card>

          {isLoading ? <ListSkeleton rows={5} /> : null}
          {!isLoading && errorMessage ? (
            <ErrorState title="Unable to load tasks" description={errorMessage} />
          ) : null}
          {!isLoading && !errorMessage && filteredTasks.length === 0 ? (
            <EmptyState
              title="No tasks yet"
              description="Create a task to get started."
            />
          ) : null}

          {!isLoading && !errorMessage && filteredTasks.length > 0 ? (
            <Card padding="none" className="overflow-hidden">
              <ul className="divide-y divide-[var(--border)]">
                {filteredTasks.map((task) => (
                  <li key={task.id}>
                    <button
                      type="button"
                      onClick={() => setSelectedTaskId(task.id)}
                      className="flex w-full items-start gap-3 px-4 py-3 text-left hover:bg-[var(--surface-muted)]"
                    >
                      <div className="min-w-0 flex-1">
                        <p
                          className={cn(
                            'truncate text-sm font-medium text-[var(--foreground)]',
                            isOverdue(task) && 'text-[var(--danger)]',
                          )}
                        >
                          {task.title}
                        </p>
                        <p className="mt-0.5 truncate text-xs text-[var(--muted)]">
                          {task.project?.clientOrganization?.name ??
                            task.project?.name ??
                            'Studio'}
                          {task.assignee?.fullName
                            ? ` · ${task.assignee.fullName}`
                            : ' · Unassigned'}
                          {task.dueDate
                            ? ` · Due ${new Date(task.dueDate).toLocaleDateString()}`
                            : ''}
                        </p>
                      </div>
                      <div className="flex shrink-0 flex-col items-end gap-1">
                        <Badge variant={statusVariant(task.status)}>
                          {statusLabel(task.status)}
                        </Badge>
                        <Badge variant={priorityVariant(task.priority)}>
                          {task.priority}
                        </Badge>
                      </div>
                    </button>
                  </li>
                ))}
              </ul>
            </Card>
          ) : null}
        </>
      )}

      <TaskDetailDrawer
        taskId={selectedTaskId}
        onClose={() => setSelectedTaskId(null)}
        onUpdated={() => {
          loadTasks();
          notifyRefresh();
        }}
      />
      <CreateTaskModal
        open={createOpen}
        user={user}
        onClose={() => setCreateOpen(false)}
        onCreated={() => {
          loadTasks();
          notifyRefresh();
        }}
      />
    </div>
  );
}
