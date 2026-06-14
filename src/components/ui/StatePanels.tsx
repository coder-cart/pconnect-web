import { AlertTriangle, Inbox, LoaderCircle, ShieldAlert } from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { cn } from '@/lib/cn';

interface StatePanelProps {
  title: string;
  description: string;
  className?: string;
}

export function LoadingState({ title, description, className }: StatePanelProps) {
  return (
    <Card className={cn('text-center', className)}>
      <LoaderCircle
        className="mx-auto h-8 w-8 animate-spin text-[var(--primary)]"
        aria-hidden
      />
      <p className="mt-4 text-sm font-medium text-[var(--foreground)]">{title}</p>
      <p className="mt-2 text-sm text-[var(--muted)]">{description}</p>
    </Card>
  );
}

export function EmptyState({ title, description, className }: StatePanelProps) {
  return (
    <Card
      className={cn(
        'border-dashed bg-[var(--surface-muted)] text-center shadow-none',
        className,
      )}
    >
      <Inbox className="mx-auto h-8 w-8 text-[var(--muted)]" aria-hidden />
      <p className="mt-4 text-sm font-medium text-[var(--foreground)]">{title}</p>
      <p className="mt-2 text-sm text-[var(--muted)]">{description}</p>
    </Card>
  );
}

export function ErrorState({ title, description, className }: StatePanelProps) {
  return (
    <Card
      className={cn(
        'border-[color-mix(in_srgb,var(--danger)_35%,var(--border))] bg-[var(--danger-soft)] text-center',
        className,
      )}
    >
      <AlertTriangle className="mx-auto h-8 w-8 text-[var(--danger)]" aria-hidden />
      <p className="mt-4 text-sm font-medium text-[var(--danger)]">{title}</p>
      <p className="mt-2 text-sm text-[color-mix(in_srgb,var(--danger)_75%,black)]">
        {description}
      </p>
    </Card>
  );
}

export function RestrictedState({
  title,
  description,
  className,
}: StatePanelProps) {
  return (
    <Card
      className={cn(
        'border-[color-mix(in_srgb,var(--warning)_35%,var(--border))] bg-[var(--warning-soft)] text-center',
        className,
      )}
    >
      <ShieldAlert className="mx-auto h-8 w-8 text-[var(--warning)]" aria-hidden />
      <p className="mt-4 text-sm font-medium text-[var(--warning)]">{title}</p>
      <p className="mt-2 text-sm text-[color-mix(in_srgb,var(--warning)_75%,black)]">
        {description}
      </p>
    </Card>
  );
}
