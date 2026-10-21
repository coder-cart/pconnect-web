import { cn } from '@/lib/cn';
import { getInitials } from '@/lib/navigation';

interface AvatarProps {
  name: string;
  imageUrl?: string;
  size?: 'xs' | 'sm' | 'md' | 'lg';
  className?: string;
}

const sizeClasses = {
  xs: 'h-6 w-6 text-[10px]',
  sm: 'h-8 w-8 text-xs',
  md: 'h-10 w-10 text-sm',
  lg: 'h-12 w-12 text-base',
};

export function Avatar({
  name,
  imageUrl,
  size = 'md',
  className,
}: AvatarProps) {
  if (imageUrl) {
    return (
      <img
        src={imageUrl}
        alt={name}
        className={cn(
          'rounded-full object-cover ring-2 ring-[var(--surface)]',
          sizeClasses[size],
          className,
        )}
      />
    );
  }

  return (
    <div
      aria-label={name}
      className={cn(
        'inline-flex items-center justify-center rounded-full bg-[var(--primary-soft)] font-semibold text-[var(--primary)] ring-2 ring-[var(--surface)]',
        sizeClasses[size],
        className,
      )}
    >
      {getInitials(name)}
    </div>
  );
}
