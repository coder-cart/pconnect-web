import { cn } from '@/lib/cn';
import { BRAND } from '@/lib/branding';

interface LogoProps {
  compact?: boolean;
  className?: string;
}

export function Logo({ compact = false, className }: LogoProps) {
  if (compact) {
    return (
      <img
        src={BRAND.mark}
        alt={BRAND.name}
        width={32}
        height={32}
        className={cn('h-8 w-8 object-contain', className)}
      />
    );
  }

  return (
    <div
      className={cn('flex items-center', className)}
      role="img"
      aria-label={BRAND.name}
    >
      <img
        src={BRAND.lockup}
        alt=""
        width={140}
        height={36}
        className="brand-lockup h-8 w-auto max-w-[9.5rem] object-contain object-left"
      />
      <img
        src={BRAND.lockupDark}
        alt=""
        width={140}
        height={36}
        className="brand-lockup-dark h-8 w-auto max-w-[9.5rem] object-contain object-left"
      />
    </div>
  );
}
