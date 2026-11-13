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
    <Card padding="sm" className="animate-fade-in">
      <div className="flex items-center gap-2.5">
        <div
          className={cn(
            'flex h-8 w-8 shrink-0 items-center justify-center rounded-[var(--radius-md)] bg-[var(--primary-soft)] text-[var(--primary)]',
            iconClassName,
          )}
        >
          <Icon className="h-4 w-4" aria-hidden />
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate text-base font-semibold tracking-tight text-[var(--foreground)] sm:text-lg">
            {value}
          </p>
          <p className="truncate text-xs text-[var(--muted)]">{label}</p>
        </div>
        {trend && TrendIcon ? (
          <span
            className={cn(
              'inline-flex shrink-0 items-center gap-1 rounded-full px-1.5 py-0.5 text-[10px] font-medium',
              trendDirection === 'up' && 'bg-[var(--success-soft)] text-[var(--success)]',
              trendDirection === 'down' && 'bg-[var(--warning-soft)] text-[var(--warning)]',
            )}
          >
            <TrendIcon className="h-3 w-3" />
            {trend}
          </span>
        ) : null}
      </div>
    </Card>
  );
}
