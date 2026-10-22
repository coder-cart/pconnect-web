'use client';

import { type ReactNode, useEffect, useMemo, useState } from 'react';
import { Trash2 } from 'lucide-react';
import { apiRequest } from '@/lib/api-client';
import { ApiResponse, userHasAnyPermission } from '@/lib/auth';
import { useWorkspace } from '@/components/providers/WorkspaceProvider';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Modal, ModalActions } from '@/components/ui/Modal';
import {
  MasterDataStatus,
  parseStatusMetadata,
  statusFillStyle,
} from '@/lib/order-status';
import { ServiceMultiSelect } from '@/components/orders/ServiceMultiSelect';
import { OUTPUT_FORMATS, toExternalHref } from '@/lib/orders';
import { cn } from '@/lib/cn';
import { isHiddenOrderService } from '@/lib/orders';

interface ClientOption {
  id: string;
  name: string;
  currency?: string | null;
}

interface UserOption {
  id: string;
  fullName: string;
}

interface ClientServiceRow {
  serviceId: string;
  code: string;
  name: string;
  defaultUnit: string;
  enabled: boolean;
  currency?: string | null;
  effectivePrice: number | null;
  effectiveEtaHours: number | null;
}

interface WorkLineDraft {
  key: string;
  serviceIds: string[];
  servicesText: string;
  inFileCount: string;
  assignedArtistUserId: string;
  artistRatePerImage: string;
  price: string;
  extraServiceCount: string;
}

interface OrderCreateModalProps {
  open: boolean;
  canManage: boolean;
  isExternal: boolean;
  /** Locked client (client detail page). External users also auto-lock. */
  defaultClientId?: string;
  /** Prefill New Order vs Revision when opening from the dashboard menu. */
  initialMode?: 'new' | 'revision';
  onClose: () => void;
  onCreated: () => void;
}

// text-base on small screens avoids iOS zoom on focus; sm:text-sm matches desktop Input
const selectClassName =
  'h-11 w-full rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--surface)] px-3 text-base text-[var(--foreground)] transition-colors focus:border-[var(--primary)] focus:outline-none focus:ring-2 focus:ring-[var(--primary-soft)] sm:text-sm';

function emptyWorkLine(): WorkLineDraft {
  return {
    key: `line-${Math.random().toString(36).slice(2, 9)}`,
    serviceIds: [],
    servicesText: '',
    inFileCount: '',
    assignedArtistUserId: '',
    artistRatePerImage: '',
    price: '',
    extraServiceCount: '0',
  };
}

function FormSection({
  title,
  description,
  children,
  action,
}: {
  title: string;
  description?: string;
  children: ReactNode;
  action?: ReactNode;
}) {
  return (
    <section className="space-y-3">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between sm:gap-3">
        <div className="min-w-0">
          <h3 className="text-sm font-medium text-[var(--foreground)]">{title}</h3>
          {description ? (
            <p className="mt-0.5 text-xs text-[var(--muted)]">{description}</p>
          ) : null}
        </div>
        {action ? <div className="shrink-0 self-start">{action}</div> : null}
      </div>
      {children}
    </section>
  );
}

