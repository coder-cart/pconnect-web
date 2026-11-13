import { Card } from '@/components/ui/Card';

export type StageCount = {
  id: string;
  label: string;
  count: number;
  color: string;
};

const WEEKDAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'] as const;

type WeekDayRow = {
  day: string;
  pending: number;
  progress: number;
  qc: number;
  ready: number;
};

export function OrderWeekBars({
  series,
}: {
  series: WeekDayRow[];
}) {
  const totals = series.map(
    (row) => row.pending + row.progress + row.qc + row.ready,
  );
  const maxTotal = Math.max(0, ...totals);
  const weekTotal = totals.reduce((sum, value) => sum + value, 0);

  return (
    <Card className="h-full">
      <h2 className="text-sm font-semibold text-[var(--foreground)]">Order overview</h2>
      <p className="mt-0.5 text-xs text-[var(--muted)]">Active orders by due day this week</p>
      {weekTotal === 0 ? (
        <div className="mt-4 flex h-40 items-center justify-center rounded-[var(--radius-md)] border border-dashed border-[var(--border)] bg-[var(--surface-muted)]/40">
          <p className="px-4 text-center text-xs text-[var(--muted)]">
            No active orders due this week
          </p>
        </div>
      ) : (
        <div className="mt-4 flex h-44 gap-2 pt-4">
          {series.map((row, index) => {
            const total = totals[index] ?? 0;
            const heightPct =
              maxTotal === 0 || total === 0
                ? 0
                : Math.max(12, (total / maxTotal) * 100);

            return (
              <div
                key={row.day}
                className="flex min-w-0 flex-1 flex-col items-center gap-1.5"
              >
                <div className="flex w-full flex-1 flex-col justify-end">
                  <div
                    className="relative mx-auto w-full max-w-[2.25rem]"
                    style={{ height: total === 0 ? '0.25rem' : `${heightPct}%` }}
                    title={`${row.day}: ${total} order${total === 1 ? '' : 's'}`}
                  >
                    {total > 0 ? (
                      <span className="absolute -top-4 left-1/2 -translate-x-1/2 text-[0.65rem] font-medium tabular-nums text-[var(--muted)]">
                        {total}
                      </span>
                    ) : null}
                    <div className="flex h-full w-full flex-col justify-end overflow-hidden rounded-md bg-[var(--surface-muted)]">
                      {total === 0 ? null : (
                        <>
                          <BarSegment count={row.ready} total={total} color="bg-emerald-500" />
                          <BarSegment count={row.qc} total={total} color="bg-violet-500" />
                          <BarSegment count={row.progress} total={total} color="bg-blue-500" />
                          <BarSegment count={row.pending} total={total} color="bg-orange-500" />
                        </>
                      )}
                    </div>
                  </div>
                </div>
                <span className="text-[0.7rem] font-medium text-[var(--muted)]">
                  {row.day}
                </span>
              </div>
            );
          })}
        </div>
      )}
      <div className="mt-3 flex flex-wrap gap-3 text-[0.7rem] text-[var(--muted)]">
        <LegendDot color="bg-orange-500" label="Pending" />
        <LegendDot color="bg-blue-500" label="In progress" />
        <LegendDot color="bg-violet-500" label="QC" />
        <LegendDot color="bg-emerald-500" label="Ready" />
      </div>
    </Card>
  );
}

function BarSegment({
  count,
  total,
  color,
}: {
  count: number;
  total: number;
  color: string;
}) {
  if (count <= 0 || total <= 0) return null;
  return (
    <div
      className={`w-full ${color}`}
      style={{ height: `${(count / total) * 100}%` }}
    />
  );
}

