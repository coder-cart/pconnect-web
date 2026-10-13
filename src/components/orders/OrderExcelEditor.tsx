'use client';

import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { apiRequest } from '@/lib/api-client';
import { ApiResponse } from '@/lib/auth';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { OrderSummary } from '@/lib/orders';
import {
  MasterDataStatus,
  computeOrderCost,
  parseStatusMetadata,
  statusFillStyle,
} from '@/lib/order-status';
import { StatusBadge } from '@/components/orders/StatusBadge';
import { FolderStatusField } from '@/components/orders/FolderStatusField';
import {
  ServiceMultiSelect,
  serviceIdsFromLines,
} from '@/components/orders/ServiceMultiSelect';

interface ClientOption {
  id: string;
  name: string;
}

interface UserOption {
  id: string;
  fullName: string;
}

interface AllocationDraft {
  key: string;
  id?: string;
  inFileCount: string;
  outFileCount: string;
  rejectedFileCount: string;
  extraServiceCount: string;
  price: string;
  serviceIds: string[];
  servicesText: string;
  assignedArtistUserId: string;
  artistRatePerImage: string;
  /** Per-editor Excel row status (independent of order folder status). */
  folderStatusId: string;
}

interface OrderExcelEditorProps {
  order: OrderSummary;
  canViewFinance: boolean;
  onUpdated: () => void;
  /** When set, renders below the grid inside the same card (no second Card). */
  footer?: ReactNode;
}

function toDateInput(value?: string | null) {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return date.toISOString().slice(0, 10);
}

function emptyAllocation(partial?: Partial<AllocationDraft>): AllocationDraft {
  return {
    key: partial?.key ?? `new-${Math.random().toString(36).slice(2, 9)}`,
    id: partial?.id,
    inFileCount: partial?.inFileCount ?? '0',
    outFileCount: partial?.outFileCount ?? '0',
    rejectedFileCount: partial?.rejectedFileCount ?? '0',
    extraServiceCount: partial?.extraServiceCount ?? '0',
    price: partial?.price ?? '',
    serviceIds: partial?.serviceIds ?? [],
    servicesText: partial?.servicesText ?? '',
    assignedArtistUserId: partial?.assignedArtistUserId ?? '',
    artistRatePerImage: partial?.artistRatePerImage ?? '',
    folderStatusId: partial?.folderStatusId ?? '',
  };
}

function allocationsFromOrder(order: OrderSummary): AllocationDraft[] {
  if (order.workAllocations?.length) {
    return order.workAllocations.map((row, index) =>
      emptyAllocation({
        key: row.id || `row-${index}`,
        id: row.id,
        inFileCount: String(row.inFileCount ?? 0),
        outFileCount: String(row.outFileCount ?? 0),
        rejectedFileCount: String(row.rejectedFileCount ?? 0),
        extraServiceCount: String(row.extraServiceCount ?? 0),
        price: row.price != null ? String(row.price) : '',
        serviceIds: serviceIdsFromLines(row.serviceLines),
        servicesText:
          row.serviceLines?.map((line) => line.service.code).join(', ') ?? '',
        assignedArtistUserId: row.assignedArtist?.id ?? row.assignedArtistUserId ?? '',
        artistRatePerImage:
          row.artistRatePerImage != null ? String(row.artistRatePerImage) : '',
        folderStatusId: row.folderStatusId ?? row.folderStatus?.id ?? '',
      }),
    );
  }

  return [
    emptyAllocation({
      inFileCount: String(order.inFileCount ?? order.imageCount ?? 0),
      outFileCount: String(order.outFileCount ?? 0),
      rejectedFileCount: String(order.rejectedFileCount ?? 0),
      extraServiceCount: String(order.extraServiceCount ?? 0),
      price: order.price != null ? String(order.price) : '',
      serviceIds: serviceIdsFromLines(order.serviceLines),
      servicesText: order.services ?? '',
      assignedArtistUserId: order.assignedArtist?.id ?? '',
      artistRatePerImage:
        order.artistRatePerImage != null ? String(order.artistRatePerImage) : '',
    }),
  ];
}

