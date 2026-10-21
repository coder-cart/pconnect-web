'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { LayoutGrid, List, Plus, SlidersHorizontal } from 'lucide-react';
import { apiDownload, apiRequest } from '@/lib/api-client';
import {
  ApiResponse,
  isProductionOnlyStaff,
  userHasPermission,
  userIsExternal,
} from '@/lib/auth';
import { PageHeader } from '@/components/ui/PageHeader';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { ListSkeleton } from '@/components/ui/Skeleton';
import { EmptyState, ErrorState, RestrictedState } from '@/components/ui/StatePanels';
import { useWorkspace } from '@/components/providers/WorkspaceProvider';
import {
  MANAGER_WORKFLOW_OPTIONS,
  ORDER_LIST_SCOPES,
  OrderListScope,
  OrderSummary,
} from '@/lib/orders';
import { isWorkspaceAdmin } from '@/lib/navigation';
import { OrderKanbanBoard } from '@/components/orders/OrderKanbanBoard';
import { OrderCreateModal } from '@/components/orders/OrderCreateForm';
import { OrdersTable } from '@/components/orders/OrdersTable';
import { OrderDetailDrawer } from '@/components/orders/OrderDetailDrawer';

const ORDER_VIEW_STORAGE_KEY = 'pconnect.orders.view';

interface OrderFilters {
  dueAfter: string;
  dueBefore: string;
  lifecycleStage: string;
  clientOrganizationId: string;
  priority: string;
  overdueOnly: boolean;
}

const EMPTY_FILTERS: OrderFilters = {
  dueAfter: '',
  dueBefore: '',
  lifecycleStage: '',
  clientOrganizationId: '',
  priority: '',
  overdueOnly: false,
};

type OrderLayoutMode = 'list' | 'board';

function countActiveFilters(filters: OrderFilters): number {
  return (
    Number(Boolean(filters.dueAfter)) +
    Number(Boolean(filters.dueBefore)) +
    Number(Boolean(filters.lifecycleStage)) +
    Number(Boolean(filters.clientOrganizationId)) +
    Number(Boolean(filters.priority)) +
    Number(filters.overdueOnly)
  );
}

function readSavedView(): { layout: OrderLayoutMode; filters: OrderFilters } {
  if (typeof window === 'undefined') {
    return { layout: 'board', filters: EMPTY_FILTERS };
  }
  try {
    const raw = window.localStorage.getItem(ORDER_VIEW_STORAGE_KEY);
    if (!raw) return { layout: 'board', filters: EMPTY_FILTERS };
    const parsed = JSON.parse(raw) as {
      layout?: OrderLayoutMode;
      filters?: Partial<OrderFilters>;
    };
    return {
      layout: parsed.layout === 'list' ? 'list' : 'board',
      filters: { ...EMPTY_FILTERS, ...parsed.filters },
    };
  } catch {
    return { layout: 'board', filters: EMPTY_FILTERS };
  }
}

interface ClientOption {
  id: string;
  name: string;
}

function isPermissionError(message: string) {
  return /permission|forbidden|not allowed|do not have access|restricted/i.test(
    message,
  );
}