export function OrderStatusDonut({
  stages,
  title = 'Orders by status',
  description = 'Active pipeline distribution',
}: {
  stages: StageCount[];
  title?: string;
  description?: string;
}) {
  const total = stages.reduce((sum, stage) => sum + stage.count, 0);
  const radius = 54;
  const stroke = 16;
  const circumference = 2 * Math.PI * radius;
  let offset = 0;

  return (
    <Card className="h-full">
      <h2 className="text-sm font-semibold text-[var(--foreground)]">{title}</h2>
      <p className="mt-0.5 text-xs text-[var(--muted)]">{description}</p>
      <div className="mt-3 flex flex-col items-center gap-4 sm:flex-row sm:justify-center">
        <div className="relative h-36 w-36">
          <svg viewBox="0 0 140 140" className="h-full w-full -rotate-90" aria-hidden>
            <circle
              cx="70"
              cy="70"
              r={radius}
              fill="none"
              stroke="var(--border)"
              strokeWidth={stroke}
            />
            {total === 0 ? null : (
              stages.map((stage) => {
                if (stage.count <= 0) return null;
                const length = (stage.count / total) * circumference;
                const circle = (
                  <circle
                    key={stage.id}
                    cx="70"
                    cy="70"
                    r={radius}
                    fill="none"
                    stroke={stage.color}
                    strokeWidth={stroke}
                    strokeDasharray={`${length} ${circumference - length}`}
                    strokeDashoffset={-offset}
                    strokeLinecap="butt"
                  />
                );
                offset += length;
                return circle;
              })
            )}
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <p className="text-2xl font-semibold text-[var(--foreground)]">{total}</p>
            <p className="text-xs text-[var(--muted)]">Total</p>
          </div>
        </div>
        <ul className="w-full space-y-2 text-sm sm:w-auto">
          {stages.map((stage) => (
            <li key={stage.id} className="flex items-center justify-between gap-4">
              <span className="inline-flex items-center gap-2 text-[var(--muted)]">
                <span
                  className="h-2.5 w-2.5 rounded-full"
                  style={{ background: stage.color }}
                />
                {stage.label}
              </span>
              <span className="font-semibold text-[var(--foreground)]">{stage.count}</span>
            </li>
          ))}
        </ul>
      </div>
    </Card>
  );
}

function LegendDot({ color, label }: { color: string; label: string }) {
  return (
    <span className="inline-flex items-center gap-1.5">
      <span className={`h-2 w-2 rounded-full ${color}`} />
      {label}
    </span>
  );
}

export function buildWeekSeries(
  rows: Array<{ dueDate?: string | null; stage: string | null }>,
) {
  const base: WeekDayRow[] = WEEKDAYS.map((day) => ({
    day,
    pending: 0,
    progress: 0,
    qc: 0,
    ready: 0,
  }));

  const now = new Date();
  const start = startOfWeek(now);
  const end = new Date(start);
  end.setDate(end.getDate() + 7);

  for (const row of rows) {
    if (!row.dueDate || !row.stage) continue;
    const due = parseLocalDate(row.dueDate);
    if (Number.isNaN(due.getTime())) continue;
    if (due < start || due >= end) continue;
    const index = (due.getDay() + 6) % 7;
    const bucket = base[index];
    if (!bucket) continue;

    if (row.stage === 'order_received') bucket.pending += 1;
    else if (row.stage === 'in_progress') bucket.progress += 1;
    else if (row.stage === 'quality_check') bucket.qc += 1;
    else if (row.stage === 'delivered' || row.stage === 'ready_for_delivery') {
      bucket.ready += 1;
    }
  }

  return base;
}

/** Parse ISO / date-only values in local time so weekday bucketing stays correct. */
function parseLocalDate(value: string) {
  const dateOnly = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (dateOnly) {
    return new Date(
      Number(dateOnly[1]),
      Number(dateOnly[2]) - 1,
      Number(dateOnly[3]),
    );
  }

  const withTime = /^(\d{4})-(\d{2})-(\d{2})[T\s]/.exec(value);
  if (withTime) {
    const parsed = new Date(value);
    if (!Number.isNaN(parsed.getTime())) {
      return new Date(parsed.getFullYear(), parsed.getMonth(), parsed.getDate());
    }
  }

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return parsed;
  return new Date(parsed.getFullYear(), parsed.getMonth(), parsed.getDate());
}

function startOfWeek(date: Date) {
  const value = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const day = (value.getDay() + 6) % 7;
  value.setDate(value.getDate() - day);
  return value;
}
