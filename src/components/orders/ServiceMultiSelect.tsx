'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { Check, ChevronDown, X } from 'lucide-react';
import { apiRequest } from '@/lib/api-client';
import { ApiResponse } from '@/lib/auth';
import { cn } from '@/lib/cn';

export interface ProductionServiceOption {
  id: string;
  code: string;
  name: string;
  isActive?: boolean;
}

interface ServiceMultiSelectProps {
  value: string[];
  onChange: (serviceIds: string[], servicesText: string) => void;
  disabled?: boolean;
  /** Show only selected codes as chips; open a dropdown to edit (Excel cell / forms). */
  compact?: boolean;
  /**
   * When provided, use these services instead of fetching the full catalogue.
   * Used to scope selection to a client's enabled services.
   */
  options?: ProductionServiceOption[];
}

export function ServiceMultiSelect({
  value,
  onChange,
  disabled = false,
  compact = false,
  options,
}: ServiceMultiSelectProps) {
  const [fetched, setFetched] = useState<ProductionServiceOption[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (options) {
      setIsLoading(false);
      return;
    }
    apiRequest<ApiResponse<ProductionServiceOption[]>>('/master-data/services')
      .then((response) =>
        setFetched(response.data.filter((item) => item.isActive !== false)),
      )
      .finally(() => setIsLoading(false));
  }, [options]);

  const services = options ?? fetched;

  useEffect(() => {
    if (!open) return;
    function handlePointer(event: MouseEvent) {
      if (!rootRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    }
    function handleKey(event: KeyboardEvent) {
      if (event.key === 'Escape') setOpen(false);
    }
    document.addEventListener('mousedown', handlePointer);
    document.addEventListener('keydown', handleKey);
    return () => {
      document.removeEventListener('mousedown', handlePointer);
      document.removeEventListener('keydown', handleKey);
    };
  }, [open]);

  const selectedSet = useMemo(() => new Set(value), [value]);
  const selectedServices = useMemo(
    () => services.filter((service) => selectedSet.has(service.id)),
    [services, selectedSet],
  );

  function emit(nextIds: string[]) {
    const codes = services
      .filter((service) => nextIds.includes(service.id))
      .map((service) => service.code)
      .join(', ');
    onChange(nextIds, codes);
  }

  function toggle(serviceId: string) {
    if (disabled) return;
    const next = selectedSet.has(serviceId)
      ? value.filter((id) => id !== serviceId)
      : [...value, serviceId];
    emit(next);
  }

  function remove(serviceId: string) {
    if (disabled) return;
    emit(value.filter((id) => id !== serviceId));
  }

  if (isLoading) {
    return <p className="text-xs text-[var(--muted)]">Loading services…</p>;
  }

  return (
    <div ref={rootRef} className={cn('relative', compact ? 'min-w-[140px]' : 'w-full')}>
      <button
        type="button"
        disabled={disabled}
        onClick={() => setOpen((current) => !current)}
        className={cn(
          'flex w-full items-center gap-2 rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--surface)] px-2 py-1.5 text-left text-sm transition-colors hover:bg-[var(--surface-muted)]',
          disabled ? 'cursor-not-allowed opacity-60' : '',
          open ? 'ring-2 ring-[var(--primary-soft)] border-[var(--primary)]' : '',
        )}
      >
        <div className="flex min-h-[1.5rem] flex-1 flex-wrap gap-1">
          {selectedServices.length === 0 ? (
            <span className="text-[var(--muted)]">Select services…</span>
          ) : (
            selectedServices.map((service) => (
              <span
                key={service.id}
                className="inline-flex items-center gap-1 rounded-full bg-[var(--primary-soft)] px-2 py-0.5 text-xs font-medium text-[var(--primary)]"
              >
                {service.code}
                {!disabled ? (
                  <span
                    role="button"
                    tabIndex={-1}
                    aria-label={`Remove ${service.code}`}
                    className="rounded-full hover:bg-[var(--primary)]/15"
                    onClick={(event) => {
                      event.stopPropagation();
                      remove(service.id);
                    }}
                    onKeyDown={(event) => {
                      if (event.key === 'Enter' || event.key === ' ') {
                        event.preventDefault();
                        event.stopPropagation();
                        remove(service.id);
                      }
                    }}
                  >
                    <X className="h-3 w-3" />
                  </span>
                ) : null}
              </span>
            ))
          )}
        </div>
        <ChevronDown
          className={cn(
            'h-4 w-4 shrink-0 text-[var(--muted)] transition-transform',
            open ? 'rotate-180' : '',
          )}
        />
      </button>

      {open ? (
        <div
          className={cn(
            'absolute z-30 mt-1 max-h-56 w-full min-w-[220px] overflow-y-auto rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--surface)] p-1 shadow-[var(--shadow-md)]',
            compact ? 'left-0' : '',
          )}
        >
          {services.map((service) => {
            const selected = selectedSet.has(service.id);
            return (
              <button
                key={service.id}
                type="button"
                disabled={disabled}
                onClick={() => toggle(service.id)}
                className={cn(
                  'flex w-full items-center gap-2 rounded px-2 py-1.5 text-left text-sm hover:bg-[var(--surface-muted)]',
                  selected ? 'bg-[var(--primary-soft)]/40' : '',
                )}
              >
                <span
                  className={cn(
                    'flex h-4 w-4 items-center justify-center rounded border',
                    selected
                      ? 'border-[var(--primary)] bg-[var(--primary)] text-white'
                      : 'border-[var(--border)]',
                  )}
                >
                  {selected ? <Check className="h-3 w-3" /> : null}
                </span>
                <span className="font-medium">{service.code}</span>
                <span className="truncate text-[var(--muted)]">{service.name}</span>
              </button>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}

export function serviceIdsFromLines(
  lines?: Array<{ service: { id: string } }>,
): string[] {
  return lines?.map((line) => line.service.id) ?? [];
}