export function OrderExcelEditor({
  order,
  canViewFinance,
  onUpdated,
  footer,
}: OrderExcelEditorProps) {
  const [clients, setClients] = useState<ClientOption[]>([]);
  const [folderStatuses, setFolderStatuses] = useState<MasterDataStatus[]>([]);
  const [users, setUsers] = useState<UserOption[]>([]);
  const [busy, setBusy] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const [clientOrganizationId, setClientOrganizationId] = useState(
    order.clientOrganization?.id ?? '',
  );
  const [name, setName] = useState(order.name);
  const [inDate, setInDate] = useState(toDateInput(order.inDate));
  const [outDate, setOutDate] = useState(toDateInput(order.outDate));
  const [folderStatusId, setFolderStatusId] = useState(order.folderStatus?.id ?? '');
  const [priority, setPriority] = useState(order.priority ?? 'medium');
  const [estimatedTatHours, setEstimatedTatHours] = useState(
    String(order.estimatedTatHours ?? ''),
  );
  const [timeSpentMinutes, setTimeSpentMinutes] = useState(
    String(order.timeSpentMinutes ?? 0),
  );
  const [clientNotes, setClientNotes] = useState(order.clientNotes ?? '');
  const [internalNotes, setInternalNotes] = useState(order.internalNotes ?? '');
  const [allocations, setAllocations] = useState<AllocationDraft[]>(() =>
    allocationsFromOrder(order),
  );

  useEffect(() => {
    setClientOrganizationId(order.clientOrganization?.id ?? '');
    setName(order.name);
    setInDate(toDateInput(order.inDate));
    setOutDate(toDateInput(order.outDate));
    setFolderStatusId(order.folderStatus?.id ?? '');
    setPriority(order.priority ?? 'medium');
    setEstimatedTatHours(String(order.estimatedTatHours ?? ''));
    setTimeSpentMinutes(String(order.timeSpentMinutes ?? 0));
    setClientNotes(order.clientNotes ?? '');
    setInternalNotes(order.internalNotes ?? '');
    setAllocations(allocationsFromOrder(order));
  }, [order]);

  useEffect(() => {
    Promise.all([
      apiRequest<ApiResponse<ClientOption[]>>('/clients'),
      apiRequest<ApiResponse<MasterDataStatus[]>>(
        '/orders/meta/folder-statuses',
      ),
      apiRequest<ApiResponse<UserOption[]>>('/orders/meta/assignable-users'),
    ]).then(([clientsRes, folderRes, usersRes]) => {
      setClients(clientsRes.data);
      setFolderStatuses(
        folderRes.data.map((item) => ({
          ...item,
          metadata: parseStatusMetadata(item.metadata),
        })),
      );
      setUsers(usersRes.data);
    });
  }, []);

  useEffect(() => {
    if (!canViewFinance || !clientOrganizationId) return;
    const rowNeedingRate = allocations.find(
      (row) => row.serviceIds.length > 0 && !row.artistRatePerImage,
    );
    if (!rowNeedingRate) return;

    const primaryServiceId = rowNeedingRate.serviceIds[0];
    let cancelled = false;

    apiRequest<
      ApiResponse<{
        artistRatePerImage?: string | number | null;
        estimatedTatHours?: number | null;
      }>
    >(
      `/orders/client-service-rate?clientOrganizationId=${clientOrganizationId}&serviceId=${primaryServiceId}`,
    )
      .then((response) => {
        if (cancelled) return;
        if (response.data.artistRatePerImage != null) {
          const rate = String(response.data.artistRatePerImage);
          setAllocations((rows) =>
            rows.map((row) =>
              row.artistRatePerImage
                ? row
                : { ...row, artistRatePerImage: rate },
            ),
          );
        }
        if (response.data.estimatedTatHours != null) {
          setEstimatedTatHours(String(response.data.estimatedTatHours));
        }
      })
      .catch(() => undefined);

    return () => {
      cancelled = true;
    };
    // Only re-resolve when client or empty-rate service selection changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    clientOrganizationId,
    canViewFinance,
    allocations.map((row) => `${row.serviceIds.join(',')}:${row.artistRatePerImage}`).join('|'),
  ]);

  const rowCosts = useMemo(
    () =>
      allocations.map((row) =>
        computeOrderCost({
          outFileCount: Number(row.outFileCount) || 0,
          artistRatePerImage: row.artistRatePerImage || null,
        }),
      ),
    [allocations],
  );

  const totalCost = useMemo(() => {
    const values = rowCosts.filter((value): value is number => value != null);
    if (!values.length) return null;
    return Math.round(values.reduce((sum, value) => sum + value, 0) * 100) / 100;
  }, [rowCosts]);

  function updateAllocation(key: string, patch: Partial<AllocationDraft>) {
    setAllocations((rows) =>
      rows.map((row) => (row.key === key ? { ...row, ...patch } : row)),
    );
  }

  function addAllocationRow() {
    setAllocations((rows) => [...rows, emptyAllocation()]);
  }

  function removeAllocationRow(key: string) {
    setAllocations((rows) => (rows.length <= 1 ? rows : rows.filter((row) => row.key !== key)));
  }

  async function handleSave() {
    setBusy(true);
    setErrorMessage(null);
    try {
      await apiRequest(`/orders/${order.id}`, {
        method: 'PATCH',
        body: JSON.stringify({
          name: name.trim(),
          clientOrganizationId: clientOrganizationId || null,
          inDate: inDate || undefined,
          outDate: outDate || undefined,
          folderStatusId: folderStatusId || null,
          priority,
          estimatedTatHours: estimatedTatHours
            ? Number(estimatedTatHours)
            : undefined,
          timeSpentMinutes: Number(timeSpentMinutes) || 0,
          clientNotes: clientNotes.trim() || null,
          internalNotes: internalNotes.trim() || null,
        }),
      });

      await apiRequest(`/orders/${order.id}/work-allocations`, {
        method: 'PUT',
        body: JSON.stringify({
          allocations: allocations.map((row, index) => ({
            id: row.id,
            assignedArtistUserId: row.assignedArtistUserId || null,
            inFileCount: Number(row.inFileCount) || 0,
            outFileCount: Number(row.outFileCount) || 0,
            rejectedFileCount: Number(row.rejectedFileCount) || 0,
            extraServiceCount: Number(row.extraServiceCount) || 0,
            price: row.price ? Number(row.price) : null,
            artistRatePerImage: row.artistRatePerImage
              ? Number(row.artistRatePerImage)
              : null,
            cost: rowCosts[index] ?? null,
            sortOrder: index,
            serviceIds: row.serviceIds,
            folderStatusId: row.folderStatusId || null,
          })),
        }),
      });
      onUpdated();
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Save failed');
    } finally {
      setBusy(false);
    }
  }

  const folderStatusOptions = useMemo(() => {
    const byId = new Map(folderStatuses.map((item) => [item.id, item]));

    if (
      folderStatusId &&
      !byId.has(folderStatusId) &&
      order.folderStatus?.id === folderStatusId
    ) {
      byId.set(folderStatusId, {
        id: order.folderStatus.id,
        code: order.folderStatus.code,
        name: order.folderStatus.name,
        metadata: parseStatusMetadata(order.folderStatus.metadata),
      });
    }

    for (const row of order.workAllocations ?? []) {
      const statusId = row.folderStatusId ?? row.folderStatus?.id;
      if (statusId && !byId.has(statusId) && row.folderStatus) {
        byId.set(statusId, {
          id: row.folderStatus.id,
          code: row.folderStatus.code ?? '',
          name: row.folderStatus.name,
          metadata: parseStatusMetadata(row.folderStatus.metadata),
        });
      }
    }

    return Array.from(byId.values());
  }, [folderStatuses, folderStatusId, order.folderStatus, order.workAllocations]);

  const selectedFolder = folderStatusOptions.find(
    (item) => item.id === folderStatusId,
  );

  return (
    <Card padding="none" className="overflow-hidden">
      {errorMessage ? (
        <p className="border-b border-[var(--border)] px-4 py-2 text-sm text-[var(--danger)]">
          {errorMessage}
        </p>
      ) : null}

      <div className="flex items-center justify-between gap-3 border-b border-[var(--border)] px-4 py-2.5">
        <div>
          <h3 className="text-sm font-medium text-[var(--foreground)]">
            Production sheet
          </h3>
          <p className="text-xs text-[var(--muted)]">
            One row per artist · save applies order header and all rows
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <Button size="sm" variant="secondary" onClick={addAllocationRow} disabled={busy}>
            Add row
          </Button>
          <Button size="sm" onClick={handleSave} disabled={busy}>
            Save
          </Button>
        </div>
      </div>

      <div className="grid gap-x-3 gap-y-2 border-b border-[var(--border)] bg-[var(--surface-muted)] px-4 py-3 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-6">
        <label className="text-sm lg:col-span-2">
          <span className="mb-1 block text-[11px] font-medium uppercase tracking-wide text-[var(--muted)]">
            Client
          </span>
          <select
            value={clientOrganizationId}
            onChange={(event) => setClientOrganizationId(event.target.value)}
            className="h-9 w-full rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--surface)] px-2 text-sm"
          >
            <option value="">—</option>
            {clients.map((client) => (
              <option key={client.id} value={client.id}>
                {client.name}
              </option>
            ))}
          </select>
        </label>
        <label className="text-sm sm:col-span-2 lg:col-span-2">
          <span className="mb-1 block text-[11px] font-medium uppercase tracking-wide text-[var(--muted)]">
            Order name
          </span>
          <input
            value={name}
            onChange={(event) => setName(event.target.value)}
            className="h-9 w-full rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--surface)] px-2 text-sm"
          />
        </label>
        <label className="text-sm">
          <span className="mb-1 block text-[11px] font-medium uppercase tracking-wide text-[var(--muted)]">
            Priority
          </span>
          <select
            value={priority}
            onChange={(event) => setPriority(event.target.value)}
            className="h-9 w-full rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--surface)] px-2 text-sm capitalize"
          >
            <option value="low">low</option>
            <option value="medium">medium</option>
            <option value="high">high</option>
            <option value="urgent">urgent</option>
          </select>
        </label>
        <label className="text-sm">
          <span className="mb-1 block text-[11px] font-medium uppercase tracking-wide text-[var(--muted)]">
            Folder status
          </span>
          <select
            value={folderStatusId}
            onChange={(event) => setFolderStatusId(event.target.value)}
            className="h-9 w-full rounded-[var(--radius-md)] border border-[var(--border)] px-2 text-sm font-medium"
            style={statusFillStyle(selectedFolder)}
          >
            <option value="">—</option>
            {folderStatusOptions.map((status) => (
              <option
                key={status.id}
                value={status.id}
                style={statusFillStyle(status)}
              >
                {status.name}
              </option>
            ))}
          </select>
        </label>
        <label className="text-sm">
          <span className="mb-1 block text-[11px] font-medium uppercase tracking-wide text-[var(--muted)]">
            In date
          </span>
          <input
            type="date"
            value={inDate}
            onChange={(event) => setInDate(event.target.value)}
            className="h-9 w-full rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--surface)] px-2 text-sm"
          />
        </label>
        <label className="text-sm">
          <span className="mb-1 block text-[11px] font-medium uppercase tracking-wide text-[var(--muted)]">
            Out date
          </span>
          <input
            type="date"
            value={outDate}
            onChange={(event) => setOutDate(event.target.value)}
            className="h-9 w-full rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--surface)] px-2 text-sm"
          />
        </label>
        <label className="text-sm">
          <span className="mb-1 block text-[11px] font-medium uppercase tracking-wide text-[var(--muted)]">
            ETA (h)
          </span>
          <input
            type="number"
            min={0}
            value={estimatedTatHours}
            onChange={(event) => setEstimatedTatHours(event.target.value)}
            className="h-9 w-full rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--surface)] px-2 text-sm"
          />
        </label>
        <label className="text-sm">
          <span className="mb-1 block text-[11px] font-medium uppercase tracking-wide text-[var(--muted)]">
            Time (min)
          </span>
          <input
            type="number"
            min={0}
            value={timeSpentMinutes}
            onChange={(event) => setTimeSpentMinutes(event.target.value)}
            className="h-9 w-full rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--surface)] px-2 text-sm"
          />
        </label>
      </div>

      <div className="grid gap-3 border-b border-[var(--border)] px-4 py-3 md:grid-cols-2">
        <label className="text-sm">
          <span className="mb-1 block text-[11px] font-medium uppercase tracking-wide text-[var(--muted)]">
            Notes from client
          </span>
          <textarea
            value={clientNotes}
            onChange={(event) => setClientNotes(event.target.value)}
            rows={2}
            className="w-full resize-y rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--surface)] px-2.5 py-2 text-sm leading-snug"
            placeholder="Client instructions"
          />
        </label>
        <label className="text-sm">
          <span className="mb-1 block text-[11px] font-medium uppercase tracking-wide text-[var(--muted)]">
            Remark
          </span>
          <textarea
            value={internalNotes}
            onChange={(event) => setInternalNotes(event.target.value)}
            rows={2}
            className="w-full resize-y rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--surface)] px-2.5 py-2 text-sm leading-snug"
            placeholder="Internal only"
          />
        </label>
      </div>

      <div className="overflow-x-auto">
        <table className="min-w-full text-sm">
          <thead className="border-b border-[var(--border)] bg-[var(--surface-muted)]">
            <tr>
              {[
                '#',
                'In',
                'Services',
                'Artist',
                'Status',
                'Out',
                'Rejected',
                ...(canViewFinance
                  ? ['Extra', 'Price', 'Artist rate', 'Cost']
                  : []),
                '',
              ].map((heading) => (
                <th
                  key={heading || 'actions'}
                  className="whitespace-nowrap px-2.5 py-2 text-left text-[11px] font-medium uppercase tracking-wide text-[var(--muted)]"
                >
                  {heading}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {allocations.map((row, index) => (
              <tr key={row.key} className="border-b border-[var(--border)] last:border-b-0">
                <td className="px-2.5 py-2 align-middle text-[var(--muted)]">
                  {index + 1}
                </td>
                <td className="px-2.5 py-2 align-middle">
                  <input
                    type="number"
                    min={0}
                    value={row.inFileCount}
                    onChange={(event) =>
                      updateAllocation(row.key, { inFileCount: event.target.value })
                    }
                    className="h-8 w-[4.5rem] rounded border border-[var(--border)] bg-[var(--surface)] px-2 text-sm"
                  />
                </td>
                <td className="min-w-[160px] max-w-[220px] px-2.5 py-2 align-middle">
                  <ServiceMultiSelect
                    compact
                    value={row.serviceIds}
                    onChange={(ids, text) =>
                      updateAllocation(row.key, {
                        serviceIds: ids,
                        servicesText: text,
                      })
                    }
                  />
                </td>
                <td className="px-2.5 py-2 align-middle">
                  <select
                    value={row.assignedArtistUserId}
                    onChange={(event) =>
                      updateAllocation(row.key, {
                        assignedArtistUserId: event.target.value,
                      })
                    }
                    className="h-8 w-full min-w-[7.5rem] rounded border border-[var(--border)] bg-[var(--surface)] px-2 text-sm"
                  >
                    <option value="">—</option>
                    {users.map((user) => (
                      <option key={user.id} value={user.id}>
                        {user.fullName}
                      </option>
                    ))}
                  </select>
                </td>
                <td className="min-w-[8rem] px-2.5 py-2 align-middle">
                  <select
                    value={row.folderStatusId}
                    onChange={(event) =>
                      updateAllocation(row.key, {
                        folderStatusId: event.target.value,
                      })
                    }
                    className="h-8 w-full rounded border border-[var(--border)] px-2 text-sm font-medium"
                    style={statusFillStyle(
                      folderStatusOptions.find(
                        (status) => status.id === row.folderStatusId,
                      ),
                    )}
                    title="This editor's work status"
                  >
                    <option value="">—</option>
                    {folderStatusOptions.map((status) => (
                      <option
                        key={status.id}
                        value={status.id}
                        style={statusFillStyle(status)}
                      >
                        {status.name}
                      </option>
                    ))}
                  </select>
                </td>
                <td className="px-2.5 py-2 align-middle">
                  <input
                    type="number"
                    min={0}
                    value={row.outFileCount}
                    onChange={(event) =>
                      updateAllocation(row.key, { outFileCount: event.target.value })
                    }
                    className="h-8 w-[4.5rem] rounded border border-[var(--border)] bg-[var(--surface)] px-2 text-sm"
                  />
                </td>
                <td className="px-2.5 py-2 align-middle">
                  <input
                    type="number"
                    min={0}
                    value={row.rejectedFileCount}
                    onChange={(event) =>
                      updateAllocation(row.key, {
                        rejectedFileCount: event.target.value,
                      })
                    }
                    className="h-8 w-[4.5rem] rounded border border-[var(--border)] bg-[var(--surface)] px-2 text-sm"
                  />
                </td>
                {canViewFinance ? (
                  <>
                    <td className="px-2.5 py-2 align-middle">
                      <input
                        type="number"
                        min={0}
                        value={row.extraServiceCount}
                        onChange={(event) =>
                          updateAllocation(row.key, {
                            extraServiceCount: event.target.value,
                          })
                        }
                        className="h-8 w-[4.5rem] rounded border border-[var(--border)] bg-[var(--surface)] px-2 text-sm"
                      />
                    </td>
                    <td className="px-2.5 py-2 align-middle">
                      <input
                        type="number"
                        min={0}
                        step="0.01"
                        value={row.price}
                        onChange={(event) =>
                          updateAllocation(row.key, { price: event.target.value })
                        }
                        className="h-8 w-[5.5rem] rounded border border-[var(--border)] bg-[var(--surface)] px-2 text-sm"
                      />
                    </td>
                    <td className="px-2.5 py-2 align-middle">
                      <input
                        type="number"
                        min={0}
                        step="0.01"
                        value={row.artistRatePerImage}
                        onChange={(event) =>
                          updateAllocation(row.key, {
                            artistRatePerImage: event.target.value,
                          })
                        }
                        className="h-8 w-[5.5rem] rounded border border-[var(--border)] bg-[var(--surface)] px-2 text-sm"
                      />
                    </td>
                    <td className="whitespace-nowrap px-2.5 py-2 align-middle font-medium tabular-nums">
                      {rowCosts[index] != null ? `₹${rowCosts[index]}` : '—'}
                    </td>
                  </>
                ) : null}
                <td className="px-2.5 py-2 align-middle">
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => removeAllocationRow(row.key)}
                    disabled={allocations.length <= 1 || busy}
                  >
                    Remove
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2 border-t border-[var(--border)] bg-[var(--surface-muted)] px-4 py-2.5">
        <p className="text-xs text-[var(--muted)]">
          {canViewFinance && totalCost != null ? (
            <>
              Artist cost total <strong className="text-[var(--foreground)]">₹{totalCost}</strong>
              {' · '}
            </>
          ) : null}
          All editors Done/Uploaded → Ready for Delivery
        </p>
        <div className="flex items-center gap-2">
          <Button size="sm" variant="secondary" onClick={addAllocationRow} disabled={busy}>
            Add row
          </Button>
          <Button size="sm" onClick={handleSave} disabled={busy}>
            Save sheet
          </Button>
        </div>
      </div>

      {footer ? (
        <div className="border-t border-[var(--border)] px-4 py-3">{footer}</div>
      ) : null}
    </Card>
  );
}

export function OrderExcelReadOnly({
  order,
  canViewFinance,
  showOrderFolderStatus = true,
  canEditAllocationStatus = false,
  canEditAllAllocationRows = false,
  currentUserId,
  allocationStatusDrafts,
  onAllocationStatusChange,
  onSaveAllocationStatus,
  statusSaveBusy = false,
}: {
  order: OrderSummary;
  canViewFinance: boolean;
  showOrderFolderStatus?: boolean;
  canEditAllocationStatus?: boolean;
  canEditAllAllocationRows?: boolean;
  currentUserId?: string;
  allocationStatusDrafts?: Record<string, string>;
  onAllocationStatusChange?: (allocationId: string, statusId: string) => void;
  onSaveAllocationStatus?: (allocationId: string) => void;
  statusSaveBusy?: boolean;
}) {
  function formatDate(value?: string | null) {
    return value ? new Date(value).toLocaleDateString() : '—';
  }

  const rows =
    order.workAllocations?.length
      ? order.workAllocations
      : [
          {
            id: 'legacy',
            inFileCount: order.inFileCount ?? order.imageCount,
            outFileCount: order.outFileCount,
            rejectedFileCount: order.rejectedFileCount,
            extraServiceCount: order.extraServiceCount,
            price: order.price,
            assignedArtist: order.assignedArtist,
            artistRatePerImage: order.artistRatePerImage,
            cost: order.cost,
            serviceLines: order.serviceLines,
            folderStatus: order.folderStatus,
            folderStatusId: order.folderStatus?.id,
          },
        ];

  return (
    <Card padding="none" className="overflow-hidden">
      <div className="flex items-center justify-between gap-3 border-b border-[var(--border)] px-4 py-2.5">
        <div>
          <h3 className="text-sm font-medium text-[var(--foreground)]">
            {canEditAllAllocationRows ? 'Editor work rows' : 'Your work rows'}
          </h3>
          <p className="text-xs text-[var(--muted)]">
            {canEditAllAllocationRows
              ? 'QA: set Redo to send this editor back.'
              : 'Update status on your row. Done/Uploaded from every editor → Ready for Delivery.'}
          </p>
        </div>
      </div>
      <div className="grid gap-x-4 gap-y-2 border-b border-[var(--border)] bg-[var(--surface-muted)] px-4 py-3 text-sm sm:grid-cols-2 lg:grid-cols-4">
        <div>
          <p className="text-[11px] font-medium uppercase tracking-wide text-[var(--muted)]">
            Client
          </p>
          <p className="mt-0.5">{order.clientOrganization?.name ?? '—'}</p>
        </div>
        <div className="lg:col-span-2">
          <p className="text-[11px] font-medium uppercase tracking-wide text-[var(--muted)]">
            Order
          </p>
          <p className="mt-0.5">{order.name}</p>
        </div>
        {showOrderFolderStatus ? (
          <div>
            <p className="text-[11px] font-medium uppercase tracking-wide text-[var(--muted)]">
              Folder status
            </p>
            <div className="mt-0.5">
              {order.displayFolderStatus || order.folderStatus ? (
                <StatusBadge
                  label={(order.displayFolderStatus ?? order.folderStatus)!.name}
                  metadata={parseStatusMetadata(
                    (order.displayFolderStatus ?? order.folderStatus)!.metadata,
                  )}
                />
              ) : (
                '—'
              )}
            </div>
          </div>
        ) : null}
        <div>
          <p className="text-[11px] font-medium uppercase tracking-wide text-[var(--muted)]">
            In / Out
          </p>
          <p className="mt-0.5">
            {formatDate(order.inDate)} → {formatDate(order.outDate)}
          </p>
        </div>
        {order.clientNotes?.trim() ? (
          <div className="sm:col-span-2 lg:col-span-4">
            <p className="text-[11px] font-medium uppercase tracking-wide text-[var(--muted)]">
              Notes from client
            </p>
            <p className="mt-0.5 whitespace-pre-wrap text-[var(--muted)]">
              {order.clientNotes}
            </p>
          </div>
        ) : null}
      </div>
      <div className="overflow-x-auto">
        <table className="min-w-full text-sm">
          <thead className="border-b border-[var(--border)] bg-[var(--surface-muted)]">
            <tr>
              {[
                'In',
                'Services',
                'Artist',
                'Editor status',
                'Out',
                'Rejected',
                ...(canViewFinance
                  ? ['Extra', 'Price', 'Artist rate', 'Cost']
                  : []),
                ...(canEditAllocationStatus ? [''] : []),
              ].map((heading) => (
                <th
                  key={heading || 'actions'}
                  className="whitespace-nowrap px-2.5 py-2 text-left text-[11px] font-medium uppercase tracking-wide text-[var(--muted)]"
                >
                  {heading}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => {
              const draftId =
                allocationStatusDrafts?.[row.id] ??
                row.folderStatusId ??
                row.folderStatus?.id ??
                '';
              const isOwnRow =
                Boolean(currentUserId) &&
                row.assignedArtistUserId === currentUserId;
              const canEditRow =
                canEditAllocationStatus &&
                row.id !== 'legacy' &&
                (canEditAllAllocationRows || isOwnRow);
              const allowedSetByRoles = canEditAllAllocationRows
                ? isOwnRow
                  ? ['artist', 'qa']
                  : ['qa']
                : ['artist'];
              return (
                <tr
                  key={row.id}
                  className="border-b border-[var(--border)] last:border-b-0"
                >
                  <td className="px-2.5 py-2 align-middle">
                    {row.inFileCount ?? 0}
                  </td>
                  <td className="px-2.5 py-2 align-middle">
                    <div className="flex flex-wrap gap-1">
                      {row.serviceLines?.length
                        ? row.serviceLines.map((line) => (
                            <span
                              key={line.service.id}
                              className="inline-flex rounded bg-[var(--primary-soft)] px-1.5 py-0.5 text-[11px] font-medium text-[var(--primary)]"
                            >
                              {line.service.code}
                            </span>
                          ))
                        : '—'}
                    </div>
                  </td>
                  <td className="px-2.5 py-2 align-middle">
                    {row.assignedArtist?.fullName ?? '—'}
                  </td>
                  <td className="min-w-[10rem] px-2.5 py-2 align-middle">
                    {canEditRow ? (
                      <FolderStatusField
                        value={draftId}
                        onChange={(statusId) =>
                          onAllocationStatusChange?.(row.id, statusId)
                        }
                        label=""
                        allowedSetByRoles={allowedSetByRoles}
                        pinnedOption={
                          row.folderStatus
                            ? {
                                id: row.folderStatus.id,
                                name: row.folderStatus.name,
                                code: row.folderStatus.code ?? '',
                                metadata: row.folderStatus.metadata,
                              }
                            : null
                        }
                      />
                    ) : row.folderStatus ? (
                      <StatusBadge
                        label={row.folderStatus.name}
                        metadata={parseStatusMetadata(
                          row.folderStatus.metadata,
                        )}
                      />
                    ) : (
                      '—'
                    )}
                  </td>
                  <td className="px-2.5 py-2 align-middle">
                    {row.outFileCount ?? 0}
                  </td>
                  <td className="px-2.5 py-2 align-middle">
                    {row.rejectedFileCount ?? 0}
                  </td>
                  {canViewFinance ? (
                    <>
                      <td className="px-2.5 py-2 align-middle">
                        {row.extraServiceCount ?? 0}
                      </td>
                      <td className="px-2.5 py-2 align-middle">
                        {row.price != null ? row.price : '—'}
                      </td>
                      <td className="px-2.5 py-2 align-middle">
                        {row.artistRatePerImage
                          ? `₹${row.artistRatePerImage}`
                          : '—'}
                      </td>
                      <td className="px-2.5 py-2 align-middle">
                        {row.cost ?? '—'}
                      </td>
                    </>
                  ) : null}
                  {canEditAllocationStatus ? (
                    <td className="px-2.5 py-2 align-middle">
                      {canEditRow ? (
                        <Button
                          size="sm"
                          disabled={statusSaveBusy}
                          onClick={() => onSaveAllocationStatus?.(row.id)}
                        >
                          Save
                        </Button>
                      ) : null}
                    </td>
                  ) : null}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </Card>
  );
}
