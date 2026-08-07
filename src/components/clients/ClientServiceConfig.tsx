'use client';

import { useCallback, useEffect, useState } from 'react';
import { Save } from 'lucide-react';
import { apiRequest } from '@/lib/api-client';
import { ApiResponse } from '@/lib/auth';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { ListSkeleton } from '@/components/ui/Skeleton';
import { ErrorState, EmptyState } from '@/components/ui/StatePanels';

interface ClientServiceRow {
  serviceId: string;
  code: string;
  name: string;
  category?: string | null;
  defaultUnit: string;
  defaultClientPrice: number | null;
  defaultEtaHours: number | null;
  enabled: boolean;
  clientPrice: number | null;
  clientEtaHours: number | null;
  defaultInstructions: string | null;
  effectivePrice: number | null;
  effectiveEtaHours: number | null;
}

interface EditableRow {
  serviceId: string;
  enabled: boolean;
  clientPrice: string;
  clientEtaHours: string;
  defaultInstructions: string;
}

interface ClientServiceConfigProps {
  clientId: string;
  canManage: boolean;
}

export function ClientServiceConfig({
  clientId,
  canManage,
}: ClientServiceConfigProps) {
  const [rows, setRows] = useState<ClientServiceRow[]>([]);
  const [edits, setEdits] = useState<Record<string, EditableRow>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [savedAt, setSavedAt] = useState<number | null>(null);

  const load = useCallback(async () => {
    setIsLoading(true);
    try {
      const response = await apiRequest<ApiResponse<ClientServiceRow[]>>(
        `/clients/${clientId}/services`,
      );
      setRows(response.data);
      const nextEdits: Record<string, EditableRow> = {};
      for (const row of response.data) {
        nextEdits[row.serviceId] = {
          serviceId: row.serviceId,
          enabled: row.enabled,
          clientPrice: row.clientPrice != null ? String(row.clientPrice) : '',
          clientEtaHours:
            row.clientEtaHours != null ? String(row.clientEtaHours) : '',
          defaultInstructions: row.defaultInstructions ?? '',
        };
      }
      setEdits(nextEdits);
      setErrorMessage(null);
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : 'Failed to load services',
      );
    } finally {
      setIsLoading(false);
    }
  }, [clientId]);

  useEffect(() => {
    void load();
  }, [load]);

  function updateEdit(serviceId: string, patch: Partial<EditableRow>) {
    setEdits((prev) => ({
      ...prev,
      [serviceId]: { ...prev[serviceId], ...patch },
    }));
    setSavedAt(null);
  }

  async function handleSave() {
    setIsSaving(true);
    setSaveError(null);
    try {
      await apiRequest(`/clients/${clientId}/services`, {
        method: 'PUT',
        body: JSON.stringify({
          services: Object.values(edits).map((edit) => ({
            serviceId: edit.serviceId,
            enabled: edit.enabled,
            clientPrice: edit.clientPrice ? Number(edit.clientPrice) : null,
            clientEtaHours: edit.clientEtaHours
              ? Number(edit.clientEtaHours)
              : null,
            defaultInstructions: edit.defaultInstructions.trim() || null,
          })),
        }),
      });
      await load();
      setSavedAt(Date.now());
    } catch (error) {
      setSaveError(error instanceof Error ? error.message : 'Save failed');
    } finally {
      setIsSaving(false);
    }
  }

  if (isLoading) return <ListSkeleton rows={6} />;
  if (errorMessage) {
    return (
      <ErrorState
        title="Unable to load service configuration"
        description={errorMessage}
      />
    );
  }
  if (rows.length === 0) {
    return (
      <EmptyState
        title="No services available"
        description="Add services in Settings → Service Master to configure them for this client."
      />
    );
  }

  return (
    <Card>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-base font-semibold text-[var(--foreground)]">
            Service Configuration
          </h2>
          <p className="mt-1 text-xs text-[var(--muted)]">
            Enable services for this client and optionally override the default
            price and ETA. Blank fields inherit the Service Master defaults.
            Changes only affect future orders.
          </p>
        </div>
        {canManage ? (
          <div className="flex items-center gap-3">
            {savedAt ? (
              <span className="text-xs text-[var(--success)]">Saved</span>
            ) : null}
            <Button onClick={() => void handleSave()} disabled={isSaving}>
              <Save className="h-4 w-4" />
              {isSaving ? 'Saving…' : 'Save configuration'}
            </Button>
          </div>
        ) : null}
      </div>

      {saveError ? (
        <p className="mb-3 text-sm text-[var(--danger)]">{saveError}</p>
      ) : null}

      <div className="overflow-x-auto">
        <table className="w-full min-w-[720px] text-left text-sm">
          <thead>
                <tr className="border-b border-[var(--border)] text-xs font-medium uppercase tracking-wide text-[var(--muted)]">
                  <th className="pb-2 pr-4 font-medium">Enable</th>
                  <th className="pb-2 pr-4 font-medium">Service</th>
                  <th className="pb-2 pr-4 text-right font-medium">Client Price</th>
                  <th className="pb-2 pr-4 text-right font-medium">Client ETA</th>
                  <th className="pb-2 pr-4 font-medium">Unit</th>
                  <th className="pb-2 font-medium">Default Instructions</th>
                </tr>
          </thead>
          <tbody>
            {rows.map((row) => {
              const edit = edits[row.serviceId];
              if (!edit) return null;
              const disabled = !canManage;
              return (
                <tr
                  key={row.serviceId}
                  className="border-b border-[var(--border)] last:border-0"
                >
                  <td className="py-3 pr-4">
                    <input
                      type="checkbox"
                      checked={edit.enabled}
                      disabled={disabled}
                      onChange={(event) =>
                        updateEdit(row.serviceId, {
                          enabled: event.target.checked,
                        })
                      }
                      aria-label={`Enable ${row.name}`}
                    />
                  </td>
                  <td className="py-3 pr-4">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-[var(--foreground)]">
                        {row.name}
                      </span>
                      <Badge variant="neutral">{row.code}</Badge>
                    </div>
                    {row.category ? (
                      <div className="text-xs text-[var(--muted)]">
                        {row.category}
                      </div>
                    ) : null}
                  </td>
                  <td className="py-3 pr-4 text-right">
                    {edit.enabled ? (
                      <input
                        type="number"
                        min={0}
                        step="0.01"
                        value={edit.clientPrice}
                        disabled={disabled}
                        placeholder={
                          row.defaultClientPrice != null
                            ? String(row.defaultClientPrice)
                            : '—'
                        }
                        onChange={(event) =>
                          updateEdit(row.serviceId, {
                            clientPrice: event.target.value,
                          })
                        }
                        className="w-24 rounded border border-[var(--border)] bg-[var(--surface)] px-2 py-1 text-right text-sm disabled:opacity-60"
                      />
                    ) : (
                      <span className="text-[var(--muted)]">—</span>
                    )}
                  </td>
                  <td className="py-3 pr-4 text-right">
                    {edit.enabled ? (
                      <div className="flex items-center justify-end gap-1">
                        <input
                          type="number"
                          min={0}
                          value={edit.clientEtaHours}
                          disabled={disabled}
                          placeholder={
                            row.defaultEtaHours != null
                              ? String(row.defaultEtaHours)
                              : '—'
                          }
                          onChange={(event) =>
                            updateEdit(row.serviceId, {
                              clientEtaHours: event.target.value,
                            })
                          }
                          className="w-20 rounded border border-[var(--border)] bg-[var(--surface)] px-2 py-1 text-right text-sm disabled:opacity-60"
                        />
                        <span className="text-xs text-[var(--muted)]">hrs</span>
                      </div>
                    ) : (
                      <span className="text-[var(--muted)]">—</span>
                    )}
                  </td>
                  <td className="py-3 pr-4 text-[var(--muted-foreground)]">
                    {edit.enabled ? row.defaultUnit : '—'}
                  </td>
                  <td className="py-3">
                    {edit.enabled ? (
                      <input
                        value={edit.defaultInstructions}
                        disabled={disabled}
                        placeholder="Match previous edits"
                        onChange={(event) =>
                          updateEdit(row.serviceId, {
                            defaultInstructions: event.target.value,
                          })
                        }
                        className="w-full min-w-[160px] rounded border border-[var(--border)] bg-[var(--surface)] px-2 py-1 text-sm disabled:opacity-60"
                      />
                    ) : (
                      <span className="text-[var(--muted)]">—</span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <p className="mt-3 text-xs text-[var(--muted)]">
        Placeholder values are the Service Master defaults inherited when no
        override is set.
      </p>
    </Card>
  );
}