export function OrderCreateModal({
  open,
  canManage,
  isExternal,
  defaultClientId,
  initialMode = 'new',
  onClose,
  onCreated,
}: OrderCreateModalProps) {
  const { user } = useWorkspace();
  const canViewFinance = userHasAnyPermission(user, [
    'finance.invoices.view_all',
    'finance.invoices.create',
    'payments.manage',
  ]);
  const [clients, setClients] = useState<ClientOption[]>([]);
  const [folderStatuses, setFolderStatuses] = useState<MasterDataStatus[]>([]);
  const [assignableUsers, setAssignableUsers] = useState<UserOption[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [servicesLoadError, setServicesLoadError] = useState<string | null>(null);

  const [clientOrganizationId, setClientOrganizationId] = useState('');
  const [name, setName] = useState('');
  const [inDate, setInDate] = useState(new Date().toISOString().slice(0, 10));
  const [clientNotes, setClientNotes] = useState('');
  const [sourceLink, setSourceLink] = useState('');
  const [orderMode, setOrderMode] = useState<'new' | 'revision'>('new');
  const [parentOrderId, setParentOrderId] = useState('');
  const [outputFormat, setOutputFormat] = useState('JPG');
  const [clientPriority, setClientPriority] = useState<'medium' | 'high' | 'urgent'>('medium');
  const [suggestedServices, setSuggestedServices] = useState<
    Array<{ serviceId: string; code: string; name: string; count: number }>
  >([]);
  const [previousOrders, setPreviousOrders] = useState<
    Array<{
      id: string;
      code: string;
      name: string;
      services?: string | null;
      outputFormat?: string | null;
      estimatedTatHours?: number | null;
      serviceLines?: Array<{ service: { id: string } }>;
    }>
  >([]);
  const [internalNotes, setInternalNotes] = useState('');
  const [folderStatusId, setFolderStatusId] = useState('');
  const [clientServices, setClientServices] = useState<ClientServiceRow[]>([]);
  const [workLines, setWorkLines] = useState<WorkLineDraft[]>([emptyWorkLine()]);
  const [assignedTeamLeadUserId, setAssignedTeamLeadUserId] = useState('');
  const [assignedQaUserId, setAssignedQaUserId] = useState('');

  const clientLocked = Boolean(defaultClientId) || isExternal;
  const selectedClientName =
    clients.find((client) => client.id === clientOrganizationId)?.name ?? null;

  useEffect(() => {
    if (!open) return;

    setFormError(null);
    setServicesLoadError(null);
    setClientOrganizationId(defaultClientId ?? '');
    setWorkLines([emptyWorkLine()]);
    setAssignedTeamLeadUserId('');
    setAssignedQaUserId('');
    setOrderMode(initialMode);
    setParentOrderId('');

    const requests: Promise<void>[] = [
      apiRequest<ApiResponse<MasterDataStatus[]>>(
        '/orders/meta/folder-statuses',
      ).then((response) => {
        const items = response.data.map((item) => ({
          ...item,
          metadata: parseStatusMetadata(item.metadata),
        }));
        setFolderStatuses(items);
        const preferred =
          items.find((item) => item.code === 'new_order') ??
          items.find((item) => item.code === 'uploaded') ??
          items[0];
        if (preferred) setFolderStatusId(preferred.id);
      }),
    ];

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
        apiRequest<ApiResponse<UserOption[]>>(
          '/orders/meta/assignable-users',
        ).then((response) => {
          setAssignableUsers(response.data);
        }),
      );
    }

    void Promise.all(requests);
  }, [open, canManage, defaultClientId, isExternal, initialMode]);

  useEffect(() => {
    if (!open || orderMode !== 'revision') return;
    const params = new URLSearchParams({
      lifecycleStage: 'delivered',
      pageSize: '50',
    });
    if (!isExternal && clientOrganizationId) {
      params.set('clientOrganizationId', clientOrganizationId);
    }
    apiRequest<
      ApiResponse<{
        items: Array<{ id: string; code: string; name: string; services?: string | null }>;
      }>
    >(`/orders?${params.toString()}`)
      .then((response) => setPreviousOrders(response.data.items))
      .catch(() => setPreviousOrders([]));
  }, [open, orderMode, isExternal, clientOrganizationId]);

  useEffect(() => {
    if (!open || !clientOrganizationId) {
      setClientServices([]);
      setServicesLoadError(null);
      return;
    }
    let cancelled = false;
    setServicesLoadError(null);
    apiRequest<ApiResponse<ClientServiceRow[]>>(
      `/clients/${clientOrganizationId}/services`,
    )
      .then((response) => {
        if (cancelled) return;
        setClientServices(response.data);
        const enabledIds = new Set(
          response.data.filter((row) => row.enabled).map((row) => row.serviceId),
        );
        setWorkLines((lines) =>
          lines.map((line) => ({
            ...line,
            serviceIds: line.serviceIds.filter((id) => enabledIds.has(id)),
          })),
        );
        if (!response.data.some((row) => row.enabled)) {
          setServicesLoadError('No services are enabled for this client.');
        }
      })
      .catch(() => {
        if (!cancelled) {
          setClientServices([]);
          setServicesLoadError('Could not load services for this client.');
        }
      });
    return () => {
      cancelled = true;
    };
  }, [open, clientOrganizationId]);

  useEffect(() => {
    if (!open || !clientOrganizationId || orderMode === 'revision') {
      setSuggestedServices([]);
      return;
    }
    let cancelled = false;
    apiRequest<
      ApiResponse<Array<{ serviceId: string; code: string; name: string; count: number }>>
    >(`/orders/service-suggestions?clientOrganizationId=${clientOrganizationId}`)
      .then((response) => {
        if (!cancelled) setSuggestedServices(response.data);
      })
      .catch(() => {
        if (!cancelled) setSuggestedServices([]);
      });
    return () => {
      cancelled = true;
    };
  }, [open, clientOrganizationId, orderMode]);

  const enabledServiceOptions = useMemo(
    () =>
      clientServices
        .filter((row) => row.enabled && !isHiddenOrderService(row.code))
        .map((row) => ({
          id: row.serviceId,
          code: row.code,
          name: row.name,
          isActive: true,
          effectivePrice: row.effectivePrice,
          effectiveEtaHours: row.effectiveEtaHours,
        })),
    [clientServices],
  );

  const allSelectedServiceIds = useMemo(
    () => Array.from(new Set(workLines.flatMap((line) => line.serviceIds))),
    [workLines],
  );

  const selectedServiceConfig = useMemo(
    () =>
      clientServices.filter(
        (row) => row.enabled && allSelectedServiceIds.includes(row.serviceId),
      ),
    [clientServices, allSelectedServiceIds],
  );

  const turnaroundHours = useMemo(() => {
    const hours = selectedServiceConfig
      .map((row) => row.effectiveEtaHours)
      .filter((value): value is number => typeof value === 'number' && value > 0);
    if (hours.length === 0) return null;
    return Math.max(...hours);
  }, [selectedServiceConfig]);

  const selectedParent =
    previousOrders.find((order) => order.id === parentOrderId) ?? null;
  const revisionReady = orderMode === 'revision' && Boolean(parentOrderId);

  const totalInFiles = useMemo(
    () =>
      workLines.reduce(
        (sum, line) => sum + (Number(line.inFileCount) || 0),
        0,
      ),
    [workLines],
  );

  const selectedFolder = folderStatuses.find((item) => item.id === folderStatusId);

  function updateWorkLine(key: string, patch: Partial<WorkLineDraft>) {
    setWorkLines((lines) =>
      lines.map((line) => (line.key === key ? { ...line, ...patch } : line)),
    );
  }

  async function handleCreate() {
    if (!name.trim()) {
      setFormError('Order name is required.');
      return;
    }
    if (orderMode === 'revision' && !parentOrderId) {
      setFormError('Select the previous order to revise.');
      return;
    }
    if (isExternal && orderMode !== 'revision' && !sourceLink.trim()) {
      setFormError('Add a Drive or file link.');
      return;
    }
    if (isExternal && orderMode !== 'revision') {
      const startedRows = workLines.filter(
        (line) => line.serviceIds.length > 0 || line.inFileCount.trim() !== '',
      );
      if (startedRows.length === 0) {
        setFormError('Add a service row.');
        return;
      }
      if (startedRows.some((line) => line.serviceIds.length === 0)) {
        setFormError('Each row needs an editing service.');
        return;
      }
      if (startedRows.some((line) => !(Number(line.inFileCount) > 0))) {
        setFormError('Enter the number of images or videos on each row.');
        return;
      }
    }
    if (!clientOrganizationId && (canManage || isExternal)) {
      setFormError('Client is required.');
      return;
    }

    const allocationPayload = workLines
      .filter(
        (line) =>
          line.serviceIds.length > 0 ||
          Number(line.inFileCount) > 0 ||
          Boolean(line.assignedArtistUserId),
      )
      .map((line, index) => ({
        serviceIds: line.serviceIds,
        inFileCount: Number(line.inFileCount) || 0,
        outFileCount: 0,
        rejectedFileCount: 0,
        sortOrder: index,
        ...(canManage && line.assignedArtistUserId
          ? { assignedArtistUserId: line.assignedArtistUserId }
          : {}),
        ...(canViewFinance && line.artistRatePerImage
          ? { artistRatePerImage: Number(line.artistRatePerImage) }
          : {}),
        ...(canManage
          ? { extraServiceCount: Number(line.extraServiceCount) || 0 }
          : {}),
        ...(canViewFinance
          ? { price: line.price ? Number(line.price) : null }
          : {}),
      }));

    const primaryArtist =
      allocationPayload.find((row) => row.assignedArtistUserId)
        ?.assignedArtistUserId ?? undefined;
    const primaryRate =
      allocationPayload.find((row) => row.artistRatePerImage != null)
        ?.artistRatePerImage ?? undefined;
    const orderPriceSum = canViewFinance
      ? allocationPayload.reduce(
          (sum, row) => sum + (typeof row.price === 'number' ? row.price : 0),
          0,
        )
      : 0;
    const orderExtraSum = canManage
      ? allocationPayload.reduce(
          (sum, row) =>
            sum +
            (typeof row.extraServiceCount === 'number'
              ? row.extraServiceCount
              : 0),
          0,
        )
      : 0;

    const sourceHref = toExternalHref(sourceLink);
    if (sourceLink.trim() && !sourceHref) {
      setFormError('Enter a valid Drive or file link.');
      return;
    }

    setIsSaving(true);
    setFormError(null);
    try {
      const created = await apiRequest<ApiResponse<{ id: string }>>('/orders', {
        method: 'POST',
        body: JSON.stringify({
          name: name.trim(),
          clientOrganizationId: clientOrganizationId || undefined,
          services:
            orderMode === 'revision'
              ? undefined
              : selectedServiceConfig.map((row) => row.code).join(', ') || undefined,
          serviceIds:
            orderMode === 'revision'
              ? undefined
              : allSelectedServiceIds.length > 0
                ? allSelectedServiceIds
                : undefined,
          inDate: orderMode === 'revision' ? undefined : inDate || undefined,
          inFileCount: orderMode === 'revision' ? undefined : totalInFiles || undefined,
          priority: isExternal && orderMode !== 'revision' ? clientPriority : undefined,
          outputFormat: orderMode === 'revision' ? undefined : outputFormat,
          parentOrderId: orderMode === 'revision' ? parentOrderId : undefined,
          clientNotes: clientNotes || undefined,
          sourceLink: orderMode === 'revision' ? undefined : sourceHref ?? undefined,
          internalNotes:
            canManage && orderMode !== 'revision' ? internalNotes || undefined : undefined,
          folderStatusId:
            orderMode === 'revision' ? undefined : folderStatusId || undefined,
          artistRatePerImage:
            canViewFinance && orderMode !== 'revision' ? primaryRate : undefined,
          price:
            canViewFinance && orderMode !== 'revision' && orderPriceSum > 0
              ? orderPriceSum
              : undefined,
          assignedArtistUserId:
            canManage && orderMode !== 'revision' ? primaryArtist : undefined,
          assignedTeamLeadUserId:
            canManage && orderMode !== 'revision'
              ? assignedTeamLeadUserId || undefined
              : undefined,
          assignedQaUserId:
            canManage && orderMode !== 'revision'
              ? assignedQaUserId || undefined
              : undefined,
          extraServiceCount:
            canManage && orderMode !== 'revision' ? orderExtraSum : undefined,
        }),
      });

      if (orderMode !== 'revision' && allocationPayload.length > 0 && created.data?.id) {
        await apiRequest(`/orders/${created.data.id}/work-allocations`, {
          method: 'PUT',
          body: JSON.stringify({ allocations: allocationPayload }),
        });
      }

      setName('');
      setClientNotes('');
      setSourceLink('');
      setOrderMode('new');
      setParentOrderId('');
      setOutputFormat('JPG');
      setClientPriority('medium');
      setInternalNotes('');
      setWorkLines([emptyWorkLine()]);
      setAssignedTeamLeadUserId('');
      setAssignedQaUserId('');
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
      size="xl"
      title={isExternal ? 'Submit an order' : 'Create order'}
      description={
        isExternal
          ? 'New work or a revision of a delivered order.'
          : 'Set client, services, assignment, and pricing.'
      }
      onClose={onClose}
      footer={
        <ModalActions
          onCancel={onClose}
          onSubmit={handleCreate}
          submitLabel={isExternal ? 'Submit order' : 'Create order'}
          isSubmitting={isSaving}
        />
      }
    >
      <div className="space-y-5 pb-2 sm:space-y-6">
        {formError ? (
          <div
            role="alert"
            className="rounded-[var(--radius-md)] border border-[color-mix(in_srgb,var(--danger)_35%,var(--border))] bg-[color-mix(in_srgb,var(--danger)_8%,transparent)] px-3 py-2 text-sm text-[var(--danger)]"
          >
            {formError}
          </div>
        ) : null}

        <div className="space-y-4">
            <div className="grid gap-2 sm:grid-cols-2">
              <button
                type="button"
                onClick={() => setOrderMode('new')}
                className={`rounded-[var(--radius-md)] border px-3 py-3 text-left text-sm ${
                  orderMode === 'new'
                    ? 'border-[var(--primary)] bg-[var(--primary-soft)]'
                    : 'border-[var(--border)]'
                }`}
              >
                <span className="block font-medium">New Order</span>
                <span className="text-xs text-[var(--muted)]">Submit a new project</span>
              </button>
              <button
                type="button"
                onClick={() => setOrderMode('revision')}
                className={`rounded-[var(--radius-md)] border px-3 py-3 text-left text-sm ${
                  orderMode === 'revision'
                    ? 'border-[var(--primary)] bg-[var(--primary-soft)]'
                    : 'border-[var(--border)]'
                }`}
              >
                <span className="block font-medium">Revision Order</span>
                <span className="text-xs text-[var(--muted)]">Change a delivered project</span>
              </button>
            </div>
            {orderMode === 'revision' ? (
              <label className="block space-y-1.5">
                <span className="text-sm font-medium">Previous order</span>
                <select
                  value={parentOrderId}
                  onChange={(event) => {
                    const nextId = event.target.value;
                    setParentOrderId(nextId);
                    const match = previousOrders.find((order) => order.id === nextId);
                    if (match) {
                      setName(match.name);
                      const serviceIds =
                        match.serviceLines?.map((line) => line.service.id) ?? [];
                      if (serviceIds.length > 0) {
                        updateWorkLine(workLines[0]?.key ?? 'line-0', {
                          serviceIds,
                          servicesText: match.services ?? '',
                        });
                      }
                    }
                  }}
                  className={selectClassName}
                >
                  <option value="">Select a delivered order</option>
                  {previousOrders.map((order) => (
                    <option key={order.id} value={order.id}>
                      {order.code} · {order.name}
                    </option>
                  ))}
                </select>
              </label>
            ) : null}
          </div>

        {orderMode === 'revision' && !revisionReady ? (
          <p className="text-sm text-[var(--muted)]">
            Select the delivered order. The revision only needs instructions.
          </p>
        ) : null}

        {revisionReady && selectedParent ? (
          <FormSection
            title="Instructions"
            description="Tell the team what to change. Services, format, and turnaround stay with the original order."
          >
            <div className="rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--surface-muted)] px-3 py-2.5 text-sm">
              <p className="font-medium text-[var(--foreground)]">
                {selectedParent.code} · {selectedParent.name}
              </p>
              <p className="mt-1 text-[var(--muted)]">
                Output {selectedParent.outputFormat ?? 'JPG'}
                {selectedParent.estimatedTatHours
                  ? ` · Turnaround ${selectedParent.estimatedTatHours} hours`
                  : ' · Turnaround not set'}
              </p>
            </div>
            <label className="block space-y-1.5">
              <span className="text-sm font-medium text-[var(--foreground)]">
                Instructions
              </span>
              <textarea
                value={clientNotes}
                onChange={(event) => setClientNotes(event.target.value)}
                rows={4}
                placeholder="What should change on this revision?"
                className="w-full resize-y rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-base text-[var(--foreground)] placeholder:text-[var(--muted)] focus:border-[var(--primary)] focus:outline-none focus:ring-2 focus:ring-[var(--primary-soft)] sm:text-sm"
              />
            </label>
          </FormSection>
        ) : null}

        {!revisionReady && orderMode === 'new' ? (
        <FormSection
          title="Order basics"
          description="Who the job is for, the output format, and the turnaround from the client services."
        >
          {clientLocked ? (
            <div className="rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--surface-muted)] px-3 py-2.5">
              <p className="text-xs text-[var(--muted)]">Client</p>
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
                className={selectClassName}
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
            className="text-base sm:text-sm"
            autoComplete="off"
          />

          {isExternal ? null : (
            <Input
              label="In date"
              type="date"
              value={inDate}
              className="text-base sm:text-sm"
              onChange={(event) => setInDate(event.target.value)}
            />
          )}
          <p className="text-sm text-[var(--muted)]">
            {turnaroundHours
              ? `Turnaround: ${turnaroundHours} hours`
              : 'Turnaround not set'}
          </p>
          {suggestedServices.length > 0 ? (
            <div className="space-y-2">
              <p className="text-sm font-medium text-[var(--foreground)]">
                Suggested from past orders
              </p>
              <div className="flex flex-wrap gap-2">
                {suggestedServices.map((service) => (
                  <button
                    key={service.serviceId}
                    type="button"
                    className="rounded-full border border-[var(--border)] px-3 py-1 text-xs text-[var(--foreground)] hover:border-[var(--primary)]"
                    onClick={() => {
                      const line = workLines[0];
                      if (!line || line.serviceIds.includes(service.serviceId)) return;
                      const nextIds = [...line.serviceIds, service.serviceId];
                      const labels = nextIds.map((id) => {
                        const option = enabledServiceOptions.find((item) => item.id === id);
                        return option?.code ?? service.code;
                      });
                      updateWorkLine(line.key, {
                        serviceIds: nextIds,
                        servicesText: labels.join(', '),
                      });
                    }}
                  >
                    {service.code} · {service.name}
                  </button>
                ))}
              </div>
            </div>
          ) : null}

          {isExternal ? (
            <>
              <div className="space-y-3">
                <div className="flex items-center justify-between gap-3">
                  <span className="text-sm font-medium">Service rows</span>
                  <Button
                    type="button"
                    size="sm"
                    variant="secondary"
                    onClick={() => setWorkLines((lines) => [...lines, emptyWorkLine()])}
                  >
                    Add row
                  </Button>
                </div>
                {workLines.map((line, index) => (
                  <div
                    key={line.key}
                    className="grid gap-3 rounded-[var(--radius-md)] border border-[var(--border)] p-3 sm:grid-cols-[minmax(0,1fr)_9rem_auto] sm:items-end"
                  >
                    <label className="block min-w-0 space-y-1.5">
                      <span className="text-xs font-medium text-[var(--muted)]">
                        Editing service · row {index + 1}
                      </span>
                      <ServiceMultiSelect
                        value={line.serviceIds}
                        options={enabledServiceOptions}
                        onChange={(ids, text) =>
                          updateWorkLine(line.key, {
                            serviceIds: ids,
                            servicesText: text,
                          })
                        }
                      />
                    </label>
                    <Input
                      label="Images / videos"
                      type="number"
                      min={1}
                      value={line.inFileCount}
                      onChange={(event) =>
                        updateWorkLine(line.key, { inFileCount: event.target.value })
                      }
                      placeholder="e.g. 500"
                    />
                    <Button
                      type="button"
                      size="sm"
                      variant="ghost"
                      className="h-11 w-11 shrink-0 px-0"
                      disabled={workLines.length <= 1}
                      aria-label={`Remove row ${index + 1}`}
                      onClick={() =>
                        setWorkLines((lines) =>
                          lines.length <= 1
                            ? lines
                            : lines.filter((row) => row.key !== line.key),
                        )
                      }
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
              <fieldset className="space-y-2">
                <legend className="text-sm font-medium">Priority</legend>
                {(
                  [
                    ['medium', 'Standard turnaround'],
                    ['high', 'High priority'],
                    ['urgent', 'Urgent — subject to confirmation'],
                  ] as const
                ).map(([value, label]) => (
                  <label key={value} className="flex items-center gap-2 text-sm">
                    <input
                      type="radio"
                      name="client-priority"
                      checked={clientPriority === value}
                      onChange={() => setClientPriority(value)}
                    />
                    {label}
                  </label>
                ))}
              </fieldset>
            </>
          ) : null}

          <fieldset className="space-y-2">
            <legend className="text-sm font-medium">Output format</legend>
            <div className="flex flex-wrap gap-2">
              {OUTPUT_FORMATS.map((format) => (
                <label
                  key={format}
                  className={`rounded-full border px-3 py-1 text-sm ${
                    outputFormat === format
                      ? 'border-[var(--primary)] bg-[var(--primary-soft)] font-medium text-[var(--foreground)]'
                      : 'border-[var(--border)] text-[var(--muted)]'
                  }`}
                >
                  <input
                    type="radio"
                    name="output-format"
                    className="sr-only"
                    checked={outputFormat === format}
                    onChange={() => setOutputFormat(format)}
                  />
                  {format}
                </label>
              ))}
            </div>
          </fieldset>

          <Input
            label="Drive or file link"
            value={sourceLink}
            onChange={(event) => setSourceLink(event.target.value)}
            placeholder="https://drive.google.com/..."
            className="text-base sm:text-sm"
            autoComplete="off"
          />

          <label className="block space-y-1.5">
            <span className="text-sm font-medium text-[var(--foreground)]">
              {isExternal ? 'Editing requirements' : 'Notes from client'}
            </span>
            <textarea
              value={clientNotes}
              onChange={(event) => setClientNotes(event.target.value)}
              rows={4}
              placeholder={
                isExternal
                  ? 'Style, cropping, retouching, background removal'
                  : 'Optional instructions or context'
              }
              className="w-full resize-y rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-base text-[var(--foreground)] placeholder:text-[var(--muted)] focus:border-[var(--primary)] focus:outline-none focus:ring-2 focus:ring-[var(--primary-soft)] sm:text-sm"
            />
          </label>
        </FormSection>
        ) : null}

        {!isExternal && orderMode === 'new' ? (
        <FormSection
          title="Services & files"
          description="Add one or more lines with services and incoming file counts."
          action={
            <Button
              type="button"
              size="sm"
              variant="secondary"
              className="h-10 w-full sm:h-8 sm:w-auto"
              onClick={() => setWorkLines((lines) => [...lines, emptyWorkLine()])}
            >
              Add line
            </Button>
          }
        >
          {servicesLoadError ? (
            <p className="text-xs text-[var(--danger)]">{servicesLoadError}</p>
          ) : null}
          {!clientOrganizationId && canManage && !clientLocked ? (
            <p className="rounded-[var(--radius-md)] border border-dashed border-[var(--border)] px-3 py-2 text-xs text-[var(--muted)]">
              Select a client first to load their enabled services and pricing.
            </p>
          ) : null}

          <div className="space-y-3">
            {workLines.map((line, index) => (
              <div
                key={line.key}
                className="space-y-3 rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--surface)] p-3"
              >
                <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_7.5rem_auto] sm:items-end">
                  <label className="block min-w-0 space-y-1.5">
                    <span className="text-xs font-medium text-[var(--muted)]">
                      Services · line {index + 1}
                    </span>
                    <ServiceMultiSelect
                      value={line.serviceIds}
                      options={
                        clientOrganizationId ? enabledServiceOptions : undefined
                      }
                      onChange={(ids, text) =>
                        updateWorkLine(line.key, {
                          serviceIds: ids,
                          servicesText: text,
                        })
                      }
                    />
                  </label>
                  <Input
                    label="In Files"
                    type="number"
                    inputMode="numeric"
                    min={0}
                    value={line.inFileCount}
                    className="text-base sm:text-sm"
                    onChange={(event) =>
                      updateWorkLine(line.key, {
                        inFileCount: event.target.value,
                      })
                    }
                  />
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    className="h-11 w-11 shrink-0 px-0"
                    disabled={workLines.length <= 1}
                    aria-label={`Remove line ${index + 1}`}
                    onClick={() =>
                      setWorkLines((lines) =>
                        lines.length <= 1
                          ? lines
                          : lines.filter((row) => row.key !== line.key),
                      )
                    }
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
                {canManage ? (
                  <div className="grid gap-3 sm:grid-cols-2">
                    <label className="block space-y-1.5">
                      <span className="text-xs font-medium text-[var(--muted)]">
                        Artist
                      </span>
                      <select
                        value={line.assignedArtistUserId}
                        onChange={(event) =>
                          updateWorkLine(line.key, {
                            assignedArtistUserId: event.target.value,
                          })
                        }
                        className={selectClassName}
                      >
                        <option value="">Unassigned</option>
                        {assignableUsers.map((user) => (
                          <option key={user.id} value={user.id}>
                            {user.fullName}
                          </option>
                        ))}
                      </select>
                    </label>
                    <Input
                      label="Extra Service Count"
                      type="number"
                      min={0}
                      value={line.extraServiceCount}
                      onChange={(event) =>
                        updateWorkLine(line.key, {
                          extraServiceCount: event.target.value,
                        })
                      }
                    />
                    {canViewFinance ? (
                      <>
                        <Input
                          label="Price to artist per image"
                          type="number"
                          min={0}
                          step="0.01"
                          value={line.artistRatePerImage}
                          onChange={(event) =>
                            updateWorkLine(line.key, {
                              artistRatePerImage: event.target.value,
                            })
                          }
                        />
                        <Input
                          label="Price"
                          type="number"
                          min={0}
                          step="0.01"
                          value={line.price}
                          onChange={(event) =>
                            updateWorkLine(line.key, {
                              price: event.target.value,
                            })
                          }
                        />
                      </>
                    ) : null}
                  </div>
                ) : null}
              </div>
            ))}
          </div>

          <p className="text-xs text-[var(--muted)]">
            Total In Files:{' '}
            <span className="font-medium text-[var(--foreground)]">
              {totalInFiles}
            </span>
            {canManage ? (
              <span className="mt-1 block">
                Assign artists on each Excel line. Team lead and QA are set below.
              </span>
            ) : null}
          </p>

        </FormSection>
        ) : null}

        {canManage && orderMode === 'new' ? (
          <FormSection
            title="Assignment & billing"
            description={
              canViewFinance
                ? 'Team lead, QA, order folder status, and internal remark. Price and Extra Service Count are per artist line above.'
                : 'Team lead, QA, order folder status, and internal remark. Extra Service Count is per artist line above.'
            }
          >
            <div className="space-y-4 rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--surface-muted)] p-4">
              <div className="grid gap-3 sm:grid-cols-2">
                {!isExternal ? (
                  <label className="block space-y-1.5">
                    <span className="text-sm font-medium text-[var(--foreground)]">
                      Order folder status
                    </span>
                    <select
                      value={folderStatusId}
                      onChange={(event) => setFolderStatusId(event.target.value)}
                      className={cn(selectClassName, 'font-medium')}
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
                ) : null}
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <label className="block space-y-1.5">
                  <span className="text-sm font-medium text-[var(--foreground)]">
                    Team lead
                  </span>
                  <select
                    value={assignedTeamLeadUserId}
                    onChange={(event) =>
                      setAssignedTeamLeadUserId(event.target.value)
                    }
                    className={selectClassName}
                  >
                    <option value="">Unassigned</option>
                    {assignableUsers.map((user) => (
                      <option key={user.id} value={user.id}>
                        {user.fullName}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="block space-y-1.5">
                  <span className="text-sm font-medium text-[var(--foreground)]">
                    QA
                  </span>
                  <select
                    value={assignedQaUserId}
                    onChange={(event) => setAssignedQaUserId(event.target.value)}
                    className={selectClassName}
                  >
                    <option value="">Unassigned</option>
                    {assignableUsers.map((user) => (
                      <option key={user.id} value={user.id}>
                        {user.fullName}
                      </option>
                    ))}
                  </select>
                </label>
              </div>

              <Input
                label="Remark"
                value={internalNotes}
                onChange={(event) => setInternalNotes(event.target.value)}
                placeholder="Visible to staff only"
              />
            </div>
          </FormSection>
        ) : null}
      </div>
    </Modal>
  );
}