export default function OrdersPage() {
  const { user, refreshKey, notifyRefresh } = useWorkspace();
  const canView = userHasPermission(user, 'orders.view');
  const canManage = userHasPermission(user, 'orders.manage');
  const canCreate =
    canManage || userHasPermission(user, 'orders.create');
  const isExternal = userIsExternal(user);
  const hideClientIdentity = isProductionOnlyStaff(user?.roleCodes);
  const searchParams = useSearchParams();
  const lifecycleStage = searchParams.get('lifecycleStage') ?? '';
  const historyView = searchParams.get('history') === '1';
  const canExportAll = isWorkspaceAdmin(user.roleCodes);
  // Assigned-only list is for internal non-managers (editor/QA).
  // Externals must see all org-scoped orders — never force assignedToMe.
  const isAssignedView =
    !isExternal &&
    !canManage &&
    canView;
  const [orders, setOrders] = useState<OrderSummary[]>([]);
  const [clients, setClients] = useState<ClientOption[]>([]);
  const [bulkStage, setBulkStage] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [accessRestricted, setAccessRestricted] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);

  const [layout, setLayout] = useState<OrderLayoutMode>('board');
  const [listScope, setListScope] = useState<OrderListScope>('active');
  const [appliedFilters, setAppliedFilters] = useState<OrderFilters>(EMPTY_FILTERS);
  const [draftFilters, setDraftFilters] = useState<OrderFilters>(EMPTY_FILTERS);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [viewReady, setViewReady] = useState(false);
  const [openOrderId, setOpenOrderId] = useState<string | null>(null);
  const [bulkPriority, setBulkPriority] = useState('');
  const [exportError, setExportError] = useState<string | null>(null);

  useEffect(() => {
    const saved = readSavedView();
    setLayout(saved.layout);
    setAppliedFilters(saved.filters);
    setDraftFilters(saved.filters);
    setViewReady(true);
  }, []);

  useEffect(() => {
    if (!viewReady) return;
    window.localStorage.setItem(
      ORDER_VIEW_STORAGE_KEY,
      JSON.stringify({ layout, filters: appliedFilters }),
    );
  }, [viewReady, layout, appliedFilters]);

  const showBoard =
    canManage && layout === 'board' && listScope === 'active' && !historyView;
  const activeFilterCount = countActiveFilters(appliedFilters);

  const filterQuery = useMemo(() => {
    const params = new URLSearchParams();
    if (!historyView) params.set('listScope', listScope);
    const stage = appliedFilters.lifecycleStage || lifecycleStage;
    if (listScope === 'active' && stage) params.set('lifecycleStage', stage);
    if (appliedFilters.clientOrganizationId) {
      params.set('clientOrganizationId', appliedFilters.clientOrganizationId);
    }
    if (appliedFilters.priority) params.set('priority', appliedFilters.priority);
    if (appliedFilters.overdueOnly) params.set('overdueOnly', 'true');
    if (appliedFilters.dueAfter) params.set('dueAfter', appliedFilters.dueAfter);
    if (appliedFilters.dueBefore) params.set('dueBefore', appliedFilters.dueBefore);
    if (historyView) params.set('historyOnly', 'true');
    if (isAssignedView) params.set('assignedToMe', 'true');
    return params.toString();
  }, [appliedFilters, lifecycleStage, historyView, isAssignedView, listScope]);

  const queryString = useMemo(() => {
    const params = new URLSearchParams(filterQuery);
    params.set('pageSize', '50');
    return params.toString();
  }, [filterQuery]);

  function load() {
    setIsLoading(true);
    setErrorMessage(null);
    setAccessRestricted(false);
    apiRequest<ApiResponse<{ items: OrderSummary[] }>>(`/orders?${queryString}`)
      .then((ordersResponse) => {
        setOrders(ordersResponse.data.items);
        setSelectedIds([]);
      })
      .catch((error: Error) => {
        if (isPermissionError(error.message)) {
          setAccessRestricted(true);
        } else {
          setErrorMessage(error.message);
        }
      })
      .finally(() => setIsLoading(false));
  }

  useEffect(() => {
    if (!viewReady) return;
    load();
  }, [viewReady, refreshKey, queryString]);

  useEffect(() => {
    if (!canView) return;
    if (canManage) {
      apiRequest<ApiResponse<ClientOption[]>>('/clients')
        .then((response) => setClients(response.data))
        .catch(() => setClients([]));
    }
  }, [canView, canManage, refreshKey]);

  async function exportHistory(full: boolean) {
    setExportError(null);
    try {
      await apiDownload(
        full ? '/orders/history/export?full=true' : '/orders/history/export',
        full ? 'order-history-all.csv' : 'order-history.csv',
      );
    } catch (error) {
      setExportError(error instanceof Error ? error.message : 'Export failed');
    }
  }

  if (!canView) {
    return (
      <RestrictedState
        title="Orders access restricted"
        description="You need permission to view orders in this workspace."
      />
    );
  }

  if (accessRestricted) {
    return (
      <RestrictedState
        title="Orders access restricted"
        description="You do not have permission to view these orders."
      />
    );
  }

  function toggleSelect(orderId: string) {
    setSelectedIds((prev) =>
      prev.includes(orderId)
        ? prev.filter((id) => id !== orderId)
        : [...prev, orderId],
    );
  }

  async function handleBulkUpdate() {
    if (!selectedIds.length) return;
    if (!bulkStage && !bulkPriority) return;
    setBusy(true);
    setErrorMessage(null);
    try {
      if (bulkStage) {
        for (const orderId of selectedIds) {
          await apiRequest(`/orders/${orderId}/lifecycle-stage`, {
            method: 'POST',
            body: JSON.stringify({ stage: bulkStage }),
          });
        }
      }
      if (bulkPriority) {
        await apiRequest('/orders/bulk', {
          method: 'PATCH',
          body: JSON.stringify({
            orderIds: selectedIds,
            priority: bulkPriority,
          }),
        });
      }
      notifyRefresh();
      load();
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Could not update the orders');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-4">
      <PageHeader
        title={
          isExternal
            ? historyView
              ? 'Order history'
              : 'Order'
            : 'Order Report'
        }
        description={
          isExternal
            ? historyView
              ? 'Orders you saved to history in the last 90 days.'
              : 'Submit work, track delivery, and keep finished orders in history.'
            : isAssignedView
              ? 'Orders assigned to you.'
              : 'Counts by delivery stage, then the order list.'
        }
        breadcrumbs={[
          { label: 'Workspace', href: '/dashboard' },
          { label: isExternal ? 'Order' : 'Order Report' },
        ]}
        action={
          <div className="flex flex-wrap items-center gap-2">
            {canManage ? (
              <div className="flex rounded-[var(--radius-md)] border border-[var(--border)] p-0.5">
                <button
                  type="button"
                  onClick={() => setLayout('list')}
                  className={`inline-flex items-center gap-1 rounded-[var(--radius-sm)] px-2.5 py-1.5 text-sm ${
                    layout === 'list'
                      ? 'bg-[var(--primary)] text-[var(--primary-foreground)]'
                      : 'text-[var(--muted)]'
                  }`}
                >
                  <List className="h-4 w-4" />
                  List
                </button>
                <button
                  type="button"
                  onClick={() => setLayout('board')}
                  className={`inline-flex items-center gap-1 rounded-[var(--radius-sm)] px-2.5 py-1.5 text-sm ${
                    layout === 'board'
                      ? 'bg-[var(--primary)] text-[var(--primary-foreground)]'
                      : 'text-[var(--muted)]'
                  }`}
                >
                  <LayoutGrid className="h-4 w-4" />
                  Board
                </button>
              </div>
            ) : null}
            {isExternal ? null : (
              <Button
                variant="secondary"
                onClick={() => {
                  setDraftFilters(appliedFilters);
                  setFiltersOpen((open) => !open);
                }}
              >
                <SlidersHorizontal className="h-4 w-4" />
                Filter{activeFilterCount > 0 ? ` (${activeFilterCount})` : ''}
              </Button>
            )}
            {canCreate ? (
              <Button onClick={() => setCreateOpen(true)}>
                <Plus className="h-4 w-4" />
                New order
              </Button>
            ) : null}
          </div>
        }
      />

      {filtersOpen && !isExternal ? (
        <Card className="space-y-3">
          <div className="grid gap-3 md:grid-cols-3">
            <label className="block space-y-1">
              <span className="text-xs font-medium text-[var(--muted)]">Due from</span>
              <input
                type="date"
                value={draftFilters.dueAfter}
                onChange={(event) =>
                  setDraftFilters((current) => ({
                    ...current,
                    dueAfter: event.target.value,
                  }))
                }
                className="h-11 w-full rounded border border-[var(--border)] bg-[var(--surface)] px-2 py-1.5 text-base sm:h-9 sm:text-sm"
              />
            </label>
            <label className="block space-y-1">
              <span className="text-xs font-medium text-[var(--muted)]">Due to</span>
              <input
                type="date"
                value={draftFilters.dueBefore}
                onChange={(event) =>
                  setDraftFilters((current) => ({
                    ...current,
                    dueBefore: event.target.value,
                  }))
                }
                className="h-11 w-full rounded border border-[var(--border)] bg-[var(--surface)] px-2 py-1.5 text-base sm:h-9 sm:text-sm"
              />
            </label>
            <label className="block space-y-1">
              <span className="text-xs font-medium text-[var(--muted)]">Status</span>
              <select
                value={draftFilters.lifecycleStage}
                onChange={(event) =>
                  setDraftFilters((current) => ({
                    ...current,
                    lifecycleStage: event.target.value,
                  }))
                }
                className="h-11 w-full rounded border border-[var(--border)] bg-[var(--surface)] px-2 py-1.5 text-base sm:h-9 sm:text-sm"
              >
                <option value="">All statuses</option>
                {MANAGER_WORKFLOW_OPTIONS.map((option) => (
                  <option key={option.id} value={option.id}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>
            {canManage ? (
              <label className="block space-y-1">
                <span className="text-xs font-medium text-[var(--muted)]">Client</span>
                <select
                  value={draftFilters.clientOrganizationId}
                  onChange={(event) =>
                    setDraftFilters((current) => ({
                      ...current,
                      clientOrganizationId: event.target.value,
                    }))
                  }
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
              <span className="text-xs font-medium text-[var(--muted)]">Priority</span>
              <select
                value={draftFilters.priority}
                onChange={(event) =>
                  setDraftFilters((current) => ({
                    ...current,
                    priority: event.target.value,
                  }))
                }
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
                checked={draftFilters.overdueOnly}
                onChange={(event) =>
                  setDraftFilters((current) => ({
                    ...current,
                    overdueOnly: event.target.checked,
                  }))
                }
              />
              Overdue only
            </label>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button
              size="sm"
              onClick={() => {
                setAppliedFilters(draftFilters);
                setFiltersOpen(false);
              }}
            >
              Apply
            </Button>
            <Button
              size="sm"
              variant="secondary"
              onClick={() => {
                setDraftFilters(EMPTY_FILTERS);
                setAppliedFilters(EMPTY_FILTERS);
                setFiltersOpen(false);
              }}
            >
              Clear
            </Button>
          </div>
        </Card>
      ) : null}

      {!historyView ? (
        <div className="flex flex-wrap gap-2">
          {ORDER_LIST_SCOPES.map((scope) => (
            <button
              key={scope.id}
              type="button"
              onClick={() => setListScope(scope.id)}
              className={`rounded-[var(--radius-md)] border px-3 py-1.5 text-sm ${
                listScope === scope.id
                  ? 'border-[var(--primary)] bg-[var(--primary-soft)] font-medium text-[var(--foreground)]'
                  : 'border-[var(--border)] text-[var(--muted)]'
              }`}
            >
              {scope.label}
            </button>
          ))}
        </div>
      ) : null}

      {showBoard ? (
        <OrderKanbanBoard
          refreshKey={refreshKey}
          queryString={filterQuery}
          onMoved={notifyRefresh}
          onOpenOrder={setOpenOrderId}
        />
      ) : null}

      {isExternal ? (
        <div className="flex flex-wrap items-center gap-2">
          <Link
            href="/orders"
            className={`rounded-[var(--radius-md)] border px-3 py-1.5 text-sm ${
              historyView
                ? 'border-[var(--border)]'
                : 'border-[var(--primary)] bg-[var(--primary-soft)]'
            }`}
          >
            Active
          </Link>
          <Link
            href="/orders?history=1"
            className={`rounded-[var(--radius-md)] border px-3 py-1.5 text-sm ${
              historyView
                ? 'border-[var(--primary)] bg-[var(--primary-soft)]'
                : 'border-[var(--border)]'
            }`}
          >
            History
          </Link>
          <Button size="sm" variant="secondary" onClick={() => exportHistory(false)}>
            Export last 90 days
          </Button>
        </div>
      ) : null}

      {canExportAll && !isExternal ? (
        <div>
          <Button size="sm" variant="secondary" onClick={() => exportHistory(true)}>
            Export all client history
          </Button>
        </div>
      ) : null}

      {exportError ? (
        <ErrorState title="Export failed" description={exportError} />
      ) : null}

      {!showBoard && canManage && selectedIds.length > 0 ? (
        <Card>
          <div className="flex flex-wrap items-end gap-2">
            <select
              value={bulkStage}
              onChange={(event) => setBulkStage(event.target.value)}
              className="rounded border border-[var(--border)] bg-[var(--surface)] px-2 py-1.5 text-sm"
            >
              <option value="">Bulk workflow…</option>
              {MANAGER_WORKFLOW_OPTIONS.map((option) => (
                <option key={option.id} value={option.id}>
                  {option.label}
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
        </Card>
      ) : null}

      {!showBoard && isLoading ? <ListSkeleton rows={5} /> : null}
      {!showBoard && !isLoading && errorMessage ? (
        <ErrorState title="Unable to load orders" description={errorMessage} />
      ) : null}
      {!showBoard && !isLoading && !errorMessage && orders.length === 0 ? (
        <EmptyState
          title={
            historyView
              ? 'No history yet'
              : listScope === 'delivered'
                ? 'No delivered orders'
                : listScope === 'completed'
                  ? 'No completed orders'
                  : 'No active orders'
          }
          description={
            historyView
              ? 'Delivered orders you save appear here for 90 days.'
              : listScope === 'delivered'
                ? 'Orders marked delivered appear on this tab.'
                : listScope === 'completed'
                  ? 'Orders marked as received appear on this tab.'
                  : hideClientIdentity
                    ? 'Assigned orders appear here.'
                    : 'Create an order to track services, turnaround, and client notes.'
          }
        />
      ) : null}

      {!showBoard && !isLoading && orders.length > 0 ? (
        <Card className="overflow-hidden p-0">
          <OrdersTable
            orders={orders}
            selectedIds={selectedIds}
            onToggle={toggleSelect}
            canBulk={canManage}
            showClient={!hideClientIdentity}
            onOpen={setOpenOrderId}
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
      <OrderDetailDrawer
        orderId={openOrderId}
        onClose={() => setOpenOrderId(null)}
      />
    </div>
  );
}
