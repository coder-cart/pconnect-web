'use client';

import { FormEvent, useEffect, useState } from 'react';
import { X } from 'lucide-react';
import { apiRequest } from '@/lib/api-client';
import { ApiResponse } from '@/lib/auth';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { LoadingState } from '@/components/ui/StatePanels';

interface ChecklistItem {
  id: string;
  title: string;
  isDone: boolean;
  position: number;
}

interface DependencyItem {
  id: string;
  dependsOnTaskId: string;
  dependsOn: { id: string; title: string; status: string };
}

interface TaskDetail {
  id: string;
  title: string;
  description?: string | null;
  status: string;
  priority: string;
  visibilityScope: string;
  estimatedHours?: string | number | null;
  actualHours?: string | number | null;
  project?: { id: string; name: string; code: string };
  assignee?: { id: string; fullName: string } | null;
  checklistItems?: ChecklistItem[];
  dependencies?: DependencyItem[];
  comments?: Array<{
    id: string;
    body: string;
    createdAt: string;
    user: { fullName: string };
  }>;
}

interface TaskOption {
  id: string;
  title: string;
}

interface TaskDetailDrawerProps {
  taskId: string | null;
  onClose: () => void;
  onUpdated: () => void;
}

export function TaskDetailDrawer({
  taskId,
  onClose,
  onUpdated,
}: TaskDetailDrawerProps) {
  const [task, setTask] = useState<TaskDetail | null>(null);
  const [commentBody, setCommentBody] = useState('');
  const [checklistTitle, setChecklistTitle] = useState('');
  const [dependencyTaskId, setDependencyTaskId] = useState('');
  const [estimatedHours, setEstimatedHours] = useState('');
  const [actualHours, setActualHours] = useState('');
  const [allTasks, setAllTasks] = useState<TaskOption[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  async function reloadTask() {
    if (!taskId) return;
    const refreshed = await apiRequest<ApiResponse<TaskDetail>>(
      `/tasks/${taskId}`,
    );
    setTask(refreshed.data);
    setEstimatedHours(
      refreshed.data.estimatedHours != null
        ? String(refreshed.data.estimatedHours)
        : '',
    );
    setActualHours(
      refreshed.data.actualHours != null
        ? String(refreshed.data.actualHours)
        : '',
    );
  }

  useEffect(() => {
    if (!taskId) {
      setTask(null);
      return;
    }

    setIsLoading(true);
    setErrorMessage(null);
    Promise.all([
      apiRequest<ApiResponse<TaskDetail>>(`/tasks/${taskId}`),
      apiRequest<ApiResponse<TaskOption[]>>('/tasks'),
    ])
      .then(([detail, list]) => {
        setTask(detail.data);
        setEstimatedHours(
          detail.data.estimatedHours != null
            ? String(detail.data.estimatedHours)
            : '',
        );
        setActualHours(
          detail.data.actualHours != null
            ? String(detail.data.actualHours)
            : '',
        );
        setAllTasks(list.data.filter((item) => item.id !== taskId));
      })
      .finally(() => setIsLoading(false));
  }, [taskId]);

  if (!taskId) {
    return null;
  }

  async function handleStatusChange(status: string) {
    if (!taskId) return;

    setIsSaving(true);
    try {
      const response = await apiRequest<ApiResponse<TaskDetail>>(
        `/tasks/${taskId}/status`,
        {
          method: 'POST',
          body: JSON.stringify({ status }),
        },
      );
      setTask(response.data);
      onUpdated();
    } finally {
      setIsSaving(false);
    }
  }

  async function handleStatusChangeGuarded(status: string) {
    setErrorMessage(null);
    try {
      await handleStatusChange(status);
    } catch (error) {
      setErrorMessage((error as Error).message);
    }
  }

  async function handleSaveHours() {
    if (!taskId) return;
    setIsSaving(true);
    setErrorMessage(null);
    try {
      await apiRequest(`/tasks/${taskId}`, {
        method: 'PATCH',
        body: JSON.stringify({
          estimatedHours: estimatedHours ? Number(estimatedHours) : undefined,
          actualHours: actualHours ? Number(actualHours) : undefined,
        }),
      });
      await reloadTask();
      onUpdated();
    } catch (error) {
      setErrorMessage((error as Error).message);
    } finally {
      setIsSaving(false);
    }
  }

  async function handleAddChecklistItem(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!taskId || !checklistTitle.trim()) return;
    setIsSaving(true);
    try {
      await apiRequest(`/tasks/${taskId}/checklist`, {
        method: 'POST',
        body: JSON.stringify({ title: checklistTitle.trim() }),
      });
      setChecklistTitle('');
      await reloadTask();
    } finally {
      setIsSaving(false);
    }
  }

  async function handleToggleChecklistItem(item: ChecklistItem) {
    if (!taskId) return;
    await apiRequest(`/tasks/${taskId}/checklist/${item.id}`, {
      method: 'PATCH',
      body: JSON.stringify({ isDone: !item.isDone }),
    });
    await reloadTask();
  }

  async function handleRemoveChecklistItem(item: ChecklistItem) {
    if (!taskId) return;
    await apiRequest(`/tasks/${taskId}/checklist/${item.id}`, {
      method: 'DELETE',
    });
    await reloadTask();
  }

  async function handleAddDependency() {
    if (!taskId || !dependencyTaskId) return;
    setIsSaving(true);
    setErrorMessage(null);
    try {
      await apiRequest(`/tasks/${taskId}/dependencies`, {
        method: 'POST',
        body: JSON.stringify({ dependsOnTaskId: dependencyTaskId }),
      });
      setDependencyTaskId('');
      await reloadTask();
    } catch (error) {
      setErrorMessage((error as Error).message);
    } finally {
      setIsSaving(false);
    }
  }

  async function handleRemoveDependency(dependency: DependencyItem) {
    if (!taskId) return;
    await apiRequest(`/tasks/${taskId}/dependencies/${dependency.id}`, {
      method: 'DELETE',
    });
    await reloadTask();
  }

  async function handleAddComment(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!taskId || !commentBody.trim()) return;

    setIsSaving(true);
    try {
      await apiRequest(`/tasks/${taskId}/comments`, {
        method: 'POST',
        body: JSON.stringify({ body: commentBody.trim() }),
      });

      const refreshed = await apiRequest<ApiResponse<TaskDetail>>(`/tasks/${taskId}`);
      setTask(refreshed.data);
      setCommentBody('');
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <button
        type="button"
        className="absolute inset-0 bg-black/30 backdrop-blur-sm"
        aria-label="Close task details"
        onClick={onClose}
      />
      <aside className="relative flex h-full w-full max-w-md flex-col border-l border-[var(--border)] bg-[var(--surface)] shadow-[var(--shadow-md)]">
        <div className="flex items-center justify-between border-b border-[var(--border)] px-5 py-4">
          <h2 className="text-base font-semibold text-[var(--foreground)]">
            Task Details
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded-[var(--radius-md)] p-2 text-[var(--muted)] hover:bg-[var(--surface-muted)]"
            aria-label="Close drawer"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-4">
          {isLoading ? (
            <LoadingState
              title="Loading task"
              description="Fetching task details and comments."
            />
          ) : null}

          {task ? (
            <div className="space-y-5">
              <div>
                <h3 className="text-lg font-semibold text-[var(--foreground)]">
                  {task.title}
                </h3>
                {task.description ? (
                  <p className="mt-2 text-sm text-[var(--muted)]">{task.description}</p>
                ) : null}
              </div>

              <div className="flex flex-wrap gap-2">
                <Badge variant="primary" className="capitalize">
                  {task.status.replaceAll('_', ' ')}
                </Badge>
                <Badge variant="neutral">{task.priority}</Badge>
                <Badge variant="neutral">
                  {task.visibilityScope.replaceAll('_', ' ')}
                </Badge>
              </div>

              {task.project ? (
                <p className="text-sm text-[var(--muted)]">
                  Project:{' '}
                  <span className="font-medium text-[var(--foreground)]">
                    {task.project.name}
                  </span>
                </p>
              ) : null}

              {task.assignee ? (
                <p className="text-sm text-[var(--muted)]">
                  Assignee:{' '}
                  <span className="font-medium text-[var(--foreground)]">
                    {task.assignee.fullName}
                  </span>
                </p>
              ) : null}

              <div className="flex flex-wrap gap-2">
                {['todo', 'in_progress', 'in_review', 'done'].map((status) => (
                  <Button
                    key={status}
                    size="sm"
                    variant={task.status === status ? 'primary' : 'secondary'}
                    disabled={isSaving}
                    onClick={() => handleStatusChangeGuarded(status)}
                  >
                    {status.replaceAll('_', ' ')}
                  </Button>
                ))}
              </div>

              {errorMessage ? (
                <p className="rounded-[var(--radius-md)] bg-[var(--danger-soft,#fee2e2)] px-3 py-2 text-xs text-[var(--danger,#b91c1c)]">
                  {errorMessage}
                </p>
              ) : null}

              <div>
                <h4 className="text-sm font-semibold text-[var(--foreground)]">
                  Time tracking
                </h4>
                <div className="mt-3 grid grid-cols-2 gap-3">
                  <Input
                    label="Estimated hours"
                    type="number"
                    min="0"
                    step="0.25"
                    value={estimatedHours}
                    onChange={(event) => setEstimatedHours(event.target.value)}
                  />
                  <Input
                    label="Actual hours"
                    type="number"
                    min="0"
                    step="0.25"
                    value={actualHours}
                    onChange={(event) => setActualHours(event.target.value)}
                  />
                </div>
                <Button
                  className="mt-3"
                  size="sm"
                  variant="secondary"
                  disabled={isSaving}
                  onClick={handleSaveHours}
                >
                  Save hours
                </Button>
              </div>

              <div>
                <div className="flex items-center justify-between">
                  <h4 className="text-sm font-semibold text-[var(--foreground)]">
                    Checklist
                  </h4>
                  {task.checklistItems && task.checklistItems.length > 0 ? (
                    <span className="text-xs text-[var(--muted)]">
                      {task.checklistItems.filter((item) => item.isDone).length}/
                      {task.checklistItems.length} done
                    </span>
                  ) : null}
                </div>
                <ul className="mt-3 space-y-2">
                  {(task.checklistItems ?? []).map((item) => (
                    <li key={item.id} className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={item.isDone}
                        onChange={() => handleToggleChecklistItem(item)}
                        className="h-4 w-4 rounded border-[var(--border)]"
                      />
                      <span
                        className={`flex-1 text-sm ${
                          item.isDone
                            ? 'text-[var(--muted)] line-through'
                            : 'text-[var(--foreground)]'
                        }`}
                      >
                        {item.title}
                      </span>
                      <button
                        type="button"
                        onClick={() => handleRemoveChecklistItem(item)}
                        className="text-[var(--muted)] hover:text-[var(--danger,#b91c1c)]"
                        aria-label="Remove checklist item"
                      >
                        <X className="h-3.5 w-3.5" />
                      </button>
                    </li>
                  ))}
                </ul>
                <form
                  className="mt-3 flex gap-2"
                  onSubmit={handleAddChecklistItem}
                >
                  <Input
                    value={checklistTitle}
                    onChange={(event) => setChecklistTitle(event.target.value)}
                    placeholder="Add checklist item..."
                  />
                  <Button
                    type="submit"
                    size="sm"
                    disabled={isSaving || !checklistTitle.trim()}
                  >
                    Add
                  </Button>
                </form>
              </div>

              <div>
                <h4 className="text-sm font-semibold text-[var(--foreground)]">
                  Dependencies (blocked by)
                </h4>
                <ul className="mt-3 space-y-2">
                  {(task.dependencies ?? []).map((dependency) => (
                    <li
                      key={dependency.id}
                      className="flex items-center gap-2 rounded-[var(--radius-md)] bg-[var(--surface-muted)] px-3 py-2"
                    >
                      <span className="flex-1 text-sm text-[var(--foreground)]">
                        {dependency.dependsOn.title}
                      </span>
                      <Badge
                        variant={
                          dependency.dependsOn.status === 'done'
                            ? 'success'
                            : 'neutral'
                        }
                        className="capitalize"
                      >
                        {dependency.dependsOn.status.replaceAll('_', ' ')}
                      </Badge>
                      <button
                        type="button"
                        onClick={() => handleRemoveDependency(dependency)}
                        className="text-[var(--muted)] hover:text-[var(--danger,#b91c1c)]"
                        aria-label="Remove dependency"
                      >
                        <X className="h-3.5 w-3.5" />
                      </button>
                    </li>
                  ))}
                </ul>
                <div className="mt-3 flex gap-2">
                  <select
                    value={dependencyTaskId}
                    onChange={(event) => setDependencyTaskId(event.target.value)}
                    className="flex-1 rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-sm text-[var(--foreground)]"
                  >
                    <option value="">Select a blocking task...</option>
                    {allTasks.map((option) => (
                      <option key={option.id} value={option.id}>
                        {option.title}
                      </option>
                    ))}
                  </select>
                  <Button
                    size="sm"
                    disabled={isSaving || !dependencyTaskId}
                    onClick={handleAddDependency}
                  >
                    Add
                  </Button>
                </div>
              </div>

              <div>
                <h4 className="text-sm font-semibold text-[var(--foreground)]">
                  Comments
                </h4>
                <div className="mt-3 space-y-3">
                  {(task.comments ?? []).map((comment) => (
                    <div
                      key={comment.id}
                      className="rounded-[var(--radius-md)] bg-[var(--surface-muted)] p-3"
                    >
                      <p className="text-xs font-medium text-[var(--foreground)]">
                        {comment.user.fullName}
                      </p>
                      <p className="mt-1 text-sm text-[var(--muted-foreground)]">
                        {comment.body}
                      </p>
                    </div>
                  ))}
                </div>

                <form className="mt-4 space-y-3" onSubmit={handleAddComment}>
                  <Input
                    label="Add comment"
                    value={commentBody}
                    onChange={(event) => setCommentBody(event.target.value)}
                    placeholder="Write a comment..."
                  />
                  <Button type="submit" disabled={isSaving || !commentBody.trim()}>
                    Add comment
                  </Button>
                </form>
              </div>
            </div>
          ) : null}
        </div>
      </aside>
    </div>
  );
}
