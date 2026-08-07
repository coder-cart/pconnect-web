'use client';

import {
  MasterDataStatus,
  parseStatusMetadata,
  statusFillStyle,
} from '@/lib/order-status';
import { StatusBadge } from '@/components/orders/StatusBadge';

interface WorkflowPipelineProps {
  statuses: MasterDataStatus[];
  currentCode?: string | null;
}

export function WorkflowPipeline({
  statuses,
  currentCode,
}: WorkflowPipelineProps) {
  const currentIndex = statuses.findIndex((status) => status.code === currentCode);

  return (
    <div className="flex flex-wrap gap-2">
      {statuses.map((status, index) => {
        const isCurrent = status.code === currentCode;
        const isPast = currentIndex >= 0 && index < currentIndex;
        const metadata = parseStatusMetadata(status.metadata);

        if (isCurrent || isPast) {
          return (
            <StatusBadge
              key={status.id}
              label={status.name}
              metadata={metadata}
              className={isCurrent ? 'ring-2 ring-[var(--primary)] ring-offset-1' : 'opacity-80'}
            />
          );
        }

        return (
          <span
            key={status.id}
            className="rounded-full px-3 py-1 text-xs opacity-55"
            style={statusFillStyle(status)}
          >
            {status.name}
          </span>
        );
      })}
    </div>
  );
}
