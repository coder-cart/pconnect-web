import { LucideIcon, TrendingDown, TrendingUp } from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { cn } from '@/lib/cn';

interface StatCardProps {
  label: string;
  value: string;
  trend?: string;
  trendDirection?: 'up' | 'down' | 'neutral';
  icon: LucideIcon;
  iconClassName?: string;
}

export function StatCard({
  label,
  value,
  trend,
  trendDirection = 'neutral',
  icon: Icon,
  iconClassName,
}: StatCardProps) {
  const TrendIcon =
    trendDirection === 'down'
      ? TrendingDown
      : trendDirection === 'up'
        ? TrendingUp
        : null;

  return (
    <Card className="animate-fade-in hover:translate-y-[-1px]">
      <div className="flex items-start justify-between gap-3">
        <div
          className={cn(
            'flex h-10 w-10 items-center justify-center rounded-[var(--radius-md)] bg-[var(--primary-soft)] text-[var(--primary)]',
            iconClassName,
          )}
        >
          <Icon className="h-5 w-5" aria-hidden />
        </div>

        {trend && TrendIcon ? (
          <span
            className={cn(
              'inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium',
              trendDirection === 'up' && 'bg-[var(--success-soft)] text-[var(--success)]',
              trendDirection === 'down' && 'bg-[var(--warning-soft)] text-[var(--warning)]',
            )}
          >
            <TrendIcon className="h-3 w-3" />
            {trend}
          </span>
        ) : null}
      </div>

      <p className="mt-4 text-2xl font-semibold tracking-tight text-[var(--foreground)]">
        {value}
      </p>
      <p className="mt-1 text-sm text-[var(--muted)]">{label}</p>
    </Card>
  );
}
