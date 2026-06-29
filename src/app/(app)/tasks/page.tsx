'use client';

import { useEffect, useMemo, useState } from 'react';
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
import { CreateTaskModal } from '@/components/modals/CreateTaskModal';
import { useWorkspace } from '@/components/providers/WorkspaceProvider';

interface TaskItem {
  id: string;
  title: string;
  status: string;
  priority: string;
  visibilityScope: string;
  dueDate?: string | null;
  assigneeUserId?: string | null;
  assignee?: { id: string; fullName: string } | null;
  project?: { name: string; code: string };
}

function priorityVariant(priority: string) {
  if (priority === 'high' || priority === 'urgent') return 'danger' as const;
  if (priority === 'medium') return 'warning' as const;
  return 'neutral' as const;
}

function statusVariant(status: string) {
  if (status === 'done') return 'success' as const;
  if (status === 'in_progress' || status === 'in_review') return 'primary' as const;
  return 'neutral' as const;
}

export default function TasksPage() {
  const { user, refreshKey, notifyRefresh } = useWorkspace();
  const canManageTemplates = userHasPermission(user, 'templates.manage');
  const [activeTab, setActiveTab] = useState('my-tasks');
  const [tasks, setTasks] = useState<TaskItem[]>([]);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  function loadTasks() {
    setIsLoading(true);
    Promise.all([
      apiRequest<ApiResponse<TaskItem[]>>('/tasks'),
      apiRequest<ApiResponse<{ id: string }>>('/auth/me'),
    ])
      .then(([tasksResponse, meResponse]) => {
        setTasks(tasksResponse.data);
        setCurrentUserId(meResponse.data.id);
      })
      .catch((error: Error) => setErrorMessage(error.message))
      .finally(() => setIsLoading(false));
  }

  useEffect(() => {
    loadTasks();
  }, [refreshKey]);

  async function handleStatusChange(taskId: string, status: string) {
    setTasks((current) =>
      current.map((task) =>
        task.id === taskId ? { ...task, status } : task,
      ),
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
    () =>
      tasks.filter(
        (task) =>
          task.dueDate &&
          new Date(task.dueDate) < new Date() &&
          task.status !== 'done',
      ).length,
    [tasks],
  );

  const filteredTasks = useMemo(() => {
    return tasks.filter((task) => {
      const query = searchQuery.toLowerCase();
      const matchesSearch = `${task.title} ${task.status} ${task.project?.name ?? ''}`
        .toLowerCase()
        .includes(query);

      if (!matchesSearch) return false;

      if (activeTab === 'my-tasks') {
        return task.assignee?.id === currentUserId || task.assigneeUserId === currentUserId;
      }

      if (activeTab === 'overdue') {
        return (
          Boolean(task.dueDate) &&
          new Date(task.dueDate!) < new Date() &&
          task.status !== 'done'
        );
      }

      return true;
    });
  }, [tasks, searchQuery, activeTab, currentUserId]);

  return (
    <div className="space-y-4">
      <PageHeader
        title="Tasks"
        description="Tasks filtered by project membership and internal vs shared visibility."
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
          { id: 'all-tasks', label: 'All Tasks' },
          {
            id: 'overdue',
            label: 'Overdue',
            badge: overdueCount > 0 ? overdueCount : undefined,
          },
          { id: 'board', label: 'Board' },
          { id: 'templates', label: 'Templates & Recurring' },
        ]}
      />

      {activeTab === 'templates' ? (
        <TaskTemplatesPanel canManage={canManageTemplates} />
      ) : activeTab === 'board' ? (
        <TaskKanban
          tasks={tasks.filter((task) =>
            `${task.title} ${task.project?.name ?? ''}`
              .toLowerCase()
              .includes(searchQuery.toLowerCase()),
          )}
          onStatusChange={handleStatusChange}
          onSelect={setSelectedTaskId}
        />
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
          description="Assigned tasks will appear here."
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
                  className="flex w-full flex-col gap-3 px-4 py-3 text-left transition-colors hover:bg-[var(--surface-muted)] md:grid md:grid-cols-[minmax(0,2fr)_repeat(3,minmax(0,1fr))] md:items-center"
                >
                  <div>
                    <p className="text-sm font-medium text-[var(--foreground)]">
                      {task.title}
                    </p>
                    <p className="text-xs text-[var(--muted)]">
                      {task.project?.name ?? 'No project'} ·{' '}
                      {task.visibilityScope.replaceAll('_', ' ')}
                    </p>
                  </div>
                  <Badge variant={priorityVariant(task.priority)} className="w-fit">
                    {task.priority}
                  </Badge>
                  <Badge variant={statusVariant(task.status)} className="w-fit capitalize">
                    {task.status.replaceAll('_', ' ')}
                  </Badge>
                  <span className="text-xs text-[var(--muted)]">Open details</span>
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
        onUpdated={loadTasks}
      />
      <CreateTaskModal
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        onCreated={() => {
          notifyRefresh();
          loadTasks();
        }}
      />
    </div>
  );
}
