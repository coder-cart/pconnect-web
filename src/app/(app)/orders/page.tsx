'use client';

import { useEffect, useMemo, useState } from 'react';
import { Plus } from 'lucide-react';
import { apiRequest } from '@/lib/api-client';
import { ApiResponse, userHasPermission, userIsExternal } from '@/lib/auth';
import { PageHeader } from '@/components/ui/PageHeader';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { ListSkeleton } from '@/components/ui/Skeleton';
import { EmptyState, ErrorState } from '@/components/ui/StatePanels';
import { useWorkspace } from '@/components/providers/WorkspaceProvider';
import { OrderSummary } from '@/lib/orders';
import { MasterDataStatus, parseStatusMetadata } from '@/lib/order-status';
import { OrderCreateModal } from '@/components/orders/OrderCreateForm';
import { OrdersTable } from '@/components/orders/OrdersTable';

interface ClientOption {
  id: string;
  name: string;
}

export default function OrdersPage() {
  const { user, refreshKey, notifyRefresh } = useWorkspace();
  const canManage = userHasPermission(user, 'orders.manage');
  const canCreate =
    canManage || userHasPermission(user, 'orders.create');
  const isExternal = userIsExternal(user);
  const isAssignedView = !canManage && userHasPermission(user, 'orders.view');
  const [orders, setOrders] = useState<OrderSummary[]>([]);
  const [clients, setClients] = useState<ClientOption[]>([]);
  const [workflowStatuses, setWorkflowStatuses] = useState<MasterDataStatus[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);

  const [workflowStatusId, setWorkflowStatusId] = useState('');
  const [clientOrganizationId, setClientOrganizationId] = useState('');
  const [priority, setPriority] = useState('');
  const [overdueOnly, setOverdueOnly] = useState(false);
  const [bulkWorkflowStatusId, setBulkWorkflowStatusId] = useState('');
  const [bulkPriority, setBulkPriority] = useState('');

  const queryString = useMemo(() => {
    const params = new URLSearchParams({ pageSize: '50' });
    if (workflowStatusId) params.set('workflowStatusId', workflowStatusId);
    if (clientOrganizationId)
      params.set('clientOrganizationId', clientOrganizationId);
    if (priority) params.set('priority', priority);
    if (overdueOnly) params.set('overdueOnly', 'true');
    if (isAssignedView) params.set('assignedToMe', 'true');
    return params.toString();
  }, [
    workflowStatusId,
    clientOrganizationId,
    priority,
    overdueOnly,
    isAssignedView,
  ]);

  function load() {
    setIsLoading(true);
    apiRequest<ApiResponse<{ items: OrderSummary[] }>>(`/orders?${queryString}`)
      .then((ordersResponse) => {
        setOrders(ordersResponse.data.items);
        setSelectedIds([]);
      })
      .catch((error: Error) => setErrorMessage(error.message))
      .finally(() => setIsLoading(false));
  }

  useEffect(load, [refreshKey, queryString]);

  useEffect(() => {
    apiRequest<ApiResponse<MasterDataStatus[]>>('/orders/meta/workflow-statuses')
      .then((response) =>
        setWorkflowStatuses(
          response.data.map((item) => ({
            ...item,
            metadata: parseStatusMetadata(item.metadata),
          })),
        ),
      )
      .catch(() => setWorkflowStatuses([]));

    if (canManage) {
      apiRequest<ApiResponse<ClientOption[]>>('/clients')
        .then((response) => setClients(response.data))
        .catch(() => setClients([]));
    }
  }, [canManage, refreshKey]);

  function toggleSelect(orderId: string) {
    setSelectedIds((prev) =>
      prev.includes(orderId)
        ? prev.filter((id) => id !== orderId)
        : [...prev, orderId],
    );
  }

  async function handleBulkUpdate() {
    if (!selectedIds.length) return;
    if (!bulkWorkflowStatusId && !bulkPriority) return;
    setBusy(true);
    try {
      await apiRequest('/orders/bulk', {
        method: 'PATCH',
        body: JSON.stringify({
          orderIds: selectedIds,
          workflowStatusId: bulkWorkflowStatusId || undefined,
          priority: bulkPriority || undefined,
        }),
      });
      notifyRefresh();
      load();
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-4">
      <PageHeader
        title="Orders"
        description={
          isAssignedView
            ? 'Orders assigned to you as artist, team lead, QA, or batch editor.'
            : 'Commercial work units between projects and production batches.'
        }
        breadcrumbs={[
          { label: 'Workspace', href: '/dashboard' },
          { label: 'Orders' },
        ]}
        action={
          canCreate ? (
            <Button onClick={() => setCreateOpen(true)}>
              <Plus className="h-4 w-4" />
              New order
            </Button>
          ) : undefined
        }
      />

      <Card className="space-y-3">
        <div className="grid gap-3 md:grid-cols-4">
          <label className="block space-y-1">
            <span className="text-xs font-medium text-[var(--muted)]">
              Workflow
            </span>
            <select
              value={workflowStatusId}
              onChange={(event) => setWorkflowStatusId(event.target.value)}
              className="w-full rounded border border-[var(--border)] bg-[var(--surface)] px-2 py-1.5 text-sm"
            >
              <option value="">All statuses</option>
              {workflowStatuses.map((status) => (
                <option key={status.id} value={status.id}>
                  {status.name}
                </option>
              ))}
            </select>
          </label>
          {canManage ? (
            <label className="block space-y-1">
              <span className="text-xs font-medium text-[var(--muted)]">
                Client
              </span>
              <select
                value={clientOrganizationId}
                onChange={(event) => setClientOrganizationId(event.target.value)}
                className="w-full rounded border border-[var(--border)] bg-[var(--surface)] px-2 py-1.5 text-sm"
              >
                <option value="">All clients</option>
                {clients.map((client) => (
                  <option key={client.id} value={client.id}>
                    {client.name}
                  </option>
                ))}
              </select>
            </label>
          ) : null}
          <label className="block space-y-1">
            <span className="text-xs font-medium text-[var(--muted)]">
              Priority
            </span>
            <select
              value={priority}
              onChange={(event) => setPriority(event.target.value)}
              className="w-full rounded border border-[var(--border)] bg-[var(--surface)] px-2 py-1.5 text-sm"
            >
              <option value="">All priorities</option>
              <option value="low">Low</option>
              <option value="medium">Medium</option>
              <option value="high">High</option>
              <option value="urgent">Urgent</option>
            </select>
          </label>
          <label className="flex items-end gap-2 pb-1 text-sm">
            <input
              type="checkbox"
              checked={overdueOnly}
              onChange={(event) => setOverdueOnly(event.target.checked)}
            />
            Overdue only
          </label>
        </div>

        {canManage && selectedIds.length > 0 ? (
          <div className="flex flex-wrap items-end gap-2 border-t border-[var(--border)] pt-3">
            <select
              value={bulkWorkflowStatusId}
              onChange={(event) => setBulkWorkflowStatusId(event.target.value)}
              className="rounded border border-[var(--border)] bg-[var(--surface)] px-2 py-1.5 text-sm"
            >
              <option value="">Bulk workflow…</option>
              {workflowStatuses.map((status) => (
                <option key={status.id} value={status.id}>
                  {status.name}
                </option>
              ))}
            </select>
            <select
              value={bulkPriority}
              onChange={(event) => setBulkPriority(event.target.value)}
              className="rounded border border-[var(--border)] bg-[var(--surface)] px-2 py-1.5 text-sm"
            >
              <option value="">Bulk priority…</option>
              <option value="low">Low</option>
              <option value="medium">Medium</option>
              <option value="high">High</option>
              <option value="urgent">Urgent</option>
            </select>
            <Button size="sm" onClick={handleBulkUpdate} disabled={busy}>
              Apply to {selectedIds.length} selected
            </Button>
          </div>
        ) : null}
      </Card>

      {isLoading ? <ListSkeleton rows={5} /> : null}
      {!isLoading && errorMessage ? (
        <ErrorState title="Unable to load orders" description={errorMessage} />
      ) : null}
      {!isLoading && !errorMessage && orders.length === 0 ? (
        <EmptyState
          title="No orders yet"
          description="Create an order to group batches, deadlines, and client notes."
        />
      ) : null}

      {!isLoading && orders.length > 0 ? (
        <Card className="overflow-hidden p-0">
          <OrdersTable
            orders={orders}
            selectedIds={selectedIds}
            onToggle={toggleSelect}
            canBulk={canManage}
          />
        </Card>
      ) : null}

      <OrderCreateModal
        open={createOpen}
        canManage={canManage}
        isExternal={isExternal}
        onClose={() => setCreateOpen(false)}
        onCreated={() => {
          notifyRefresh();
          load();
        }}
      />
    </div>
  );
}
