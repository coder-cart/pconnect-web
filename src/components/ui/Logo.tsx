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
      className={cn('flex items-center gap-2.5', className)}
      role="img"
      aria-label={BRAND.name}
    >
      <img
        src={BRAND.mark}
        alt=""
        width={36}
        height={36}
        className="h-9 w-9 shrink-0 object-contain"
      />
      <span className="brand-lockup text-[1.05rem] font-semibold tracking-[-0.02em] text-[var(--foreground)]">
        Colab<span className="text-[var(--primary)]">deck</span>
      </span>
      <span className="brand-lockup-dark text-[1.05rem] font-semibold tracking-[-0.02em] text-white">
        Colab<span className="text-[#a5b4fc]">deck</span>
      </span>
    </div>
  );
}
