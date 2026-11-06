'use client';

import { useState } from 'react';
import { cn } from '@/lib/cn';
import {
  outputFormatImageSrc,
  outputFormatLabel,
} from '@/lib/output-format';

interface OutputFormatThumbProps {
  outputFormat?: string | null;
  className?: string;
  size?: 'sm' | 'md';
}

export function OutputFormatThumb({
  outputFormat,
  className,
  size = 'md',
}: OutputFormatThumbProps) {
  const label = outputFormatLabel(outputFormat);
  const src = outputFormatImageSrc(outputFormat);
  const [failed, setFailed] = useState(false);

  return (
    <div
      className={cn(
        'relative shrink-0 overflow-hidden rounded-[var(--radius-md)] bg-[var(--surface-muted)]',
        size === 'md' ? 'h-14 w-14' : 'h-9 w-9',
        className,
      )}
      title={`Output: ${label}`}
      aria-label={`Output format ${label}`}
    >
      {failed ? (
        <span className="flex h-full w-full items-center justify-center text-[10px] font-semibold text-[var(--muted)]">
          {label}
        </span>
      ) : (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={src}
          alt=""
          className="h-full w-full object-cover"
          onError={() => setFailed(true)}
        />
      )}
    </div>
  );
}
