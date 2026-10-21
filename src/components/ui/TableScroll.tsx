import { ReactNode } from 'react';
import { cn } from '@/lib/cn';

interface TableScrollProps {
  children: ReactNode;
  className?: string;
}

/** Keeps wide tables scrolling inside the data region, not the whole page. */
export function TableScroll({ children, className }: TableScrollProps) {
  return (
    <div className={cn('min-w-0 overflow-x-auto overscroll-x-contain', className)}>
      {children}
    </div>
  );
}
