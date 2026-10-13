'use client';

import { useEffect, useMemo, useState } from 'react';
import { apiRequest } from '@/lib/api-client';
import { ApiResponse } from '@/lib/auth';
import {
  MasterDataStatus,
  parseStatusMetadata,
  statusFillStyle,
} from '@/lib/order-status';

interface FolderStatusFieldProps {
  value: string;
  onChange: (statusId: string) => void;
  disabled?: boolean;
  label?: string;
  /** Keep the current status visible even if this role cannot set it. */
  pinnedOption?: MasterDataStatus | null;
  /** Limit options to statuses settable by these folder audiences. */
  allowedSetByRoles?: string[];
}

export function FolderStatusField({
  value,
  onChange,
  disabled = false,
  label = 'Folder Status',
  pinnedOption = null,
  allowedSetByRoles,
}: FolderStatusFieldProps) {
  const [options, setOptions] = useState<MasterDataStatus[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    setIsLoading(true);
    apiRequest<ApiResponse<MasterDataStatus[]>>('/orders/meta/folder-statuses')
      .then((response) =>
        setOptions(
          response.data.map((item) => ({
            ...item,
            metadata: parseStatusMetadata(item.metadata),
          })),
        ),
      )
      .catch(() => setOptions([]))
      .finally(() => setIsLoading(false));
  }, []);

  const mergedOptions = useMemo(() => {
    const scoped = allowedSetByRoles?.length
      ? options.filter((item) => {
          const setBy = (item.metadata as { setByRoles?: string[] } | undefined)
            ?.setByRoles;
          if (!Array.isArray(setBy) || setBy.length === 0) {
            return true;
          }
          return setBy.some((role) => allowedSetByRoles.includes(role));
        })
      : options;

    if (!pinnedOption?.id) {
      return scoped;
    }
    if (scoped.some((item) => item.id === pinnedOption.id)) {
      return scoped;
    }
    return [
      {
        ...pinnedOption,
        metadata: parseStatusMetadata(pinnedOption.metadata),
      },
      ...scoped,
    ];
  }, [options, pinnedOption, allowedSetByRoles]);

  const selected = mergedOptions.find((item) => item.id === value);

  return (
    <label className="block space-y-1.5">
      {label ? (
        <span className="text-sm font-medium text-[var(--foreground)]">
          {label}
        </span>
      ) : null}
      <select
        value={value}
        disabled={disabled || isLoading}
        onChange={(event) => onChange(event.target.value)}
        className="w-full rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-sm"
        style={selected ? statusFillStyle(selected) : undefined}
      >
        <option value="">Select status…</option>
        {mergedOptions.map((status) => (
          <option key={status.id} value={status.id}>
            {status.name}
          </option>
        ))}
      </select>
      {isLoading ? (
        <span className="text-xs text-[var(--muted)]">Loading statuses…</span>
      ) : null}
    </label>
  );
}
