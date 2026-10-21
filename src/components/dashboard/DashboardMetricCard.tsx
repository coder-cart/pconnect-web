import { LucideIcon } from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { cn } from '@/lib/cn';

const TONE_STYLES = {
  blue: {
    icon: 'bg-blue-500/15 text-blue-600 dark:text-blue-300',
    stroke: '#3b82f6',
  },
  orange: {
    icon: 'bg-orange-500/15 text-orange-600 dark:text-orange-300',
    stroke: '#f97316',
  },
  purple: {
    icon: 'bg-violet-500/15 text-violet-600 dark:text-violet-300',
    stroke: '#8b5cf6',
  },
  pink: {
    icon: 'bg-fuchsia-500/15 text-fuchsia-600 dark:text-fuchsia-300',
    stroke: '#d946ef',
  },
  green: {
    icon: 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-300',
    stroke: '#10b981',
  },
} as const;

export type MetricTone = keyof typeof TONE_STYLES;

interface DashboardMetricCardProps {
  label: string;
  value: number | string;
  icon: LucideIcon;
  tone?: MetricTone;
  /** Optional sparkline points 0–1; decorative only (no invented %). */
  sparkline?: number[];
}

export function DashboardMetricCard({
  label,
  value,
  icon: Icon,
  tone = 'blue',
  sparkline,
}: DashboardMetricCardProps) {
  const styles = TONE_STYLES[tone];
  const points = sparkline?.length ? sparkline : [0.35, 0.42, 0.38, 0.55, 0.48, 0.62, 0.7];

  return (
    <Card className="animate-fade-in p-4">
      <div className="flex items-start justify-between gap-2">
        <div
          className={cn(
            'flex h-9 w-9 items-center justify-center rounded-[var(--radius-md)]',
            styles.icon,
          )}
        >
          <Icon className="h-4 w-4" aria-hidden />
        </div>
        <Sparkline points={points} color={styles.stroke} />
      </div>
      <p className="mt-3 text-2xl font-semibold tracking-tight text-[var(--foreground)]">
        {value}
      </p>
      <p className="mt-0.5 text-sm text-[var(--muted)]">{label}</p>
    </Card>
  );
}

function Sparkline({ points, color }: { points: number[]; color: string }) {
  const width = 72;
  const height = 28;
  const max = Math.max(...points, 0.01);
  const coords = points
    .map((point, index) => {
      const x = (index / Math.max(points.length - 1, 1)) * width;
      const y = height - (point / max) * (height - 4) - 2;
      return `${x},${y}`;
    })
    .join(' ');

  return (
    <svg
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      aria-hidden
      className="opacity-90"
    >
      <polyline
        fill="none"
        stroke={color}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        points={coords}
      />
    </svg>
  );
}
