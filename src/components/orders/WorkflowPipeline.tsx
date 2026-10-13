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
    <div className="flex gap-1.5 overflow-x-auto pb-0.5">
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
              className={
                isCurrent
                  ? 'shrink-0 ring-2 ring-[var(--primary)] ring-offset-1'
                  : 'shrink-0 opacity-80'
              }
            />
          );
        }

        return (
          <span
            key={status.id}
            className="shrink-0 rounded-full px-2.5 py-0.5 text-[11px] opacity-50"
            style={statusFillStyle(status)}
          >
            {status.name}
          </span>
        );
      })}
    </div>
  );
}
