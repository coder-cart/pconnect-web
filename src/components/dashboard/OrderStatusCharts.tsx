import { Card } from '@/components/ui/Card';

export type StageCount = {
  id: string;
  label: string;
  count: number;
  color: string;
};

const WEEKDAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'] as const;

export function OrderWeekBars({
  series,
}: {
  series: Array<{ day: string; pending: number; progress: number; qc: number; ready: number }>;
}) {
  const max = Math.max(
    1,
    ...series.flatMap((row) => [row.pending, row.progress, row.qc, row.ready]),
  );

  return (
    <Card className="h-full">
      <h2 className="text-sm font-semibold text-[var(--foreground)]">Order overview</h2>
      <p className="mt-0.5 text-xs text-[var(--muted)]">Active orders by due day this week</p>
      <div className="mt-4 flex h-40 items-end justify-between gap-2">
        {series.map((row) => {
          const total = row.pending + row.progress + row.qc + row.ready;
          const heightPct = Math.max(8, (total / max) * 100);
          return (
            <div key={row.day} className="flex flex-1 flex-col items-center gap-2">
              <div
                className="flex w-full max-w-[2.25rem] flex-col justify-end overflow-hidden rounded-md bg-[var(--surface-muted)]"
                style={{ height: `${heightPct}%`, minHeight: '1.5rem' }}
                title={`${row.day}: ${total}`}
              >
                {row.ready > 0 ? (
                  <div
                    className="w-full bg-emerald-500"
                    style={{ flex: row.ready }}
                  />
                ) : null}
                {row.qc > 0 ? (
                  <div className="w-full bg-violet-500" style={{ flex: row.qc }} />
                ) : null}
                {row.progress > 0 ? (
                  <div
                    className="w-full bg-blue-500"
                    style={{ flex: row.progress }}
                  />
                ) : null}
                {row.pending > 0 ? (
                  <div
                    className="w-full bg-orange-500"
                    style={{ flex: row.pending }}
                  />
                ) : null}
              </div>
              <span className="text-[0.7rem] font-medium text-[var(--muted)]">
                {row.day}
              </span>
            </div>
          );
        })}
      </div>
      <div className="mt-3 flex flex-wrap gap-3 text-[0.7rem] text-[var(--muted)]">
        <LegendDot color="bg-orange-500" label="Pending" />
        <LegendDot color="bg-blue-500" label="In progress" />
        <LegendDot color="bg-violet-500" label="QC" />
        <LegendDot color="bg-emerald-500" label="Ready" />
      </div>
    </Card>
  );
}

export function OrderStatusDonut({ stages }: { stages: StageCount[] }) {
  const total = stages.reduce((sum, stage) => sum + stage.count, 0);
  const radius = 54;
  const stroke = 16;
  const circumference = 2 * Math.PI * radius;
  let offset = 0;

  return (
    <Card className="h-full">
      <h2 className="text-sm font-semibold text-[var(--foreground)]">Orders by status</h2>
      <p className="mt-0.5 text-xs text-[var(--muted)]">Active pipeline distribution</p>
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
  const base = WEEKDAYS.map((day) => ({
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
    if (!row.dueDate) continue;
    const due = new Date(row.dueDate);
    if (due < start || due >= end) continue;
    const index = (due.getDay() + 6) % 7;
    const bucket = base[index];
    if (!bucket) continue;
    if (row.stage === 'order_received') bucket.pending += 1;
    else if (row.stage === 'in_progress') bucket.progress += 1;
    else if (row.stage === 'quality_check') bucket.qc += 1;
    else if (row.stage === 'ready_for_delivery') bucket.ready += 1;
  }

  return base;
}

function startOfWeek(date: Date) {
  const value = new Date(date);
  const day = (value.getDay() + 6) % 7;
  value.setHours(0, 0, 0, 0);
  value.setDate(value.getDate() - day);
  return value;
}
