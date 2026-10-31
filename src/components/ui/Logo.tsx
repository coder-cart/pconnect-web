import { cn } from '@/lib/cn';
import { BRAND } from '@/lib/branding';

interface LogoProps {
  compact?: boolean;
  /** Prefer PNG lockup wordmark from brand pack. */
  variant?: 'auto' | 'mark' | 'lockup' | 'lockup-dark';
  className?: string;
}

export function Logo({
  compact = false,
  variant = 'auto',
  className,
}: LogoProps) {
  if (compact || variant === 'mark') {
    return (
      <img
        src={BRAND.mark}
        alt={BRAND.name}
        width={32}
        height={32}
        className={cn('h-8 w-8 object-contain ml-2', className)}
      />
    );
  }

  if (variant === 'lockup') {
    return (
      <img
        src={BRAND.lockup}
        alt={BRAND.name}
        width={209}
        height={72}
        className={cn(
          'h-9 w-auto max-w-full object-contain object-left',
          className,
        )}
      />
    );
  }

  if (variant === 'lockup-dark') {
    return (
      <img
        src={BRAND.lockupDark}
        alt={BRAND.name}
        width={209}
        height={72}
        className={cn(
          'h-9 w-auto max-w-full object-contain object-left',
          className,
        )}
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
        width={209}
        height={72}
        className="brand-lockup h-8 w-auto max-w-[180px] object-contain object-left sm:h-9 sm:max-w-[220px]"
      />
      <img
        src={BRAND.lockupDark}
        alt=""
        width={209}
        height={72}
        className="brand-lockup-dark h-8 w-auto max-w-[180px] object-contain object-left sm:h-9 sm:max-w-[220px]"
      />
    </div>
  );
}
