'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  Calendar,
  CheckCircle2,
  Clock,
  Download,
  ExternalLink,
  Images,
  MoreHorizontal,
  Package,
  ShieldCheck,
  SlidersHorizontal,
} from 'lucide-react';
import { apiRequest } from '@/lib/api-client';
import { ApiResponse } from '@/lib/auth';
import { ErrorState } from '@/components/ui/StatePanels';
import { ListSkeleton } from '@/components/ui/Skeleton';
import { Button } from '@/components/ui/Button';
import { DeliveryLinkModal } from '@/components/orders/DeliveryLinkModal';
import {
  canEditDeliveryLink,
  clientDashboardTab,
  clientLifecycleStage,
  OrderSummary,
  toExternalHref,
  type ClientLifecycleStage,
} from '@/lib/orders';
import { useWorkspace } from '@/components/providers/WorkspaceProvider';
import { cn } from '@/lib/cn';

type ManagerColumnId =
  | 'order_received'
  | 'in_progress'
  | 'quality_check'
  | 'delivered';

type ClientColumnId = 'orders' | 'in_progress' | 'delivered' | 'completed';

type BoardColumnId = ManagerColumnId | ClientColumnId;

type BoardVariant = 'manager' | 'client';

const MANAGER_COLUMNS: Array<{
  id: ManagerColumnId;
  label: string;
  footer: string;
  icon: typeof Clock;
  tint: string;
  iconClass: string;
}> = [
  {
    id: 'order_received',
    label: 'Order Received',
    footer: 'View all received orders',
    icon: Clock,
    tint: 'color-mix(in srgb, #f97316 14%, var(--surface))',
    iconClass: 'bg-orange-500 text-white',
  },
  {
    id: 'in_progress',
    label: 'In Progress',
    footer: 'View all in progress orders',
    icon: SlidersHorizontal,
    tint: 'color-mix(in srgb, #3b82f6 14%, var(--surface))',
    iconClass: 'bg-blue-500 text-white',
  },
  {
    id: 'quality_check',
    label: 'QA',
    footer: 'View all QA orders',
    icon: ShieldCheck,
    tint: 'color-mix(in srgb, #8b5cf6 14%, var(--surface))',
    iconClass: 'bg-violet-500 text-white',
  },
  {
    id: 'delivered',
    label: 'Delivered',
    footer: 'View all delivered orders',
    icon: CheckCircle2,
    tint: 'color-mix(in srgb, #22c55e 14%, var(--surface))',
    iconClass: 'bg-emerald-500 text-white',
  },
];

const CLIENT_COLUMNS: Array<{
  id: ClientColumnId;
  label: string;
  footer: string;
  icon: typeof Clock;
  tint: string;
  iconClass: string;
}> = [
  {
    id: 'orders',
    label: 'Orders',
    footer: 'View all new orders',
    icon: Package,
    tint: 'color-mix(in srgb, #f97316 14%, var(--surface))',
    iconClass: 'bg-orange-500 text-white',
  },
  {
    id: 'in_progress',
    label: 'In Progress',
    footer: 'View all in progress orders',
    icon: SlidersHorizontal,
    tint: 'color-mix(in srgb, #3b82f6 14%, var(--surface))',
    iconClass: 'bg-blue-500 text-white',
  },
  {
    id: 'delivered',
    label: 'Delivered',
    footer: 'View all delivered orders',
    icon: CheckCircle2,
    tint: 'color-mix(in srgb, #22c55e 14%, var(--surface))',
    iconClass: 'bg-emerald-500 text-white',
  },
  {
    id: 'completed',
    label: 'Completed',
    footer: 'View all completed orders',
    icon: ShieldCheck,
    tint: 'color-mix(in srgb, #8b5cf6 14%, var(--surface))',
    iconClass: 'bg-violet-500 text-white',
  },
];

const COLUMN_ENTRY_CODE: Record<ManagerColumnId, string> = {
  order_received: 'pending_review',
  in_progress: 'editing',
  quality_check: 'qa_review',
  delivered: 'delivered',
};

