import { cn } from '@/lib/cn';

interface LogoProps {
  compact?: boolean;
  className?: string;
}

export function Logo({ compact = false, className }: LogoProps) {
  if (compact) {
    return (
      <img
        src="/brand/colabdeck-mark.png"
        alt="Colabdeck"
        width={36}
        height={36}
        className={cn('h-9 w-9', className)}
      />
    );
  }

  return (
    <div className={cn('flex items-center', className)} role="img" aria-label="Colabdeck">
      <img
        src="/brand/colabdeck-lockup.png"
        alt=""
        width={168}
        height={42}
        className="brand-lockup h-9 w-auto"
      />
      <img
        src="/brand/colabdeck-lockup-dark.png"
        alt=""
        width={168}
        height={42}
        className="brand-lockup-dark h-9 w-auto"
      />
    </div>
  );
}
