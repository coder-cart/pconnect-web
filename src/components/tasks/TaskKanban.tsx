'use client';

import { useState } from 'react';
import { Badge } from '@/components/ui/Badge';
import { Card } from '@/components/ui/Card';

interface KanbanTask {
  id: string;
  title: string;
  status: string;
  priority: string;
  project?: { name: string; code: string };
}

interface TaskKanbanProps {
  tasks: KanbanTask[];
  onStatusChange: (taskId: string, status: string) => void;
  onSelect: (taskId: string) => void;
}

const COLUMNS: Array<{ id: string; label: string }> = [
  { id: 'todo', label: 'To do' },
  { id: 'in_progress', label: 'In progress' },
  { id: 'in_review', label: 'In review' },
  { id: 'done', label: 'Done' },
];

function priorityVariant(priority: string) {
  if (priority === 'high' || priority === 'urgent') return 'danger' as const;
  if (priority === 'medium') return 'warning' as const;
  return 'neutral' as const;
}

export function TaskKanban({
  tasks,
  onStatusChange,
  onSelect,
}: TaskKanbanProps) {
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [overColumn, setOverColumn] = useState<string | null>(null);

  function handleDrop(status: string) {
    if (draggingId) {
      const task = tasks.find((item) => item.id === draggingId);
      if (task && task.status !== status) {
        onStatusChange(draggingId, status);
      }
    }
    setDraggingId(null);
    setOverColumn(null);
  }

  return (
    <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
      {COLUMNS.map((column) => {
        const columnTasks = tasks.filter((task) => task.status === column.id);
        return (
          <div
            key={column.id}
            onDragOver={(event) => {
              event.preventDefault();
              setOverColumn(column.id);
            }}
            onDrop={() => handleDrop(column.id)}
            className={`rounded-[var(--radius-lg)] border p-2 transition-colors ${
              overColumn === column.id
                ? 'border-[var(--primary)] bg-[var(--primary-soft)]'
                : 'border-[var(--border)] bg-[var(--surface-muted)]'
            }`}
          >
            <div className="flex items-center justify-between px-2 py-1.5">
              <span className="text-sm font-semibold text-[var(--foreground)]">
                {column.label}
              </span>
              <Badge variant="neutral">{columnTasks.length}</Badge>
            </div>

            <div className="space-y-2">
              {columnTasks.map((task) => {
                const columnIndex = COLUMNS.findIndex(
                  (entry) => entry.id === task.status,
                );
                return (
                  <Card
                    key={task.id}
                    padding="sm"
                    draggable
                    onDragStart={() => setDraggingId(task.id)}
                    onDragEnd={() => {
                      setDraggingId(null);
                      setOverColumn(null);
                    }}
                    className="cursor-grab active:cursor-grabbing"
                  >
                    <button
                      type="button"
                      onClick={() => onSelect(task.id)}
                      className="block w-full text-left"
                    >
                      <p className="text-sm font-medium text-[var(--foreground)]">
                        {task.title}
                      </p>
                      <p className="mt-1 text-xs text-[var(--muted)]">
                        {task.project?.name ?? 'No project'}
                      </p>
                    </button>
                    <div className="mt-2 flex items-center justify-between">
                      <Badge variant={priorityVariant(task.priority)}>
                        {task.priority}
                      </Badge>
                      <div className="flex gap-1">
                        <button
                          type="button"
                          disabled={columnIndex <= 0}
                          onClick={() =>
                            onStatusChange(
                              task.id,
                              COLUMNS[columnIndex - 1].id,
                            )
                          }
                          className="rounded px-1.5 text-xs text-[var(--muted)] hover:text-[var(--foreground)] disabled:opacity-30"
                          aria-label="Move left"
                        >
                          ←
                        </button>
                        <button
                          type="button"
                          disabled={columnIndex >= COLUMNS.length - 1}
                          onClick={() =>
                            onStatusChange(
                              task.id,
                              COLUMNS[columnIndex + 1].id,
                            )
                          }
                          className="rounded px-1.5 text-xs text-[var(--muted)] hover:text-[var(--foreground)] disabled:opacity-30"
                          aria-label="Move right"
                        >
                          →
                        </button>
                      </div>
                    </div>
                  </Card>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}
