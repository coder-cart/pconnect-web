'use client';

import { FormEvent, useEffect, useMemo, useState } from 'react';
import { apiRequest } from '@/lib/api-client';
import { ApiResponse } from '@/lib/auth';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { EmptyState, ErrorState } from '@/components/ui/StatePanels';
import { ListSkeleton } from '@/components/ui/Skeleton';

type WorkflowStage =
  | 'inquiry'
  | 'booked'
  | 'shooting'
  | 'editing'
  | 'delivered';

interface ChecklistItem {
  id: string;
  title: string;
  done: boolean;
}

interface StudioProject {
  id: string;
  status: string;
  workflowStage: WorkflowStage;
  guestName: string;
  guestEmail: string;
  guestPhone?: string | null;
  notes?: string | null;
  sessionTypeName?: string | null;
  sessionDurationMinutes?: number | null;
  requestedStartsAt: string;
  requestedEndsAt: string;
  proposedStartsAt?: string | null;
  proposedEndsAt?: string | null;
  checklist: ChecklistItem[];
  progress: number;
  clientOrganization: { id: string; name: string };
}

interface StudioProjectsBoardProps {
  highlightRequestId?: string | null;
  onChanged?: () => void;
}

const COLUMNS: Array<{ id: WorkflowStage; label: string }> = [
  { id: 'inquiry', label: 'Inquiry' },
  { id: 'booked', label: 'Booked' },
  { id: 'shooting', label: 'Shooting' },
  { id: 'editing', label: 'Editing' },
  { id: 'delivered', label: 'Delivered' },
];

function formatWhen(startsAt: string, endsAt: string) {
  const start = new Date(startsAt);
  const end = new Date(endsAt);
  return `${start.toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
  })} · ${start.toLocaleTimeString(undefined, {
    hour: 'numeric',
    minute: '2-digit',
  })}–${end.toLocaleTimeString(undefined, {
    hour: 'numeric',
    minute: '2-digit',
  })}`;
}

