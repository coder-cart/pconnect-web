'use client';

import { useEffect, useMemo, useState } from 'react';
import { apiRequest } from '@/lib/api-client';
import { ApiResponse } from '@/lib/auth';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { OrderSummary, humanize } from '@/lib/orders';
import {
  MasterDataStatus,
  computeOrderCost,
  parseStatusMetadata,
  statusFillStyle,
} from '@/lib/order-status';
import { StatusBadge } from '@/components/orders/StatusBadge';
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

interface OrderExcelEditorProps {
  order: OrderSummary;
  canViewFinance: boolean;
  onUpdated: () => void;
}

function toDateInput(value?: string | null) {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return date.toISOString().slice(0, 10);
}

export function OrderExcelEditor({
  order,
  canViewFinance,
  onUpdated,
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
  const [inFileCount, setInFileCount] = useState(
    String(order.inFileCount ?? order.imageCount ?? 0),
  );
  const [outFileCount, setOutFileCount] = useState(String(order.outFileCount ?? 0));
  const [rejectedFileCount, setRejectedFileCount] = useState(
    String(order.rejectedFileCount ?? 0),
  );
  const [extraServiceCount, setExtraServiceCount] = useState(
    String(order.extraServiceCount ?? 0),
  );
  const [servicesText, setServicesText] = useState(order.services ?? '');
  const [serviceIds, setServiceIds] = useState<string[]>(
    serviceIdsFromLines(order.serviceLines),
  );
  const [folderStatusId, setFolderStatusId] = useState(order.folderStatus?.id ?? '');
  const [assignedArtistUserId, setAssignedArtistUserId] = useState(
    order.assignedArtist?.id ?? '',
  );
  const [price, setPrice] = useState(order.price ?? '');
  const [artistRatePerImage, setArtistRatePerImage] = useState(
    order.artistRatePerImage ?? '',
  );
  const [priority, setPriority] = useState(order.priority ?? 'medium');
  const [estimatedTatHours, setEstimatedTatHours] = useState(
    String(order.estimatedTatHours ?? ''),
  );
  const [timeSpentMinutes, setTimeSpentMinutes] = useState(
    String(order.timeSpentMinutes ?? 0),
  );

  useEffect(() => {
    if (!clientOrganizationId || serviceIds.length === 0 || !canViewFinance) return;
    const primaryServiceId = serviceIds[0];
    apiRequest<
      ApiResponse<{
        artistRatePerImage?: string | number | null;
        estimatedTatHours?: number | null;
        resolvedFrom?: string;
      }>
    >(
      `/orders/client-service-rate?clientOrganizationId=${clientOrganizationId}&serviceId=${primaryServiceId}`,
    )
      .then((response) => {
        if (response.data.artistRatePerImage != null) {
          setArtistRatePerImage(String(response.data.artistRatePerImage));
        }
        if (response.data.estimatedTatHours != null) {
          setEstimatedTatHours(String(response.data.estimatedTatHours));
        }
      })
      .catch(() => undefined);
  }, [clientOrganizationId, serviceIds, canViewFinance]);

  useEffect(() => {
    Promise.all([
      apiRequest<ApiResponse<ClientOption[]>>('/clients'),
      apiRequest<ApiResponse<MasterDataStatus[]>>(
        '/master-data/items?category=folder_status',
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

  const computedCost = useMemo(
    () =>
      computeOrderCost({
        outFileCount: Number(outFileCount) || 0,
        artistRatePerImage: artistRatePerImage || null,
        extraServiceCount: Number(extraServiceCount) || 0,
      }),
    [outFileCount, artistRatePerImage, extraServiceCount],
  );

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
          inFileCount: Number(inFileCount) || 0,
          outFileCount: Number(outFileCount) || 0,
          rejectedFileCount: Number(rejectedFileCount) || 0,
          extraServiceCount: Number(extraServiceCount) || 0,
          services: servicesText || undefined,
          serviceIds,
          folderStatusId: folderStatusId || null,
          assignedArtistUserId: assignedArtistUserId || null,
          price: price ? Number(price) : undefined,
          artistRatePerImage: artistRatePerImage
            ? Number(artistRatePerImage)
            : undefined,
          cost: computedCost ?? undefined,
          priority,
          estimatedTatHours: estimatedTatHours
            ? Number(estimatedTatHours)
            : undefined,
          timeSpentMinutes: Number(timeSpentMinutes) || 0,
        }),
      });
      onUpdated();
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Save failed');
    } finally {
      setBusy(false);
    }
  }

  const selectedFolder = folderStatuses.find((item) => item.id === folderStatusId);

  return (
    <Card padding="none" className="overflow-x-auto">
      {errorMessage ? (
        <p className="px-3 py-2 text-sm text-[var(--danger)]">{errorMessage}</p>
      ) : null}
      <table className="min-w-full text-sm">
        <thead className="border-b border-[var(--border)] bg-[var(--surface-muted)]">
          <tr>
            {[
              'Client',
              'Order',
              'Priority',
              'In Date',
              'In Files',
              'Services',
              'Artist',
              'Folder Status',
              'Out Date',
              'Out Files',
              'Rejected',
              'ETA (h)',
              'Time (min)',
              ...(canViewFinance ? ['Price', 'Artist Rate', 'Total Cost'] : []),
            ].map((heading) => (
              <th
                key={heading}
                className="px-3 py-2 text-left text-xs font-medium text-[var(--muted)]"
              >
                {heading}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          <tr className="border-b border-[var(--border)]">
            <td className="px-3 py-2">
              <select
                value={clientOrganizationId}
                onChange={(event) => setClientOrganizationId(event.target.value)}
                className="w-full min-w-[120px] rounded border border-[var(--border)] bg-[var(--surface)] px-2 py-1 text-sm"
              >
                <option value="">—</option>
                {clients.map((client) => (
                  <option key={client.id} value={client.id}>
                    {client.name}
                  </option>
                ))}
              </select>
            </td>
            <td className="px-3 py-2">
              <input
                value={name}
                onChange={(event) => setName(event.target.value)}
                className="w-full min-w-[140px] rounded border border-[var(--border)] bg-[var(--surface)] px-2 py-1 text-sm"
              />
            </td>
            <td className="px-3 py-2">
              <select
                value={priority}
                onChange={(event) => setPriority(event.target.value)}
                className="rounded border border-[var(--border)] bg-[var(--surface)] px-2 py-1 text-sm capitalize"
              >
                <option value="low">low</option>
                <option value="medium">medium</option>
                <option value="high">high</option>
                <option value="urgent">urgent</option>
              </select>
            </td>
            <td className="px-3 py-2">
              <input
                type="date"
                value={inDate}
                onChange={(event) => setInDate(event.target.value)}
                className="rounded border border-[var(--border)] bg-[var(--surface)] px-2 py-1 text-sm"
              />
            </td>
            <td className="px-3 py-2">
              <input
                type="number"
                min={0}
                value={inFileCount}
                onChange={(event) => setInFileCount(event.target.value)}
                className="w-20 rounded border border-[var(--border)] bg-[var(--surface)] px-2 py-1 text-sm"
              />
            </td>
            <td className="min-w-[180px] px-3 py-2 align-top">
              <ServiceMultiSelect
                compact
                value={serviceIds}
                onChange={(ids, text) => {
                  setServiceIds(ids);
                  setServicesText(text);
                }}
              />
            </td>
            <td className="px-3 py-2">
              <select
                value={assignedArtistUserId}
                onChange={(event) => setAssignedArtistUserId(event.target.value)}
                className="w-full min-w-[120px] rounded border border-[var(--border)] bg-[var(--surface)] px-2 py-1 text-sm"
              >
                <option value="">—</option>
                {users.map((user) => (
                  <option key={user.id} value={user.id}>
                    {user.fullName}
                  </option>
                ))}
              </select>
            </td>
            <td className="px-3 py-2">
              <select
                value={folderStatusId}
                onChange={(event) => setFolderStatusId(event.target.value)}
                className="w-full min-w-[120px] rounded border border-[var(--border)] px-2 py-1 text-sm font-medium"
                style={statusFillStyle(selectedFolder)}
              >
                <option value="">—</option>
                {folderStatuses.map((status) => (
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
            <td className="px-3 py-2">
              <input
                type="date"
                value={outDate}
                onChange={(event) => setOutDate(event.target.value)}
                className="rounded border border-[var(--border)] bg-[var(--surface)] px-2 py-1 text-sm"
              />
            </td>
            <td className="px-3 py-2">
              <input
                type="number"
                min={0}
                value={outFileCount}
                onChange={(event) => setOutFileCount(event.target.value)}
                className="w-20 rounded border border-[var(--border)] bg-[var(--surface)] px-2 py-1 text-sm"
              />
            </td>
            <td className="px-3 py-2">
              <input
                type="number"
                min={0}
                value={rejectedFileCount}
                onChange={(event) => setRejectedFileCount(event.target.value)}
                className="w-20 rounded border border-[var(--border)] bg-[var(--surface)] px-2 py-1 text-sm"
              />
            </td>
            <td className="px-3 py-2">
              <input
                type="number"
                min={0}
                value={estimatedTatHours}
                onChange={(event) => setEstimatedTatHours(event.target.value)}
                className="w-20 rounded border border-[var(--border)] bg-[var(--surface)] px-2 py-1 text-sm"
              />
            </td>
            <td className="px-3 py-2">
              <input
                type="number"
                min={0}
                value={timeSpentMinutes}
                onChange={(event) => setTimeSpentMinutes(event.target.value)}
                className="w-20 rounded border border-[var(--border)] bg-[var(--surface)] px-2 py-1 text-sm"
              />
            </td>
            {canViewFinance ? (
              <>
                <td className="px-3 py-2">
                  <input
                    type="number"
                    min={0}
                    step="0.01"
                    value={price}
                    onChange={(event) => setPrice(event.target.value)}
                    className="w-24 rounded border border-[var(--border)] bg-[var(--surface)] px-2 py-1 text-sm"
                  />
                </td>
                <td className="px-3 py-2">
                  <input
                    type="number"
                    min={0}
                    step="0.01"
                    value={artistRatePerImage}
                    onChange={(event) => setArtistRatePerImage(event.target.value)}
                    className="w-24 rounded border border-[var(--border)] bg-[var(--surface)] px-2 py-1 text-sm"
                  />
                </td>
                <td className="px-3 py-2 font-medium">
                  {computedCost != null ? `₹${computedCost}` : '—'}
                </td>
              </>
            ) : null}
          </tr>
        </tbody>
      </table>
      <div className="flex items-center justify-between border-t border-[var(--border)] px-3 py-2">
        {selectedFolder ? (
          <StatusBadge
            label={selectedFolder.name}
            metadata={parseStatusMetadata(selectedFolder.metadata)}
          />
        ) : (
          <span className="text-xs text-[var(--muted)]">No folder status</span>
        )}
        <Button size="sm" onClick={handleSave} disabled={busy}>
          Save Excel fields
        </Button>
      </div>
    </Card>
  );
}

export function OrderExcelReadOnly({
  order,
  canViewFinance,
}: {
  order: OrderSummary;
  canViewFinance: boolean;
}) {
  function formatDate(value?: string | null) {
    return value ? new Date(value).toLocaleDateString() : '—';
  }

  function serviceLabel() {
    if (order.serviceLines?.length) {
      return order.serviceLines.map((line) => line.service.code).join(', ');
    }
    return order.services || '—';
  }

  return (
    <Card padding="none" className="overflow-x-auto">
      <table className="min-w-full text-sm">
        <thead className="border-b border-[var(--border)] bg-[var(--surface-muted)]">
          <tr>
            {[
              'Client',
              'Order',
              'In Date',
              'In Files',
              'Services',
              'Artist',
              'Folder Status',
              'Out Date',
              'Out Files',
              'Rejected',
              ...(canViewFinance ? ['Price', 'Artist Rate', 'Total Cost'] : []),
            ].map((heading) => (
              <th
                key={heading}
                className="px-3 py-2 text-left text-xs font-medium text-[var(--muted)]"
              >
                {heading}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          <tr className="border-b border-[var(--border)]">
            <td className="px-3 py-2">{order.clientOrganization?.name ?? '—'}</td>
            <td className="px-3 py-2">{order.name}</td>
            <td className="px-3 py-2">{formatDate(order.inDate)}</td>
            <td className="px-3 py-2">{order.inFileCount ?? order.imageCount}</td>
            <td className="px-3 py-2">
              <div className="flex flex-wrap gap-1">
                {order.serviceLines?.length
                  ? order.serviceLines.map((line) => (
                      <span
                        key={line.service.id}
                        className="inline-flex rounded-full bg-[var(--primary-soft)] px-2 py-0.5 text-xs font-medium text-[var(--primary)]"
                      >
                        {line.service.code}
                      </span>
                    ))
                  : serviceLabel()}
              </div>
            </td>
            <td className="px-3 py-2">{order.assignedArtist?.fullName ?? '—'}</td>
            <td className="px-3 py-2">
              {order.folderStatus ? (
                <StatusBadge
                  label={order.folderStatus.name}
                  metadata={parseStatusMetadata(order.folderStatus.metadata)}
                />
              ) : (
                '—'
              )}
            </td>
            <td className="px-3 py-2">{formatDate(order.outDate)}</td>
            <td className="px-3 py-2">{order.outFileCount ?? 0}</td>
            <td className="px-3 py-2">{order.rejectedFileCount ?? 0}</td>
            {canViewFinance ? (
              <>
                <td className="px-3 py-2">{order.price ?? '—'}</td>
                <td className="px-3 py-2">
                  {order.artistRatePerImage ? `₹${order.artistRatePerImage}` : '—'}
                </td>
                <td className="px-3 py-2">{order.cost ?? '—'}</td>
              </>
            ) : null}
          </tr>
        </tbody>
      </table>
    </Card>
  );
}
