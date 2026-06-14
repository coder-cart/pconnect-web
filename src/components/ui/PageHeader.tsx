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
    <div className={cn('mb-6 space-y-4 animate-fade-in', className)}>
      {breadcrumbs ? <Breadcrumbs items={breadcrumbs} /> : null}

      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <h1 className="text-xl font-semibold tracking-tight text-[var(--foreground)] sm:text-2xl">
            {title}
          </h1>
          {description ? (
            <p className="mt-1 text-sm text-[var(--muted)]">{description}</p>
          ) : null}
        </div>
        {action ? <div className="flex flex-wrap gap-2">{action}</div> : null}
      </div>
    </div>
  );
}