function managerBoardColumn(
  code: string | null | undefined,
): ManagerColumnId | null {
  if (!code || code === 'cancelled' || code === 'completed') return null;
  if (code === 'delivered') return 'delivered';
  const stage = clientLifecycleStage(code);
  if (
    stage === 'order_received' ||
    stage === 'in_progress' ||
    stage === 'quality_check'
  ) {
    return stage;
  }
  return null;
}

function clientBoardColumn(
  code: string | null | undefined,
): ClientColumnId | null {
  return clientDashboardTab(code);
}

function initials(name: string): string {
  return name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? '')
    .join('');
}

function priorityLabel(priority: string): string {
  if (priority === 'urgent') return 'Urgent';
  if (priority === 'high') return 'High';
  if (priority === 'low') return 'Low';
  return 'Medium';
}

function formatWhen(value?: string | null): string {
  if (!value) return 'No date';
  return new Date(value).toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

function artistName(order: OrderSummary): string | null {
  return (
    order.assignedArtist?.fullName ??
    order.workAllocations?.find((row) => row.assignedArtist?.fullName)
      ?.assignedArtist?.fullName ??
    null
  );
}

export function OrderKanbanBoard({
  refreshKey = 0,
  queryString = '',
  variant = 'manager',
  readOnly = false,
  onMoved,
  onOpenOrder,
  onMarkReceived,
  receivingId,
}: {
  refreshKey?: number;
  queryString?: string;
  variant?: BoardVariant;
  /** When true, cards cannot be dragged between columns. */
  readOnly?: boolean;
  onMoved?: () => void;
  onOpenOrder?: (orderId: string) => void;
  onMarkReceived?: (orderId: string) => void;
  receivingId?: string | null;
}) {
  const { user } = useWorkspace();
  const columns = variant === 'client' ? CLIENT_COLUMNS : MANAGER_COLUMNS;
  const isClient = variant === 'client';
  const effectiveReadOnly = readOnly || isClient;

  const [orders, setOrders] = useState<OrderSummary[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [moveError, setMoveError] = useState<string | null>(null);
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [overColumn, setOverColumn] = useState<BoardColumnId | null>(null);
  const [busy, setBusy] = useState(false);
  const [boardRefresh, setBoardRefresh] = useState(0);
  const [deliveryTarget, setDeliveryTarget] = useState<OrderSummary | null>(
    null,
  );
  const [deliveryModalMode, setDeliveryModalMode] = useState<'deliver' | 'save'>(
    'deliver',
  );
  const hasLoaded = useRef(false);

  useEffect(() => {
    let cancelled = false;
    if (!hasLoaded.current) setIsLoading(true);
    setErrorMessage(null);

    async function load() {
      try {
        if (isClient) {
          const base = new URLSearchParams(queryString);
          base.delete('listScope');
          base.delete('managerTab');
          base.delete('clientTab');
          base.set('pageSize', '50');
          const tabs: ClientColumnId[] = [
            'orders',
            'in_progress',
            'delivered',
            'completed',
          ];
          const responses = await Promise.all(
            tabs.map((tab) => {
              const params = new URLSearchParams(base);
              params.set('clientTab', tab);
              return apiRequest<ApiResponse<{ items: OrderSummary[] }>>(
                `/orders?${params.toString()}`,
              );
            }),
          );
          const merged = new Map<string, OrderSummary>();
          for (const response of responses) {
            for (const item of response.data.items) {
              merged.set(item.id, item);
            }
          }
          if (!cancelled) setOrders(Array.from(merged.values()));
          return;
        }

        const params = new URLSearchParams(queryString);
        params.set('pageSize', '100');
        params.delete('listScope');
        params.delete('clientTab');
        params.delete('managerTab');
        params.set('listScope', 'board');
        const response = await apiRequest<
          ApiResponse<{ items: OrderSummary[] }>
        >(`/orders?${params.toString()}`);
        if (!cancelled) setOrders(response.data.items);
      } catch (error) {
        if (!cancelled) {
          setErrorMessage(
            error instanceof Error ? error.message : 'Unable to load board',
          );
        }
      } finally {
        if (!cancelled) {
          hasLoaded.current = true;
          setIsLoading(false);
        }
      }
    }

    void load();
    return () => {
      cancelled = true;
    };
  }, [refreshKey, boardRefresh, queryString, isClient]);

  const grouped = useMemo(() => {
    const buckets = Object.fromEntries(
      columns.map((column) => [column.id, [] as OrderSummary[]]),
    ) as Record<BoardColumnId, OrderSummary[]>;

    for (const order of orders) {
      const column = isClient
        ? clientBoardColumn(order.workflowStatus?.code)
        : managerBoardColumn(order.workflowStatus?.code);
      if (column && buckets[column]) buckets[column].push(order);
    }
    return buckets;
  }, [orders, columns, isClient]);

  async function moveOrder(
    order: OrderSummary,
    stage: ClientLifecycleStage,
    deliveryLink?: string,
  ): Promise<boolean> {
    const current = managerBoardColumn(order.workflowStatus?.code);
    if (current === stage && !deliveryLink) return true;
    const previous = orders;
    setOrders((currentOrders) =>
      currentOrders.map((item) =>
        item.id === order.id
          ? {
              ...item,
              workflowStatus: {
                id: item.workflowStatus?.id ?? '',
                name:
                  MANAGER_COLUMNS.find((column) => column.id === stage)
                    ?.label ?? stage,
                code:
                  COLUMN_ENTRY_CODE[stage as ManagerColumnId] ??
                  item.workflowStatus?.code ??
                  '',
                metadata: item.workflowStatus?.metadata,
              },
              ...(deliveryLink ? { deliveryLink } : {}),
            }
          : item,
      ),
    );
    setBusy(true);
    setMoveError(null);
    try {
      await apiRequest(`/orders/${order.id}/lifecycle-stage`, {
        method: 'POST',
        body: JSON.stringify({
          stage,
          ...(deliveryLink ? { deliveryLink } : {}),
        }),
      });
      onMoved?.();
      setBoardRefresh((value) => value + 1);
      return true;
    } catch (error) {
      setOrders(previous);
      setMoveError(
        error instanceof Error ? error.message : 'Could not move the order',
      );
      return false;
    } finally {
      setBusy(false);
    }
  }

  function onDrop(stage: BoardColumnId, orderId: string) {
    if (effectiveReadOnly || isClient) return;
    const order = orders.find((item) => item.id === orderId);
    setOverColumn(null);
    setDraggingId(null);
    if (!order || managerBoardColumn(order.workflowStatus?.code) === stage)
      return;

    if (stage === 'delivered') {
      setMoveError(null);
      setDeliveryModalMode('deliver');
      setDeliveryTarget(order);
      return;
    }

    void moveOrder(order, stage as ClientLifecycleStage);
  }

  function openDeliveryLinkEditor(order: OrderSummary) {
    setMoveError(null);
    setDeliveryModalMode('save');
    setDeliveryTarget(order);
  }

  async function confirmDeliveryLink(deliveryLink: string) {
    if (!deliveryTarget) return;
    if (deliveryModalMode === 'deliver') {
      const ok = await moveOrder(deliveryTarget, 'delivered', deliveryLink);
      if (ok) setDeliveryTarget(null);
      return;
    }

    setBusy(true);
    setMoveError(null);
    try {
      await apiRequest(`/orders/${deliveryTarget.id}`, {
        method: 'PATCH',
        body: JSON.stringify({ deliveryLink }),
      });
      setOrders((currentOrders) =>
        currentOrders.map((item) =>
          item.id === deliveryTarget.id ? { ...item, deliveryLink } : item,
        ),
      );
      setDeliveryTarget(null);
      onMoved?.();
      setBoardRefresh((value) => value + 1);
    } catch (error) {
      setMoveError(
        error instanceof Error
          ? error.message
          : 'Could not save the delivery link',
      );
    } finally {
      setBusy(false);
    }
  }

  if (isLoading) return <ListSkeleton rows={4} />;
  if (errorMessage) {
    return (
      <ErrorState
        title="Unable to load the order board"
        description={errorMessage}
      />
    );
  }

  return (
    <div className="space-y-4">
      <DeliveryLinkModal
        open={Boolean(deliveryTarget)}
        mode={deliveryModalMode}
        orderCode={deliveryTarget?.code}
        orderName={deliveryTarget?.name}
        initialLink={deliveryTarget?.deliveryLink}
        isSubmitting={busy}
        onClose={() => {
          if (!busy) setDeliveryTarget(null);
        }}
        onConfirm={confirmDeliveryLink}
      />
      {moveError ? (
        <ErrorState title="Order stayed in its column" description={moveError} />
      ) : null}
      {busy && !effectiveReadOnly ? (
        <p className="text-xs text-[var(--muted)]">Updating board…</p>
      ) : null}
      {effectiveReadOnly && !isClient ? (
        <p className="text-xs text-[var(--muted)]">
          View-only board — stage changes are made by a manager.
        </p>
      ) : null}

      <div className="-mx-1 flex gap-3 overflow-x-auto overscroll-x-contain px-1 pb-2 snap-x snap-mandatory">
        {columns.map((column) => {
          const rows = grouped[column.id] ?? [];
          const draggingOrder =
            orders.find((item) => item.id === draggingId) ?? null;
          const sourceColumn = draggingOrder
            ? isClient
              ? clientBoardColumn(draggingOrder.workflowStatus?.code)
              : managerBoardColumn(draggingOrder.workflowStatus?.code)
            : null;
          const isDropTarget =
            !effectiveReadOnly &&
            overColumn === column.id &&
            sourceColumn !== column.id;
          const listHref = isClient
            ? `/orders?clientTab=${column.id}&layout=list`
            : `/orders?managerTab=${column.id}&layout=list`;

          return (
            <section
              key={column.id}
              className={cn(
                'flex w-[min(280px,85vw)] shrink-0 snap-start flex-col rounded-[var(--radius-lg)] border-2 transition-colors duration-150 sm:w-[320px]',
                isDropTarget
                  ? 'border-[var(--primary)] bg-[var(--primary-soft)] shadow-[var(--shadow-md)]'
                  : 'border-transparent',
              )}
              style={isDropTarget ? undefined : { background: column.tint }}
              onDragEnter={
                effectiveReadOnly
                  ? undefined
                  : (event) => {
                      event.preventDefault();
                      setOverColumn(column.id);
                    }
              }
              onDragOver={
                effectiveReadOnly
                  ? undefined
                  : (event) => {
                      event.preventDefault();
                      event.dataTransfer.dropEffect = 'move';
                      if (overColumn !== column.id) setOverColumn(column.id);
                    }
              }
              onDrop={
                effectiveReadOnly
                  ? undefined
                  : (event) => {
                      event.preventDefault();
                      const droppedId =
                        event.dataTransfer.getData('text/plain') ||
                        draggingId ||
                        '';
                      if (droppedId) onDrop(column.id, droppedId);
                    }
              }
            >
              <header className="flex items-center gap-2 px-3 py-3">
                <span
                  className={cn(
                    'flex h-7 w-7 items-center justify-center rounded-full',
                    column.iconClass,
                  )}
                >
                  <column.icon className="h-3.5 w-3.5" aria-hidden />
                </span>
                <h2 className="text-sm font-semibold text-[var(--foreground)]">
                  {column.label}
                </h2>
                <span className="rounded-full bg-[var(--surface)] px-2 py-0.5 text-xs font-medium text-[var(--muted)]">
                  {rows.length}
                </span>
                <Link
                  href={listHref}
                  className="ml-auto text-xs font-medium text-[var(--primary)]"
                >
                  View all
                </Link>
              </header>
              <div className="flex min-h-48 flex-1 flex-col gap-2 px-2 pb-2">
                {isDropTarget ? (
                  <div className="rounded-[var(--radius-md)] border-2 border-dashed border-[var(--primary)] bg-[var(--surface)] px-3 py-4 text-center text-sm font-medium text-[var(--primary)]">
                    Drop{' '}
                    {draggingOrder?.name || draggingOrder?.code || 'order'} here
                  </div>
                ) : null}
                {rows.length === 0 && !isDropTarget ? (
                  <p className="px-2 py-6 text-center text-xs text-[var(--muted)]">
                    {effectiveReadOnly
                      ? 'No orders in this stage'
                      : 'Drag an order here'}
                  </p>
                ) : null}
                {rows.map((order) => (
                  <OrderCard
                    key={order.id}
                    order={order}
                    dragging={draggingId === order.id}
                    readOnly={effectiveReadOnly}
                    variant={variant}
                    receivingId={receivingId}
                    canEditDeliveryLink={
                      variant === 'manager' &&
                      canEditDeliveryLink(
                        user.roleCodes,
                        order.workflowStatus?.code,
                      )
                    }
                    onEditDeliveryLink={
                      variant === 'manager'
                        ? () => openDeliveryLinkEditor(order)
                        : undefined
                    }
                    onMarkReceived={onMarkReceived}
                    onOpen={onOpenOrder}
                    onDragStart={() => setDraggingId(order.id)}
                    onDragEnd={() => {
                      setDraggingId(null);
                      setOverColumn(null);
                    }}
                  />
                ))}
                <Link
                  href={listHref}
                  className="mt-auto rounded-[var(--radius-md)] border border-dashed border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-center text-xs font-medium text-[var(--muted)] hover:text-[var(--foreground)]"
                >
                  {column.footer}
                </Link>
              </div>
            </section>
          );
        })}
      </div>
    </div>
  );
}

function OrderCard({
  order,
  dragging,
  readOnly = false,
  variant = 'manager',
  receivingId,
  canEditDeliveryLink: canEditLink = false,
  onEditDeliveryLink,
  onMarkReceived,
  onOpen,
  onDragStart,
  onDragEnd,
}: {
  order: OrderSummary;
  dragging: boolean;
  readOnly?: boolean;
  variant?: BoardVariant;
  receivingId?: string | null;
  canEditDeliveryLink?: boolean;
  onEditDeliveryLink?: () => void;
  onMarkReceived?: (orderId: string) => void;
  onOpen?: (orderId: string) => void;
  onDragStart: () => void;
  onDragEnd: () => void;
}) {
  const router = useRouter();
  const dragged = useRef(false);
  const artist = artistName(order);
  const count = order.inFileCount || order.imageCount || 0;
  const deliveryHref = toExternalHref(order.deliveryLink ?? '');
  const isRevision = Boolean(order.parentOrderId);
  const stage = clientLifecycleStage(order.workflowStatus?.code);
  const isDelivered = stage === 'delivered';
  const isCompleted = stage === 'completed';
  const priority = order.priority;
  const showArtist = variant === 'manager' && artist;
  const subtitle =
    variant === 'client'
      ? isRevision
        ? 'Revision'
        : 'New Order'
      : `${order.clientOrganization?.name ?? 'No client'}${
          isRevision ? ' · Revision' : ' · New Order'
        }`;

  function openOrder() {
    if (onOpen) onOpen(order.id);
    else router.push(`/orders/${order.id}`);
  }

  return (
    <article
      draggable={!readOnly}
      role="link"
      tabIndex={0}
      onClick={(event) => {
        if (dragged.current) {
          dragged.current = false;
          return;
        }
        const target = event.target;
        if (
          target instanceof Element &&
          target.closest('a, button, [data-stop-card-nav]')
        ) {
          return;
        }
        openOrder();
      }}
      onKeyDown={(event) => {
        if (event.key === 'Enter') openOrder();
      }}
      onDragStart={
        readOnly
          ? undefined
          : (event) => {
              dragged.current = true;
              event.dataTransfer.setData('text/plain', order.id);
              event.dataTransfer.effectAllowed = 'move';
              const ghost = event.currentTarget.cloneNode(true) as HTMLElement;
              ghost.style.position = 'fixed';
              ghost.style.top = '-1000px';
              ghost.style.left = '0';
              ghost.style.width = '280px';
              ghost.style.opacity = '1';
              ghost.style.transform = 'rotate(2deg)';
              ghost.style.boxShadow = '0 16px 40px rgba(15, 23, 42, 0.28)';
              ghost.style.pointerEvents = 'none';
              document.body.appendChild(ghost);
              event.dataTransfer.setDragImage(ghost, 24, 24);
              window.setTimeout(() => ghost.remove(), 0);
              onDragStart();
            }
      }
      onDragEnd={
        readOnly
          ? undefined
          : () => {
              onDragEnd();
              window.setTimeout(() => {
                dragged.current = false;
              }, 0);
            }
      }
      className={cn(
        'rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--surface)] p-3 shadow-sm transition-transform duration-150 hover:border-[var(--primary)]',
        readOnly ? 'cursor-pointer' : 'cursor-grab active:cursor-grabbing',
        dragging &&
          'scale-[0.98] border-dashed border-[var(--primary)] opacity-50 ring-2 ring-[var(--primary)]',
      )}
    >
      {dragging ? (
        <p className="mb-2 text-xs font-medium text-[var(--primary)]">Dragging</p>
      ) : null}
      <div className="flex gap-3">
        <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-[var(--radius-md)] bg-[var(--surface-muted)] text-sm font-semibold text-[var(--muted)]">
          {initials(order.name || order.code)}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <p className="text-[11px] font-medium text-[var(--primary)]">
              {order.code}
            </p>
            <span className="text-[var(--muted)]" aria-hidden>
              <MoreHorizontal className="h-3.5 w-3.5" />
            </span>
          </div>
          <p className="truncate text-sm font-semibold text-[var(--foreground)]">
            {order.name}
          </p>
          <p className="truncate text-xs text-[var(--muted)]">{subtitle}</p>
        </div>
      </div>
      <div className="mt-3 flex items-end justify-between gap-2">
        <div className="space-y-1 text-[11px] text-[var(--muted)]">
          <p className="flex items-center gap-1.5">
            <Calendar className="h-3 w-3 shrink-0" aria-hidden />
            {formatWhen(order.inDate ?? order.dueDate)}
          </p>
          <p className="flex items-center gap-1.5">
            <Images className="h-3 w-3 shrink-0" aria-hidden />
            {count.toLocaleString()} images
          </p>
        </div>
        <div className="flex flex-col items-end gap-1.5">
          {isDelivered || isCompleted ? (
            <div className="flex items-center gap-1.5">
              <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-medium text-emerald-800">
                {isCompleted ? 'Completed' : 'Delivered'}
              </span>
              {deliveryHref ? (
                <a
                  href={deliveryHref}
                  target="_blank"
                  rel="noreferrer"
                  aria-label="Open delivery files"
                  data-stop-card-nav
                  onClick={(event) => event.stopPropagation()}
                  className="flex h-6 w-6 items-center justify-center rounded-full bg-blue-500/15 text-blue-600"
                >
                  <Download className="h-3.5 w-3.5" />
                </a>
              ) : null}
            </div>
          ) : (
            <div className="flex items-center gap-1.5">
              <span
                className={cn(
                  'rounded-full px-2 py-0.5 text-[10px] font-medium',
                  priority === 'urgent' || priority === 'high'
                    ? 'bg-rose-100 text-rose-700'
                    : priority === 'low'
                      ? 'bg-emerald-100 text-emerald-800'
                      : 'bg-amber-100 text-amber-800',
                )}
              >
                {priorityLabel(priority)}
              </span>
              {showArtist ? (
                <span className="flex h-6 w-6 items-center justify-center rounded-full bg-[#0f172a] text-[10px] font-medium text-white">
                  {initials(artist)}
                </span>
              ) : null}
            </div>
          )}
          {variant === 'client' && isDelivered && onMarkReceived ? (
            <Button
              size="sm"
              data-stop-card-nav
              disabled={receivingId === order.id}
              onClick={(event) => {
                event.stopPropagation();
                onMarkReceived(order.id);
              }}
            >
              Mark as Received
            </Button>
          ) : null}
          {variant === 'manager' && canEditLink && onEditDeliveryLink ? (
            <Button
              size="sm"
              variant="secondary"
              data-stop-card-nav
              onClick={(event) => {
                event.stopPropagation();
                onEditDeliveryLink();
              }}
            >
              {deliveryHref ? 'Edit delivery link' : 'Add delivery link'}
            </Button>
          ) : null}
          {variant === 'manager' && deliveryHref && !isDelivered ? (
            <a
              href={deliveryHref}
              target="_blank"
              rel="noreferrer"
              aria-label="Open delivery link"
              data-stop-card-nav
              onClick={(event) => event.stopPropagation()}
            >
              <ExternalLink className="h-3.5 w-3.5 text-[var(--muted)]" />
            </a>
          ) : null}
        </div>
      </div>
    </article>
  );
}
