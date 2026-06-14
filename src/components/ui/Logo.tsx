import { Shield } from 'lucide-react';
import { cn } from '@/lib/cn';

interface LogoProps {
  compact?: boolean;
  className?: string;
}

export function Logo({ compact = false, className }: LogoProps) {
  return (
    <div className={cn('flex items-center gap-3', className)}>
      <div className="flex h-9 w-9 items-center justify-center rounded-[var(--radius-md)] bg-[var(--primary)] text-white shadow-sm">
        <Shield className="h-5 w-5" aria-hidden />
      </div>

      {!compact ? (
        <div>
          <p className="text-sm font-semibold text-[var(--foreground)]">
            PConnect
          </p>
          <p className="text-xs text-[var(--muted)]">Unified operations</p>
        </div>
      ) : null}
    </div>
  );
}
