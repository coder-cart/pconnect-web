'use client';

import { useMemo, useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { cn } from '@/lib/cn';

interface CalendarTask {
  id: string;
  title: string;
  status: string;
  dueDate?: string | null;
  assignee?: { fullName: string } | null;
}

interface TaskCalendarProps {
  tasks: CalendarTask[];
  onSelect: (taskId: string) => void;
}

function startOfMonth(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

function daysInMonth(date: Date) {
  return new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
}

function sameDay(left: Date, right: Date) {
  return (
    left.getFullYear() === right.getFullYear() &&
    left.getMonth() === right.getMonth() &&
    left.getDate() === right.getDate()
  );
}

export function TaskCalendar({ tasks, onSelect }: TaskCalendarProps) {
  const [cursor, setCursor] = useState(() => startOfMonth(new Date()));

  const cells = useMemo(() => {
    const first = startOfMonth(cursor);
    const totalDays = daysInMonth(cursor);
    const startWeekday = first.getDay();
    const result: Array<{ date: Date | null; tasks: CalendarTask[] }> = [];

    for (let i = 0; i < startWeekday; i += 1) {
      result.push({ date: null, tasks: [] });
    }

    for (let day = 1; day <= totalDays; day += 1) {
      const date = new Date(cursor.getFullYear(), cursor.getMonth(), day);
      const dayTasks = tasks.filter((task) => {
        if (!task.dueDate) return false;
        return sameDay(new Date(task.dueDate), date);
      });
      result.push({ date, tasks: dayTasks });
    }

    return result;
  }, [cursor, tasks]);

  return (
    <Card padding="md" className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-sm font-semibold text-[var(--foreground)]">
          {cursor.toLocaleString(undefined, { month: 'long', year: 'numeric' })}
        </p>
        <div className="flex gap-1">
          <Button
            type="button"
            size="sm"
            variant="secondary"
            aria-label="Previous month"
            onClick={() =>
              setCursor(
                new Date(cursor.getFullYear(), cursor.getMonth() - 1, 1),
              )
            }
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button
            type="button"
            size="sm"
            variant="secondary"
            aria-label="Next month"
            onClick={() =>
              setCursor(
                new Date(cursor.getFullYear(), cursor.getMonth() + 1, 1),
              )
            }
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-7 gap-1 text-center text-[11px] font-semibold uppercase tracking-wide text-[var(--muted)]">
        {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((label) => (
          <div key={label} className="py-1">
            {label}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-1">
        {cells.map((cell, index) => (
          <div
            key={index}
            className={cn(
              'min-h-24 rounded-[var(--radius-md)] border border-[var(--border)] p-1.5',
              !cell.date && 'bg-[var(--surface-muted)]/40',
            )}
          >
            {cell.date ? (
              <>
                <p className="text-xs font-medium text-[var(--foreground)]">
                  {cell.date.getDate()}
                </p>
                <div className="mt-1 space-y-1">
                  {cell.tasks.slice(0, 3).map((task) => (
                    <button
                      key={task.id}
                      type="button"
                      onClick={() => onSelect(task.id)}
                      className="block w-full truncate rounded px-1 py-0.5 text-left text-[10px] font-medium text-[var(--primary)] hover:bg-[var(--primary-soft)]"
                      title={task.title}
                    >
                      {task.title}
                    </button>
                  ))}
                  {cell.tasks.length > 3 ? (
                    <p className="px-1 text-[10px] text-[var(--muted)]">
                      +{cell.tasks.length - 3} more
                    </p>
                  ) : null}
                </div>
              </>
            ) : null}
          </div>
        ))}
      </div>
    </Card>
  );
}
