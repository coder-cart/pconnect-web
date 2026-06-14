'use client';

import { FormEvent, useEffect, useState } from 'react';
import { X } from 'lucide-react';
import { apiRequest } from '@/lib/api-client';
import { ApiResponse } from '@/lib/auth';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { LoadingState } from '@/components/ui/StatePanels';

interface TaskDetail {
  id: string;
  title: string;
  description?: string | null;
  status: string;
  priority: string;
  visibilityScope: string;
  project?: { id: string; name: string; code: string };
  assignee?: { id: string; fullName: string } | null;
  comments?: Array<{
    id: string;
    body: string;
    createdAt: string;
    user: { fullName: string };
  }>;
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
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (!taskId) {
      setTask(null);
      return;
    }

    setIsLoading(true);
    apiRequest<ApiResponse<TaskDetail>>(`/tasks/${taskId}`)
      .then((response) => setTask(response.data))
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
                    onClick={() => handleStatusChange(status)}
                  >
                    {status.replaceAll('_', ' ')}
                  </Button>
                ))}
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
