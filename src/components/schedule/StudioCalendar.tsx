'use client';

import { cn } from '@/lib/cn';

export interface CalendarEvent {
  id: string;
  title: string;
  type: string;
  startsAt: string;
  endsAt: string;
  status: string;
  location?: string | null;
  description?: string | null;
  clientOrganization?: { id: string; name: string } | null;
  order?: { id: string; code: string; name: string } | null;
  assignees: Array<{ user: { id: string; fullName: string } }>;
}

type ScheduleView = 'month' | 'week' | 'day';

interface StudioCalendarProps {
  view: ScheduleView;
  anchor: Date;
  events: CalendarEvent[];
  onSelectEvent: (event: CalendarEvent) => void;
  onSelectSlot?: (day: Date) => void;
}

function startOfDay(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function sameDay(a: Date, b: Date) {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

function eventTouchesDay(event: CalendarEvent, day: Date) {
  const start = new Date(event.startsAt);
  const end = new Date(event.endsAt);
  const dayStart = startOfDay(day);
  const dayEnd = new Date(
    day.getFullYear(),
    day.getMonth(),
    day.getDate(),
    23,
    59,
    59,
  );
  return start <= dayEnd && end >= dayStart;
}

function monthCells(anchor: Date) {
  const first = new Date(anchor.getFullYear(), anchor.getMonth(), 1);
  const start = startOfDay(first);
  start.setDate(start.getDate() - start.getDay());
  const cells: Date[] = [];
  for (let i = 0; i < 42; i += 1) {
    const cell = new Date(start);
    cell.setDate(start.getDate() + i);
    cells.push(cell);
  }
  return cells;
}

function weekDays(anchor: Date) {
  const start = startOfDay(anchor);
  start.setDate(start.getDate() - start.getDay());
  return Array.from({ length: 7 }, (_, index) => {
    const day = new Date(start);
    day.setDate(start.getDate() + index);
    return day;
  });
}

function hourLabel(hour: number) {
  const suffix = hour >= 12 ? 'PM' : 'AM';
  const normalized = hour % 12 === 0 ? 12 : hour % 12;
  return `${normalized} ${suffix}`;
}

export function StudioCalendar({
  view,
  anchor,
  events,
  onSelectEvent,
  onSelectSlot,
}: StudioCalendarProps) {
  const today = startOfDay(new Date());
  const activeEvents = events.filter((event) => event.status !== 'cancelled');

  if (view === 'month') {
    const cells = monthCells(anchor);
    return (
      <div className="overflow-hidden rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--surface)]">
        <div className="grid grid-cols-7 border-b border-[var(--border)] bg-[var(--surface-muted)] text-center text-xs font-semibold uppercase tracking-wide text-[var(--muted)]">
          {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((label) => (
            <div key={label} className="px-2 py-2">
              {label}
            </div>
          ))}
        </div>
        <div className="grid grid-cols-7">
          {cells.map((day) => {
            const dayEvents = activeEvents.filter((event) =>
              eventTouchesDay(event, day),
            );
            const inMonth = day.getMonth() === anchor.getMonth();
            const cellClassName = cn(
              'min-h-[7.5rem] border-b border-r border-[var(--border)] p-1.5 text-left align-top',
              !inMonth && 'bg-[var(--surface-muted)]/50 text-[var(--muted)]',
              sameDay(day, today) && 'bg-[var(--primary-soft)]/40',
            );
            const dayBody = (
              <>
                <span
                  className={cn(
                    'inline-flex h-6 w-6 items-center justify-center rounded-full text-xs font-semibold',
                    sameDay(day, today) &&
                      'bg-[var(--primary)] text-white',
                  )}
                >
                  {day.getDate()}
                </span>
                <div className="mt-1 space-y-0.5">
                  {dayEvents.slice(0, 3).map((event) => (
                    <button
                      key={event.id}
                      type="button"
                      onClick={(clickEvent) => {
                        clickEvent.stopPropagation();
                        onSelectEvent(event);
                      }}
                      className="block w-full truncate rounded px-1 py-0.5 text-left text-[11px] font-medium text-[var(--foreground)] hover:bg-[var(--surface-muted)]"
                      title={event.title}
                    >
                      {new Date(event.startsAt).toLocaleTimeString([], {
                        hour: 'numeric',
                        minute: '2-digit',
                      })}{' '}
                      {event.title}
                    </button>
                  ))}
                  {dayEvents.length > 3 ? (
                    <p className="px-1 text-[10px] text-[var(--muted)]">
                      +{dayEvents.length - 3} more
                    </p>
                  ) : null}
                </div>
              </>
            );
            if (onSelectSlot) {
              return (
                <button
                  key={day.toISOString()}
                  type="button"
                  onClick={() => onSelectSlot(day)}
                  className={cellClassName}
                >
                  {dayBody}
                </button>
              );
            }
            return (
              <div key={day.toISOString()} className={cellClassName}>
                {dayBody}
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  if (view === 'week') {
    const days = weekDays(anchor);
    return (
      <div className="overflow-hidden rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--surface)]">
        <div className="grid grid-cols-7 border-b border-[var(--border)] bg-[var(--surface-muted)]">
          {days.map((day) => (
            <div
              key={day.toISOString()}
              className={cn(
                'border-r border-[var(--border)] px-2 py-2 text-center last:border-r-0',
                sameDay(day, today) && 'bg-[var(--primary-soft)]/50',
              )}
            >
              <p className="text-[11px] font-semibold uppercase tracking-wide text-[var(--muted)]">
                {day.toLocaleDateString(undefined, { weekday: 'short' })}
              </p>
              <p className="text-sm font-semibold text-[var(--foreground)]">
                {day.getDate()}
              </p>
            </div>
          ))}
        </div>
        <div className="grid grid-cols-7">
          {days.map((day) => {
            const dayEvents = activeEvents
              .filter((event) => eventTouchesDay(event, day))
              .sort(
                (left, right) =>
                  new Date(left.startsAt).getTime() -
                  new Date(right.startsAt).getTime(),
              );
            return (
              <div
                key={day.toISOString()}
                className="min-h-[18rem] border-r border-[var(--border)] p-2 last:border-r-0"
              >
                <div className="space-y-1.5">
                  {dayEvents.length === 0 ? (
                    onSelectSlot ? (
                      <button
                        type="button"
                        onClick={() => onSelectSlot(day)}
                        className="w-full rounded border border-dashed border-[var(--border)] px-2 py-6 text-xs text-[var(--muted)] hover:bg-[var(--surface-muted)]"
                      >
                        Add event
                      </button>
                    ) : (
                      <p className="px-2 py-6 text-center text-xs text-[var(--muted)]">
                        No events
                      </p>
                    )
                  ) : (
                    dayEvents.map((event) => (
                      <button
                        key={event.id}
                        type="button"
                        onClick={() => onSelectEvent(event)}
                        className="w-full rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--surface-muted)] px-2 py-1.5 text-left hover:border-[var(--primary)]"
                      >
                        <p className="truncate text-xs font-semibold text-[var(--foreground)]">
                          {event.title}
                        </p>
                        <p className="mt-0.5 text-[11px] text-[var(--muted)]">
                          {new Date(event.startsAt).toLocaleTimeString([], {
                            hour: 'numeric',
                            minute: '2-digit',
                          })}
                          {' – '}
                          {new Date(event.endsAt).toLocaleTimeString([], {
                            hour: 'numeric',
                            minute: '2-digit',
                          })}
                        </p>
                      </button>
                    ))
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  const dayEvents = activeEvents
    .filter((event) => eventTouchesDay(event, anchor))
    .sort(
      (left, right) =>
        new Date(left.startsAt).getTime() - new Date(right.startsAt).getTime(),
    );

  return (
    <div className="overflow-hidden rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--surface)]">
      <div className="border-b border-[var(--border)] bg-[var(--surface-muted)] px-4 py-3">
        <p className="text-sm font-semibold text-[var(--foreground)]">
          {anchor.toLocaleDateString(undefined, {
            weekday: 'long',
            month: 'long',
            day: 'numeric',
            year: 'numeric',
          })}
        </p>
      </div>
      <div className="divide-y divide-[var(--border)]">
        {Array.from({ length: 24 }, (_, hour) => {
          const slotEvents = dayEvents.filter((event) => {
            const startHour = new Date(event.startsAt).getHours();
            return startHour === hour;
          });
          return (
            <div key={hour} className="grid grid-cols-[4rem_1fr] gap-2 px-3 py-2">
              <p className="pt-1 text-xs text-[var(--muted)]">{hourLabel(hour)}</p>
              <div className="min-h-[2.5rem] space-y-1">
                {slotEvents.length === 0 ? (
                  onSelectSlot ? (
                    <button
                      type="button"
                      onClick={() => {
                        const slot = new Date(anchor);
                        slot.setHours(hour, 0, 0, 0);
                        onSelectSlot(slot);
                      }}
                      className="h-full w-full rounded border border-transparent hover:border-dashed hover:border-[var(--border)]"
                      aria-label={`Add event at ${hourLabel(hour)}`}
                    />
                  ) : (
                    <div className="h-full w-full" />
                  )
                ) : (
                  slotEvents.map((event) => (
                    <button
                      key={event.id}
                      type="button"
                      onClick={() => onSelectEvent(event)}
                      className="w-full rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--primary-soft)] px-3 py-2 text-left"
                    >
                      <p className="text-sm font-semibold text-[var(--foreground)]">
                        {event.title}
                      </p>
                      <p className="mt-0.5 text-xs text-[var(--muted)]">
                        {new Date(event.startsAt).toLocaleTimeString([], {
                          hour: 'numeric',
                          minute: '2-digit',
                        })}
                        {' – '}
                        {new Date(event.endsAt).toLocaleTimeString([], {
                          hour: 'numeric',
                          minute: '2-digit',
                        })}
                        {event.location ? ` · ${event.location}` : ''}
                      </p>
                    </button>
                  ))
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
