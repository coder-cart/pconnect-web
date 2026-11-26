import { cn } from '@/lib/cn';
import { BRAND } from '@/lib/branding';

interface LogoProps {
  compact?: boolean;
  /** Prefer PNG lockup wordmark from brand pack. */
  variant?: 'auto' | 'mark' | 'lockup' | 'lockup-dark';
  className?: string;
}

const LOCKUP_CLASS =
  'h-10 w-auto max-h-10 max-w-full object-contain object-left sm:h-11 sm:max-h-11';

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
        decoding="async"
        className={cn(
          'shrink-0 object-contain object-center',
          // Default mark size; callers may override with h/w utilities.
          className ?? 'h-8 w-8',
        )}
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
        decoding="async"
        className={cn(LOCKUP_CLASS, className)}
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
        decoding="async"
        className={cn(LOCKUP_CLASS, className)}
      />
    );
  }

  return (
    <div
      className={cn('flex min-w-0 max-w-full items-center', className)}
      role="img"
      aria-label={BRAND.name}
    >
      <img
        src={BRAND.lockup}
        alt=""
        width={209}
        height={72}
        decoding="async"
        className={cn('brand-lockup', LOCKUP_CLASS)}
      />
      <img
        src={BRAND.lockupDark}
        alt=""
        width={209}
        height={72}
        decoding="async"
        className={cn('brand-lockup-dark', LOCKUP_CLASS)}
      />
    </div>
  );
}
