'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import {
  CheckCircle2,
  ChevronDown,
  LayoutGrid,
  List,
  Plus,
  SlidersHorizontal,
} from 'lucide-react';
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
import { useRealtime } from '@/components/providers/RealtimeProvider';
import {
  CLIENT_DASHBOARD_TABS,
  ClientDashboardTab,
  MANAGER_DASHBOARD_TABS,
  MANAGER_WORKFLOW_OPTIONS,
  ManagerDashboardTab,
  OrderSummary,
  toExternalHref,
} from '@/lib/orders';
import { isWorkspaceAdmin } from '@/lib/navigation';
import { OrderKanbanBoard } from '@/components/orders/OrderKanbanBoard';
import { OrderCreateModal } from '@/components/orders/OrderCreateForm';
import { OrdersTable } from '@/components/orders/OrdersTable';
import { OrderDetailDrawer } from '@/components/orders/OrderDetailDrawer';
import { cn } from '@/lib/cn';

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

function isManagerTab(value: string | null): value is ManagerDashboardTab {
  return MANAGER_DASHBOARD_TABS.some((tab) => tab.id === value);
}

function isClientTab(value: string | null): value is ClientDashboardTab {
  return CLIENT_DASHBOARD_TABS.some((tab) => tab.id === value);
}

export default function OrdersPage() {
  const { user, refreshKey, notifyRefresh } = useWorkspace();
  const { subscribeOrderUpdated, subscribeNotificationCreated } = useRealtime();
  const syncTimerRef = useRef<number | null>(null);
  const canView = userHasPermission(user, 'orders.view');
  const canManage = userHasPermission(user, 'orders.manage');
  const canCreate =
    canManage || userHasPermission(user, 'orders.create');
  const isExternal = userIsExternal(user);
  const hideClientIdentity = isProductionOnlyStaff(user?.roleCodes);
  const searchParams = useSearchParams();
  const historyView = searchParams.get('history') === '1';
  const canExportAll = isWorkspaceAdmin(user.roleCodes);
  const isAssignedView =
    !isExternal &&
    !canManage &&
    canView;

  const [orders, setOrders] = useState<OrderSummary[]>([]);
  const [tabCounts, setTabCounts] = useState<Record<string, number>>({});
  const [clients, setClients] = useState<ClientOption[]>([]);
  const [bulkStage, setBulkStage] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [accessRestricted, setAccessRestricted] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const [createMode, setCreateMode] = useState<'new' | 'revision'>('new');
  const [createMenuOpen, setCreateMenuOpen] = useState(false);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const [receivingId, setReceivingId] = useState<string | null>(null);

  const [layout, setLayout] = useState<OrderLayoutMode>('board');
  const [managerTab, setManagerTab] = useState<ManagerDashboardTab>('order_received');
  const [clientTab, setClientTab] = useState<ClientDashboardTab>('orders');
  const [appliedFilters, setAppliedFilters] = useState<OrderFilters>(EMPTY_FILTERS);
  const [draftFilters, setDraftFilters] = useState<OrderFilters>(EMPTY_FILTERS);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [viewReady, setViewReady] = useState(false);
  const [openOrderId, setOpenOrderId] = useState<string | null>(null);
  const [bulkPriority, setBulkPriority] = useState('');
  const [exportError, setExportError] = useState<string | null>(null);

  useEffect(() => {
    const saved = readSavedView();
    const layoutParam = searchParams.get('layout');
    setLayout(
      layoutParam === 'list' || layoutParam === 'board'
        ? layoutParam
        : saved.layout,
    );
    setAppliedFilters(saved.filters);
    setDraftFilters(saved.filters);

    const managerParam = searchParams.get('managerTab');
    const clientParam = searchParams.get('clientTab');
    const lifecycleParam = searchParams.get('lifecycleStage');
    if (isManagerTab(managerParam)) setManagerTab(managerParam);
    else if (lifecycleParam === 'ready_for_delivery') setManagerTab('quality_check');
    else if (isManagerTab(lifecycleParam)) setManagerTab(lifecycleParam);

    if (isClientTab(clientParam)) setClientTab(clientParam);

    setViewReady(true);
  }, [searchParams]);

  useEffect(() => {
    if (!viewReady) return;
    window.localStorage.setItem(
      ORDER_VIEW_STORAGE_KEY,
      JSON.stringify({ layout, filters: appliedFilters }),
    );
  }, [viewReady, layout, appliedFilters]);

  const showBoard =
    canManage && layout === 'board' && !historyView && !isExternal;
  const activeFilterCount = countActiveFilters(appliedFilters);

  const filterQuery = useMemo(() => {
    const params = new URLSearchParams();
    if (historyView) {
      params.set('historyOnly', 'true');
    } else if (isExternal) {
      params.set('clientTab', clientTab);
    } else if (canManage && layout === 'list') {
      params.set('managerTab', managerTab);
    } else if (!canManage) {
      params.set('listScope', 'board');
    } else {
      params.set('listScope', 'board');
    }

    if (appliedFilters.lifecycleStage && canManage && layout === 'list') {
      // Prefer tab filter; optional extra stage filter from advanced filters unused when tab set.
    }
    if (appliedFilters.clientOrganizationId) {
      params.set('clientOrganizationId', appliedFilters.clientOrganizationId);
    }
    if (appliedFilters.priority) params.set('priority', appliedFilters.priority);
    if (appliedFilters.overdueOnly) params.set('overdueOnly', 'true');
    if (appliedFilters.dueAfter) params.set('dueAfter', appliedFilters.dueAfter);
    if (appliedFilters.dueBefore) params.set('dueBefore', appliedFilters.dueBefore);
    if (isAssignedView) params.set('assignedToMe', 'true');
    return params.toString();
  }, [
    appliedFilters,
    historyView,
    isAssignedView,
    isExternal,
    canManage,
    layout,
    managerTab,
    clientTab,
  ]);

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

  function loadTabCounts() {
    if (historyView) return;
    const tabs = isExternal
      ? CLIENT_DASHBOARD_TABS.map((tab) => tab.id)
      : MANAGER_DASHBOARD_TABS.map((tab) => tab.id);

    void Promise.all(
      tabs.map(async (tab) => {
        const params = new URLSearchParams();
        params.set('pageSize', '1');
        if (isExternal) params.set('clientTab', tab);
        else params.set('managerTab', tab);
        if (isAssignedView) params.set('assignedToMe', 'true');
        try {
          const response = await apiRequest<
            ApiResponse<{ items: OrderSummary[]; total?: number }>
          >(`/orders?${params.toString()}`);
          const total = response.data.total ?? response.data.items.length;
          return [tab, total] as const;
        } catch {
          return [tab, 0] as const;
        }
      }),
    ).then((entries) => {
      setTabCounts(Object.fromEntries(entries));
    });
  }

  useEffect(() => {
    if (!viewReady) return;
    load();
    loadTabCounts();
  }, [viewReady, refreshKey, queryString]);

  useEffect(() => {
    function scheduleSync() {
      if (syncTimerRef.current != null) {
        window.clearTimeout(syncTimerRef.current);
      }
      syncTimerRef.current = window.setTimeout(() => {
        notifyRefresh();
      }, 250);
    }

    const unsubOrder = subscribeOrderUpdated(() => {
      scheduleSync();
    });
    const unsubNotice = subscribeNotificationCreated((notification) => {
      const type =
        notification &&
        typeof notification === 'object' &&
        'type' in notification &&
        typeof (notification as { type: unknown }).type === 'string'
          ? (notification as { type: string }).type
          : '';
      if (type.startsWith('order.')) scheduleSync();
    });

    function onVisible() {
      if (document.visibilityState === 'visible') scheduleSync();
    }
    document.addEventListener('visibilitychange', onVisible);

    return () => {
      unsubOrder();
      unsubNotice();
      document.removeEventListener('visibilitychange', onVisible);
      if (syncTimerRef.current != null) {
        window.clearTimeout(syncTimerRef.current);
      }
    };
  }, [
    notifyRefresh,
    subscribeOrderUpdated,
    subscribeNotificationCreated,
  ]);

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

  async function markReceived(orderId: string) {
    setReceivingId(orderId);
    setErrorMessage(null);
    try {
      await apiRequest(`/orders/${orderId}/acknowledge`, { method: 'POST' });
      notifyRefresh();
      load();
      loadTabCounts();
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : 'Could not confirm receipt',
      );
    } finally {
      setReceivingId(null);
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
      loadTabCounts();
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : 'Could not update the orders',
      );
    } finally {
      setBusy(false);
    }
  }

  const dashboardTabs = isExternal
    ? CLIENT_DASHBOARD_TABS
    : MANAGER_DASHBOARD_TABS;

  const activeTabId = isExternal ? clientTab : managerTab;

  function selectTab(tabId: string) {
    if (isExternal && isClientTab(tabId)) {
      setClientTab(tabId);
      setLayout('list');
      return;
    }
    if (isManagerTab(tabId)) {
      setManagerTab(tabId);
      if (layout === 'board') {
        // Keep board as overview of all four columns.
      }
    }
  }

  const emptyTitle = isExternal
    ? clientTab === 'orders'
      ? 'No new orders'
      : clientTab === 'in_progress'
        ? 'Nothing in progress'
        : clientTab === 'delivered'
          ? 'No delivered orders'
          : 'No completed orders'
    : managerTab === 'order_received'
      ? 'No orders received'
      : managerTab === 'in_progress'
        ? 'Nothing in progress'
        : managerTab === 'quality_check'
          ? 'No orders in QA'
          : 'No delivered orders awaiting receipt';

  return (
    <div className="space-y-4">
      <PageHeader
        title={isExternal ? 'Orders' : 'Order Report'}
        description={
          isExternal
            ? 'Create orders, track progress, confirm delivery, and review completed work.'
            : isAssignedView
              ? 'Orders assigned to you.'
              : 'Receive, produce, QA, and deliver client orders.'
        }
        breadcrumbs={[
          { label: 'Workspace', href: '/dashboard' },
          { label: isExternal ? 'Orders' : 'Order Report' },
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
            {canCreate && isExternal ? (
              <div className="relative">
                <Button
                  onClick={() => setCreateMenuOpen((open) => !open)}
                  aria-expanded={createMenuOpen}
                >
                  <Plus className="h-4 w-4" />
                  New
                  <ChevronDown className="h-4 w-4" />
                </Button>
                {createMenuOpen ? (
                  <div className="absolute right-0 z-20 mt-1 w-44 rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--surface)] p-1 shadow-[var(--shadow-md)]">
                    <button
                      type="button"
                      className="block w-full rounded-[var(--radius-sm)] px-3 py-2 text-left text-sm hover:bg-[var(--surface-muted)]"
                      onClick={() => {
                        setCreateMode('new');
                        setCreateOpen(true);
                        setCreateMenuOpen(false);
                      }}
                    >
                      New Order
                    </button>
                    <button
                      type="button"
                      className="block w-full rounded-[var(--radius-sm)] px-3 py-2 text-left text-sm hover:bg-[var(--surface-muted)]"
                      onClick={() => {
                        setCreateMode('revision');
                        setCreateOpen(true);
                        setCreateMenuOpen(false);
                      }}
                    >
                      Revision
                    </button>
                  </div>
                ) : null}
              </div>
            ) : null}
            {canCreate && !isExternal ? (
              <Button onClick={() => setCreateOpen(true)}>
                <Plus className="h-4 w-4" />
                New order
              </Button>
            ) : null}
          </div>
        }
      />

      {!historyView ? (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {dashboardTabs.map((tab) => {
            const count = tabCounts[tab.id];
            const active = activeTabId === tab.id && (isExternal || layout === 'list');
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => {
                  selectTab(tab.id);
                  if (canManage) setLayout('list');
                }}
                className={cn(
                  'rounded-[var(--radius-lg)] border px-4 py-3 text-left transition-colors',
                  active
                    ? 'border-[var(--primary)] bg-[var(--primary-soft)]'
                    : 'border-[var(--border)] bg-[var(--surface)] hover:border-[var(--primary)]',
                )}
              >
                <p className="text-xs font-medium uppercase tracking-wide text-[var(--muted)]">
                  {tab.label}
                </p>
                <p className="mt-1 text-2xl font-semibold text-[var(--foreground)]">
                  {typeof count === 'number' ? count : '—'}
                </p>
              </button>
            );
          })}
        </div>
      ) : null}

      {!historyView ? (
        <div className="flex flex-wrap gap-2 border-b border-[var(--border)] pb-2">
          {dashboardTabs.map((tab) => {
            const active =
              activeTabId === tab.id &&
              (isExternal || layout === 'list' || !canManage);
            const count = tabCounts[tab.id];
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => {
                  selectTab(tab.id);
                  if (canManage) setLayout('list');
                }}
                className={cn(
                  'rounded-[var(--radius-md)] px-3 py-1.5 text-sm',
                  active
                    ? 'bg-[var(--primary)] font-medium text-[var(--primary-foreground)]'
                    : 'text-[var(--muted)] hover:bg-[var(--surface-muted)]',
                )}
              >
                {tab.label}
                {typeof count === 'number' ? (
                  <span className="ml-1.5 opacity-80">({count})</span>
                ) : null}
              </button>
            );
          })}
          {canManage ? (
            <button
              type="button"
              onClick={() => setLayout('board')}
              className={cn(
                'ml-auto rounded-[var(--radius-md)] px-3 py-1.5 text-sm',
                layout === 'board'
                  ? 'bg-[var(--surface-muted)] font-medium text-[var(--foreground)]'
                  : 'text-[var(--muted)] hover:bg-[var(--surface-muted)]',
              )}
            >
              All stages board
            </button>
          ) : null}
        </div>
      ) : null}

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

      {showBoard ? (
        <OrderKanbanBoard
          refreshKey={refreshKey}
          queryString={filterQuery}
          onMoved={() => {
            notifyRefresh();
            loadTabCounts();
          }}
          onOpenOrder={setOpenOrderId}
        />
      ) : null}

      {isExternal && clientTab === 'completed' ? (
        <div className="flex flex-wrap items-center gap-2">
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
          title={emptyTitle}
          description={
            isExternal && clientTab === 'orders'
              ? 'Create a New Order or Revision to get started.'
              : hideClientIdentity
                ? 'Assigned orders appear here.'
                : 'Orders in this stage appear here.'
          }
        />
      ) : null}

      {!showBoard && !isLoading && orders.length > 0 ? (
        <div className="space-y-3">
          {isExternal && clientTab === 'delivered' ? (
            <div className="space-y-3 md:hidden">
              {orders.map((order) => {
                const deliveryHref = toExternalHref(order.deliveryLink ?? '');
                return (
                  <Card key={order.id} className="space-y-3 p-4">
                    <div>
                      <p className="text-xs text-[var(--muted)]">{order.code}</p>
                      <button
                        type="button"
                        onClick={() => setOpenOrderId(order.id)}
                        className="text-left text-sm font-semibold text-[var(--foreground)]"
                      >
                        {order.name}
                      </button>
                    </div>
                    {deliveryHref ? (
                      <a
                        href={deliveryHref}
                        target="_blank"
                        rel="noreferrer"
                        className="break-all text-sm text-[var(--primary)]"
                      >
                        Open delivery link
                      </a>
                    ) : null}
                    <Button
                      size="sm"
                      onClick={() => markReceived(order.id)}
                      disabled={receivingId === order.id}
                    >
                      <CheckCircle2 className="h-4 w-4" />
                      Mark as Received
                    </Button>
                  </Card>
                );
              })}
            </div>
          ) : null}

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

          {isExternal && clientTab === 'delivered' ? (
            <div className="hidden gap-2 md:flex md:flex-wrap">
              {orders.map((order) => (
                <Button
                  key={order.id}
                  size="sm"
                  variant="secondary"
                  onClick={() => markReceived(order.id)}
                  disabled={receivingId === order.id}
                >
                  <CheckCircle2 className="h-4 w-4" />
                  Receive {order.code}
                </Button>
              ))}
            </div>
          ) : null}
        </div>
      ) : null}

      <OrderCreateModal
        open={createOpen}
        canManage={canManage}
        isExternal={isExternal}
        initialMode={createMode}
        onClose={() => setCreateOpen(false)}
        onCreated={() => {
          notifyRefresh();
          if (isExternal) setClientTab('orders');
          else setManagerTab('order_received');
          load();
          loadTabCounts();
        }}
      />
      <OrderDetailDrawer
        orderId={openOrderId}
        onClose={() => setOpenOrderId(null)}
      />
    </div>
  );
}
