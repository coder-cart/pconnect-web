import { contrastOnColor, statusColor } from '@/lib/order-status';

interface StatusBadgeProps {
  label: string;
  metadata?: { color?: string } | null;
  className?: string;
}

export function StatusBadge({ label, metadata, className = '' }: StatusBadgeProps) {
  const background = statusColor(metadata ? { metadata } : null);
  const color = contrastOnColor(background);

  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${className}`}
      style={{ backgroundColor: background, color }}
    >
      {label}
    </span>
  );
}

interface ColoredSelectOptionProps {
  label: string;
  color?: string;
}

export function ColoredSelectOption({ label, color }: ColoredSelectOptionProps) {
  if (!color) {
    return <>{label}</>;
  }

  return (
    <span className="inline-flex items-center gap-2">
      <span
        className="inline-block h-3 w-3 rounded-sm border border-black/10"
        style={{ backgroundColor: color }}
      />
      {label}
    </span>
  );
}
