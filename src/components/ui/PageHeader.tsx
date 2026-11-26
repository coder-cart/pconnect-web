import { ReactNode } from 'react';
import { Breadcrumbs, BreadcrumbItem } from '@/components/ui/Breadcrumbs';
import { cn } from '@/lib/cn';

interface PageHeaderProps {
  title: string;
  description?: string;
  breadcrumbs?: BreadcrumbItem[];
  action?: ReactNode;
  className?: string;
}

export function PageHeader({
  title,
  description,
  breadcrumbs,
  action,
  className,
}: PageHeaderProps) {
  return (
    <div className={cn('mb-3 space-y-2 animate-fade-in sm:mb-5 sm:space-y-3', className)}>
      {breadcrumbs ? <Breadcrumbs items={breadcrumbs} /> : null}

      <div className="flex flex-col gap-3 sm:gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0">
          <h1 className="break-words text-[length:var(--text-page-title)] font-semibold leading-[var(--leading-tight)] tracking-tight text-[var(--foreground)] sm:text-xl">
            {title}
          </h1>
          {description ? (
            <p className="mt-1 text-[length:var(--text-body)] leading-[var(--leading-body)] text-[var(--muted)]">
              {description}
            </p>
          ) : null}
        </div>
        {action ? (
          <div className="flex w-full flex-wrap gap-2 sm:w-auto lg:justify-end">
            {action}
          </div>
        ) : null}
      </div>
    </div>
  );
}
