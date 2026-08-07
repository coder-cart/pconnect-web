'use client';

import { useEffect, useMemo, useState } from 'react';
import { apiRequest } from '@/lib/api-client';
import { ApiResponse } from '@/lib/auth';
import { Input } from '@/components/ui/Input';
import { Modal, ModalActions } from '@/components/ui/Modal';
import {
  MasterDataStatus,
  computeOrderCost,
  parseStatusMetadata,
  statusFillStyle,
} from '@/lib/order-status';
import { ServiceMultiSelect } from '@/components/orders/ServiceMultiSelect';

interface ClientOption {
  id: string;
  name: string;
}

interface ClientServiceRow {
  serviceId: string;
  code: string;
  name: string;
  defaultUnit: string;
  enabled: boolean;
  effectivePrice: number | null;
  effectiveEtaHours: number | null;
}

interface OrderCreateModalProps {
  open: boolean;
  canManage: boolean;
  isExternal: boolean;
  /** Locked client (client detail page). External users also auto-lock. */
  defaultClientId?: string;
  onClose: () => void;
  onCreated: () => void;
}

export function OrderCreateModal({
  open,
  canManage,
  isExternal,
  defaultClientId,
  onClose,
  onCreated,
}: OrderCreateModalProps) {
  const [clients, setClients] = useState<ClientOption[]>([]);
  const [folderStatuses, setFolderStatuses] = useState<MasterDataStatus[]>([]);
  const [workflowStatuses, setWorkflowStatuses] = useState<MasterDataStatus[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const [clientOrganizationId, setClientOrganizationId] = useState('');
  const [name, setName] = useState('');
  const [services, setServices] = useState('');
  const [serviceIds, setServiceIds] = useState<string[]>([]);
  const [dueDate, setDueDate] = useState('');
  const [inDate, setInDate] = useState(new Date().toISOString().slice(0, 10));
  const [inFileCount, setInFileCount] = useState('');
  const [outFileCount, setOutFileCount] = useState('');
  const [clientNotes, setClientNotes] = useState('');
  const [internalNotes, setInternalNotes] = useState('');
  const [folderStatusId, setFolderStatusId] = useState('');
  const [workflowStatusId, setWorkflowStatusId] = useState('');
  const [artistRatePerImage, setArtistRatePerImage] = useState('');
  const [price, setPrice] = useState('');
  const [clientServices, setClientServices] = useState<ClientServiceRow[]>([]);

  const clientLocked = Boolean(defaultClientId) || isExternal;
  const selectedClientName =
    clients.find((client) => client.id === clientOrganizationId)?.name ?? null;

  useEffect(() => {
    if (!open) return;

    setFormError(null);
    setClientOrganizationId(defaultClientId ?? '');

    const requests: Promise<void>[] = [
      apiRequest<ApiResponse<MasterDataStatus[]>>(
        '/master-data/items?category=folder_status',
      ).then((response) => {
        const items = response.data.map((item) => ({
          ...item,
          metadata: parseStatusMetadata(item.metadata),
        }));
        setFolderStatuses(items);
        const uploaded = items.find((item) => item.code === 'uploaded');
        if (uploaded) setFolderStatusId(uploaded.id);
      }),
    ];

    // Always load clients for locked display / external auto-select / manager pick.
    requests.push(
      apiRequest<ApiResponse<ClientOption[]>>('/clients').then((response) => {
        setClients(response.data);
        if (defaultClientId) {
          setClientOrganizationId(defaultClientId);
        } else if (isExternal && response.data[0]) {
          setClientOrganizationId(response.data[0].id);
        }
      }),
    );

    if (canManage) {
      requests.push(
        apiRequest<ApiResponse<MasterDataStatus[]>>(
          '/orders/meta/workflow-statuses',
        ).then((response) => {
          const items = response.data.map((item) => ({
            ...item,
            metadata: parseStatusMetadata(item.metadata),
          }));
          setWorkflowStatuses(items);
          const initial = items.find((item) => item.code === 'new_order');
          if (initial) setWorkflowStatusId(initial.id);
        }),
      );
    }

    void Promise.all(requests);
  }, [open, canManage, defaultClientId, isExternal]);

  useEffect(() => {
    if (!open || !clientOrganizationId) {
      setClientServices([]);
      return;
    }
    let cancelled = false;
    apiRequest<ApiResponse<ClientServiceRow[]>>(
      `/clients/${clientOrganizationId}/services`,
    )
      .then((response) => {
        if (cancelled) return;
        setClientServices(response.data);
        const enabledIds = new Set(
          response.data.filter((row) => row.enabled).map((row) => row.serviceId),
        );
        setServiceIds((current) => current.filter((id) => enabledIds.has(id)));
      })
      .catch(() => {
        if (!cancelled) setClientServices([]);
      });
    return () => {
      cancelled = true;
    };
  }, [open, clientOrganizationId]);

  const enabledServiceOptions = useMemo(
    () =>
      clientServices
        .filter((row) => row.enabled)
        .map((row) => ({
          id: row.serviceId,
          code: row.code,
          name: row.name,
          isActive: true,
        })),
    [clientServices],
  );

  const selectedServiceConfig = useMemo(
    () =>
      clientServices.filter(
        (row) => row.enabled && serviceIds.includes(row.serviceId),
      ),
    [clientServices, serviceIds],
  );

  const computedCost = useMemo(
    () =>
      computeOrderCost({
        outFileCount: Number(outFileCount) || 0,
        artistRatePerImage: artistRatePerImage || null,
      }),
    [outFileCount, artistRatePerImage],
  );

  const selectedFolder = folderStatuses.find((item) => item.id === folderStatusId);
  const selectedWorkflow = workflowStatuses.find(
    (item) => item.id === workflowStatusId,
  );

  async function handleCreate() {
    if (!name.trim()) {
      setFormError('Order name is required.');
      return;
    }
    if (!clientOrganizationId && (canManage || isExternal)) {
      setFormError('Client is required.');
      return;
    }

    setIsSaving(true);
    setFormError(null);
    try {
      await apiRequest('/orders', {
        method: 'POST',
        body: JSON.stringify({
          name: name.trim(),
          clientOrganizationId: clientOrganizationId || undefined,
          services: services || undefined,
          serviceIds: serviceIds.length > 0 ? serviceIds : undefined,
          dueDate: dueDate || undefined,
          inDate: inDate || undefined,
          inFileCount: inFileCount ? Number(inFileCount) : undefined,
          outFileCount: outFileCount ? Number(outFileCount) : undefined,
          clientNotes: clientNotes || undefined,
          internalNotes: canManage ? internalNotes || undefined : undefined,
          folderStatusId: folderStatusId || undefined,
          workflowStatusId: canManage ? workflowStatusId || undefined : undefined,
          artistRatePerImage: artistRatePerImage
            ? Number(artistRatePerImage)
            : undefined,
          price: price ? Number(price) : undefined,
          cost: computedCost ?? undefined,
        }),
      });
      setName('');
      setServices('');
      setServiceIds([]);
      setDueDate('');
      setInFileCount('');
      setOutFileCount('');
      setClientNotes('');
      setInternalNotes('');
      onCreated();
      onClose();
    } catch (error) {
      setFormError(error instanceof Error ? error.message : 'Create failed');
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <Modal
      open={open}
      title="Create order"
      description="Excel-style order intake with folder status and workflow pipeline."
      onClose={onClose}
      footer={
        <ModalActions
          onCancel={onClose}
          onSubmit={handleCreate}
          submitLabel="Create order"
          isSubmitting={isSaving}
        />
      }
    >
      <div className="space-y-3">
        {formError ? (
          <p className="text-sm text-[var(--danger)]">{formError}</p>
        ) : null}

        {clientLocked ? (
          <div className="rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--surface-muted)] px-3 py-2">
            <p className="text-xs font-medium uppercase tracking-wide text-[var(--muted)]">
              Client
            </p>
            <p className="text-sm font-medium text-[var(--foreground)]">
              {selectedClientName ?? 'Your organization'}
            </p>
          </div>
        ) : (
          <label className="block space-y-1.5">
            <span className="text-sm font-medium text-[var(--foreground)]">
              Client
            </span>
            <select
              value={clientOrganizationId}
              onChange={(event) => setClientOrganizationId(event.target.value)}
              className="w-full rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-sm"
            >
              <option value="">Select client</option>
              {clients.map((client) => (
                <option key={client.id} value={client.id}>
                  {client.name}
                </option>
              ))}
            </select>
          </label>
        )}

        <Input
          label="Order name"
          value={name}
          onChange={(event) => setName(event.target.value)}
          placeholder="e.g. Spring catalog retouch"
        />

        <div className="grid gap-3 md:grid-cols-2">
          <label className="block space-y-1.5">
            <span className="text-sm font-medium text-[var(--foreground)]">
              Services
            </span>
            <ServiceMultiSelect
              value={serviceIds}
              options={
                clientOrganizationId ? enabledServiceOptions : undefined
              }
              onChange={(ids, text) => {
                setServiceIds(ids);
                setServices(text);
              }}
            />
          </label>
          <Input
            label="Due date"
            type="date"
            value={dueDate}
            onChange={(event) => setDueDate(event.target.value)}
          />
        </div>

        {clientOrganizationId && selectedServiceConfig.length > 0 ? (
          <div className="rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--surface-muted)] p-3">
            <p className="mb-2 text-xs font-medium text-[var(--foreground)]">
              Configured client pricing (saved with the order)
            </p>
            <ul className="space-y-1 text-sm">
              {selectedServiceConfig.map((row) => (
                <li
                  key={row.serviceId}
                  className="flex items-center justify-between gap-3"
                >
                  <span className="text-[var(--foreground)]">
                    {row.code} · {row.name}
                  </span>
                  <span className="text-[var(--muted)]">
                    {row.effectivePrice != null ? `₹${row.effectivePrice}` : '—'}
                    {' · '}
                    {row.effectiveEtaHours != null
                      ? `${row.effectiveEtaHours} Hours`
                      : '—'}
                    {` · ${row.defaultUnit}`}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        ) : null}

        {canManage && clientOrganizationId && enabledServiceOptions.length === 0 ? (
          <p className="text-xs text-[var(--muted)]">
            This client has no enabled services. Configure them in the client&apos;s
            Service Configuration tab.
          </p>
        ) : null}

        {!clientOrganizationId && canManage && !clientLocked ? (
          <p className="text-xs text-[var(--muted)]">
            Select a client first to load their enabled services and pricing.
          </p>
        ) : null}

        <div className="grid gap-3 md:grid-cols-2">
          <Input
            label="In date"
            type="date"
            value={inDate}
            onChange={(event) => setInDate(event.target.value)}
          />
          <Input
            label="In files"
            type="number"
            min={0}
            value={inFileCount}
            onChange={(event) => setInFileCount(event.target.value)}
          />
        </div>

        <label className="block space-y-1.5">
          <span className="text-sm font-medium text-[var(--foreground)]">
            Folder status
          </span>
          <select
            value={folderStatusId}
            onChange={(event) => setFolderStatusId(event.target.value)}
            disabled={isExternal}
            className="w-full rounded-[var(--radius-md)] border border-[var(--border)] px-3 py-2 text-sm font-medium"
            style={statusFillStyle(selectedFolder)}
          >
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
        </label>

        {canManage ? (
          <>
            <label className="block space-y-1.5">
              <span className="text-sm font-medium text-[var(--foreground)]">
                Workflow status
              </span>
              <select
                value={workflowStatusId}
                onChange={(event) => setWorkflowStatusId(event.target.value)}
                className="w-full rounded-[var(--radius-md)] border border-[var(--border)] px-3 py-2 text-sm font-medium"
                style={statusFillStyle(selectedWorkflow)}
              >
                {workflowStatuses.map((status) => (
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

            <div className="grid gap-3 md:grid-cols-3">
              <Input
                label="Out files"
                type="number"
                min={0}
                value={outFileCount}
                onChange={(event) => setOutFileCount(event.target.value)}
              />
              <Input
                label="Artist rate / image (₹)"
                type="number"
                min={0}
                step="0.01"
                value={artistRatePerImage}
                onChange={(event) => setArtistRatePerImage(event.target.value)}
              />
              <Input
                label="Client price"
                type="number"
                min={0}
                step="0.01"
                value={price}
                onChange={(event) => setPrice(event.target.value)}
              />
            </div>

            {computedCost != null ? (
              <p className="text-sm text-[var(--muted)]">
                Total cost (auto):{' '}
                <span className="font-medium text-[var(--foreground)]">
                  ₹{computedCost}
                </span>
              </p>
            ) : null}

            <Input
              label="Internal remark"
              value={internalNotes}
              onChange={(event) => setInternalNotes(event.target.value)}
            />
          </>
        ) : null}

        <Input
          label="Notes from client"
          value={clientNotes}
          onChange={(event) => setClientNotes(event.target.value)}
        />
      </div>
    </Modal>
  );
}