export function StudioProjectsBoard({
  highlightRequestId,
  onChanged,
}: StudioProjectsBoardProps) {
  const [projects, setProjects] = useState<StudioProject[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [openId, setOpenId] = useState<string | null>(highlightRequestId ?? null);
  const [newTaskTitle, setNewTaskTitle] = useState('');

  async function load(options?: { quiet?: boolean }) {
    if (!options?.quiet) setIsLoading(true);
    setErrorMessage(null);
    try {
      const response = await apiRequest<
        ApiResponse<{ items: StudioProject[] }>
      >('/studio-projects');
      setProjects(response.data.items ?? []);
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : 'Unable to load projects',
      );
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, []);

  useEffect(() => {
    if (highlightRequestId) setOpenId(highlightRequestId);
  }, [highlightRequestId]);

  useEffect(() => {
    if (!openId) return;
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') setOpenId(null);
    }
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [openId]);

  const board = useMemo(() => {
    const groups: Record<WorkflowStage, StudioProject[]> = {
      inquiry: [],
      booked: [],
      shooting: [],
      editing: [],
      delivered: [],
    };
    for (const project of projects) {
      const stage = COLUMNS.some((column) => column.id === project.workflowStage)
        ? project.workflowStage
        : 'inquiry';
      groups[stage].push(project);
    }
    return groups;
  }, [projects]);

  const openProject = projects.find((item) => item.id === openId) ?? null;

  async function approve(id: string) {
    setBusyId(id);
    try {
      await apiRequest(`/booking-requests/${id}/approve`, { method: 'POST' });
      await load({ quiet: true });
      onChanged?.();
      setOpenId(id);
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : 'Unable to confirm inquiry',
      );
    } finally {
      setBusyId(null);
    }
  }

  async function reject(id: string) {
    setBusyId(id);
    try {
      await apiRequest(`/booking-requests/${id}/reject`, {
        method: 'POST',
        body: JSON.stringify({}),
      });
      await load({ quiet: true });
      onChanged?.();
      if (openId === id) setOpenId(null);
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : 'Unable to decline inquiry',
      );
    } finally {
      setBusyId(null);
    }
  }

  async function patchWorkflow(
    id: string,
    patch: { workflowStage?: WorkflowStage; checklist?: ChecklistItem[] },
  ) {
    setBusyId(id);
    try {
      const response = await apiRequest<ApiResponse<StudioProject>>(
        `/booking-requests/${id}/workflow`,
        {
          method: 'PATCH',
          body: JSON.stringify(patch),
        },
      );
      setProjects((current) =>
        current.map((item) => (item.id === id ? response.data : item)),
      );
      onChanged?.();
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : 'Unable to update project',
      );
    } finally {
      setBusyId(null);
    }
  }

  function toggleTask(project: StudioProject, taskId: string) {
    const checklist = project.checklist.map((item) =>
      item.id === taskId ? { ...item, done: !item.done } : item,
    );
    void patchWorkflow(project.id, { checklist });
  }

  function addTask(event: FormEvent, project: StudioProject) {
    event.preventDefault();
    const title = newTaskTitle.trim();
    if (!title) return;
    const checklist = [
      ...project.checklist,
      {
        id: `task-${Date.now()}`,
        title,
        done: false,
      },
    ];
    setNewTaskTitle('');
    void patchWorkflow(project.id, { checklist });
  }

  if (isLoading) return <ListSkeleton rows={4} />;
  if (errorMessage && projects.length === 0) {
    return (
      <ErrorState title="Unable to load projects" description={errorMessage} />
    );
  }

  return (
    <div className="space-y-4">
      <p className="text-sm text-[var(--muted)]">
        Inquiries become projects when you confirm them. Move work through
        booked, shoot, edit, and delivery.
      </p>

      {errorMessage ? (
        <p className="text-sm text-[var(--danger)]">{errorMessage}</p>
      ) : null}

      <div className="flex gap-3 overflow-x-auto pb-2">
        {COLUMNS.map((column) => {
          const items = board[column.id];
          return (
            <section
              key={column.id}
              className="min-w-[230px] flex-1 rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--surface)] p-3"
            >
              <div className="mb-3 flex items-center justify-between gap-2">
                <h3 className="text-sm font-semibold text-[var(--foreground)]">
                  {column.label}
                </h3>
                <span className="rounded-full bg-[var(--surface-muted)] px-2 py-0.5 text-xs font-semibold text-[var(--muted)]">
                  {items.length}
                </span>
              </div>

              {items.length === 0 ? (
                <p className="px-1 py-4 text-xs text-[var(--muted)]">
                  Nothing here yet.
                </p>
              ) : (
                <ul className="space-y-2">
                  {items.map((project) => (
                    <li key={project.id}>
                      <button
                        type="button"
                        tabIndex={0}
                        onClick={() => setOpenId(project.id)}
                        onKeyDown={(event) => {
                          if (event.key === 'Enter') setOpenId(project.id);
                        }}
                        className="w-full rounded-[var(--radius-md)] border border-transparent bg-[var(--surface-muted)] p-3 text-left transition-colors hover:border-[var(--border)]"
                      >
                        <p className="truncate text-sm font-medium text-[var(--foreground)]">
                          {project.guestName}
                        </p>
                        <p className="mt-0.5 truncate text-xs text-[var(--muted)]">
                          {project.sessionTypeName ??
                            project.clientOrganization.name}
                        </p>
                        <p className="mt-1 text-xs text-[var(--muted)]">
                          {formatWhen(
                            project.requestedStartsAt,
                            project.requestedEndsAt,
                          )}
                        </p>
                        <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-[var(--border)]">
                          <div
                            className="h-full rounded-full bg-[var(--success)]"
                            style={{ width: `${project.progress}%` }}
                          />
                        </div>
                        <p className="mt-1 text-xs text-[var(--muted)]">
                          {
                            project.checklist.filter((item) => item.done)
                              .length
                          }{' '}
                          of {project.checklist.length} tasks done
                        </p>
                        {column.id === 'inquiry' ? (
                          <div className="mt-2 flex flex-wrap gap-2">
                            <Button
                              size="sm"
                              disabled={busyId === project.id}
                              onClick={(event) => {
                                event.stopPropagation();
                                void approve(project.id);
                              }}
                            >
                              Confirm
                            </Button>
                            <Button
                              size="sm"
                              variant="secondary"
                              disabled={busyId === project.id}
                              onClick={(event) => {
                                event.stopPropagation();
                                void reject(project.id);
                              }}
                            >
                              Decline
                            </Button>
                          </div>
                        ) : null}
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          );
        })}
      </div>

      {projects.length === 0 ? (
        <EmptyState
          title="No studio projects yet"
          description="When clients request a booking, inquiries show up here. Confirmed shoots move across the board."
        />
      ) : null}

      {openProject ? (
        <>
          <button
            type="button"
            className="fixed inset-0 z-40 bg-black/40"
            aria-label="Close project drawer"
            onClick={() => setOpenId(null)}
          />
          <aside className="fixed inset-y-0 right-0 z-50 w-full max-w-md overflow-y-auto border-l border-[var(--border)] bg-[var(--surface)] p-5 shadow-xl">
            <div className="mb-4 flex items-start justify-between gap-3">
              <div>
                <h3 className="text-base font-semibold text-[var(--foreground)]">
                  {openProject.guestName}
                </h3>
                <p className="mt-0.5 text-xs text-[var(--muted)]">
                  {openProject.guestEmail}
                  {openProject.guestPhone
                    ? ` · ${openProject.guestPhone}`
                    : ''}
                </p>
              </div>
              <Button size="sm" variant="ghost" onClick={() => setOpenId(null)}>
                Close
              </Button>
            </div>

            <div className="space-y-3 text-sm">
              <p className="text-[var(--muted)]">
                {openProject.sessionTypeName ?? 'Session'} ·{' '}
                {formatWhen(
                  openProject.requestedStartsAt,
                  openProject.requestedEndsAt,
                )}
              </p>
              {openProject.notes ? (
                <p className="rounded-[var(--radius-md)] bg-[var(--surface-muted)] p-3 text-[var(--foreground)]">
                  “{openProject.notes}”
                </p>
              ) : null}

              {openProject.workflowStage === 'inquiry' ? (
                <div className="flex flex-wrap gap-2">
                  <Button
                    size="sm"
                    disabled={busyId === openProject.id}
                    onClick={() => void approve(openProject.id)}
                  >
                    Confirm booking
                  </Button>
                  <Button
                    size="sm"
                    variant="secondary"
                    disabled={busyId === openProject.id}
                    onClick={() => void reject(openProject.id)}
                  >
                    Decline
                  </Button>
                </div>
              ) : (
                <Select
                  label="Stage"
                  value={openProject.workflowStage}
                  disabled={busyId === openProject.id}
                  onChange={(event) =>
                    void patchWorkflow(openProject.id, {
                      workflowStage: event.target.value as WorkflowStage,
                    })
                  }
                  options={COLUMNS.filter((column) => column.id !== 'inquiry').map(
                    (column) => ({
                      value: column.id,
                      label: column.label,
                    }),
                  )}
                />
              )}

              <div>
                <div className="mb-2 flex items-center justify-between">
                  <h4 className="text-sm font-semibold">Checklist</h4>
                  <span className="text-xs text-[var(--muted)]">
                    {openProject.progress}%
                  </span>
                </div>
                <div className="mb-3 h-1.5 overflow-hidden rounded-full bg-[var(--border)]">
                  <div
                    className="h-full rounded-full bg-[var(--success)]"
                    style={{ width: `${openProject.progress}%` }}
                  />
                </div>
                <ul className="divide-y divide-[var(--border)]">
                  {openProject.checklist.map((item) => (
                    <li key={item.id} className="py-2">
                      <label className="flex items-center gap-2 text-sm">
                        <input
                          type="checkbox"
                          checked={item.done}
                          disabled={busyId === openProject.id}
                          onChange={() => toggleTask(openProject, item.id)}
                        />
                        <span
                          className={
                            item.done
                              ? 'text-[var(--muted)] line-through'
                              : 'text-[var(--foreground)]'
                          }
                        >
                          {item.title}
                        </span>
                      </label>
                    </li>
                  ))}
                </ul>
                <form
                  className="mt-3 flex gap-2"
                  onSubmit={(event) => addTask(event, openProject)}
                >
                  <Input
                    value={newTaskTitle}
                    onChange={(event) => setNewTaskTitle(event.target.value)}
                    placeholder="Add a task"
                  />
                  <Button
                    size="sm"
                    type="submit"
                    disabled={busyId === openProject.id || !newTaskTitle.trim()}
                  >
                    Add
                  </Button>
                </form>
              </div>
            </div>
          </aside>
        </>
      ) : null}
    </div>
  );
}
