'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  CheckCircle2,
  Clock,
  ExternalLink,
  LayoutGrid,
  ShieldCheck,
  SlidersHorizontal,
} from 'lucide-react';
import { apiRequest } from '@/lib/api-client';
import { ApiResponse } from '@/lib/auth';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Modal, ModalActions } from '@/components/ui/Modal';
import { ErrorState } from '@/components/ui/StatePanels';
import { ListSkeleton } from '@/components/ui/Skeleton';
import {
  clientLifecycleStage,
  OrderSummary,
  toExternalHref,
  type ClientLifecycleStage,
} from '@/lib/orders';
import { cn } from '@/lib/cn';

type BoardColumnId =
  | 'order_received'
  | 'in_progress'
  | 'quality_check'
  | 'delivered';

const COLUMNS: Array<{
  id: BoardColumnId;
  label: string;
  hint: string;
  footer: string;
  icon: typeof Clock;
  tint: string;
  iconClass: string;
}> = [
  {
    id: 'order_received',
    label: 'Pending Orders',
    hint: 'Awaiting assignment',
    footer: 'View all pending orders',
    icon: Clock,
    tint: 'color-mix(in srgb, #f97316 14%, var(--surface))',
    iconClass: 'bg-orange-500 text-white',
  },
  {
    id: 'in_progress',
    label: 'In Progress',
    hint: 'Being edited',
    footer: 'View all in progress orders',
    icon: SlidersHorizontal,
    tint: 'color-mix(in srgb, #3b82f6 14%, var(--surface))',
    iconClass: 'bg-blue-500 text-white',
  },
  {
    id: 'quality_check',
    label: 'For Quality Check',
    hint: 'Ready for review',
    footer: 'View all QC orders',
    icon: ShieldCheck,
    tint: 'color-mix(in srgb, #8b5cf6 14%, var(--surface))',
    iconClass: 'bg-violet-500 text-white',
  },
  {
    id: 'delivered',
    label: 'Delivered',
    hint: 'Completed',
    footer: 'View all delivered orders',
    icon: CheckCircle2,
    tint: 'color-mix(in srgb, #22c55e 14%, var(--surface))',
    iconClass: 'bg-emerald-500 text-white',
  },
];

const COLUMN_ENTRY_CODE: Record<BoardColumnId, string> = {
  order_received: 'pending_review',
  in_progress: 'editing',
  quality_check: 'qa_review',
  delivered: 'delivered',
};

function boardColumn(code: string | null | undefined): BoardColumnId | null {
  if (!code || code === 'cancelled') return null;
  if (code === 'new_order' || code === 'on_hold') return 'order_received';
  if (code === 'ready_for_delivery') return 'quality_check';
  const stage = clientLifecycleStage(code);
  if (
    stage === 'order_received' ||
    stage === 'in_progress' ||
    stage === 'quality_check' ||
    stage === 'delivered'
  ) {
    return stage;
  }
  return null;
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
  onMoved,
  onOpenOrder,
}: {
  refreshKey?: number;
  queryString?: string;
  onMoved?: () => void;
  onOpenOrder?: (orderId: string) => void;
}) {
  const [orders, setOrders] = useState<OrderSummary[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [moveError, setMoveError] = useState<string | null>(null);
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [overColumn, setOverColumn] = useState<BoardColumnId | null>(null);
  const [linkPrompt, setLinkPrompt] = useState<OrderSummary | null>(null);
  const [linkValue, setLinkValue] = useState('');
  const [linkError, setLinkError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [boardRefresh, setBoardRefresh] = useState(0);
  const hasLoaded = useRef(false);

  useEffect(() => {
    let cancelled = false;
    if (!hasLoaded.current) setIsLoading(true);
    setErrorMessage(null);
    const params = new URLSearchParams(queryString);
    params.set('pageSize', '100');
    apiRequest<ApiResponse<{ items: OrderSummary[] }>>(`/orders?${params.toString()}`)
      .then((response) => {
        if (!cancelled) setOrders(response.data.items);
      })
      .catch((error: Error) => {
        if (!cancelled) setErrorMessage(error.message);
      })
      .finally(() => {
        if (!cancelled) {
          hasLoaded.current = true;
          setIsLoading(false);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [refreshKey, boardRefresh, queryString]);

  const grouped = useMemo(() => {
    const buckets: Record<BoardColumnId, OrderSummary[]> = {
      order_received: [],
      in_progress: [],
      quality_check: [],
      delivered: [],
    };
    for (const order of orders) {
      if (order.historySavedAt) continue;
      const column = boardColumn(order.workflowStatus?.code);
      if (column) buckets[column].push(order);
    }
    return buckets;
  }, [orders]);

  const total = Object.values(grouped).reduce((sum, rows) => sum + rows.length, 0);

  async function moveOrder(
    order: OrderSummary,
    stage: ClientLifecycleStage,
    deliveryLink?: string,
  ) {
    const current = boardColumn(order.workflowStatus?.code);
    if (current === stage && !deliveryLink) return;
    const previous = orders;
    setOrders((current) =>
      current.map((item) =>
        item.id === order.id
          ? {
              ...item,
              workflowStatus: {
                id: item.workflowStatus?.id ?? '',
                name: COLUMNS.find((column) => column.id === stage)?.label ?? stage,
                code: COLUMN_ENTRY_CODE[stage as BoardColumnId] ?? item.workflowStatus?.code ?? '',
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
      setLinkPrompt(null);
      setLinkValue('');
      onMoved?.();
      setBoardRefresh((value) => value + 1);
    } catch (error) {
      setOrders(previous);
      setMoveError(error instanceof Error ? error.message : 'Could not move the order');
    } finally {
      setBusy(false);
    }
  }

  function onDrop(stage: BoardColumnId, orderId: string) {
    const order = orders.find((item) => item.id === orderId);
    setOverColumn(null);
    setDraggingId(null);
    if (!order || boardColumn(order.workflowStatus?.code) === stage) return;
    if (stage === 'delivered' && !toExternalHref(order.deliveryLink ?? '')) {
      setLinkPrompt(order);
      setLinkValue('');
      setLinkError(null);
      return;
    }
    void moveOrder(order, stage);
  }

  if (isLoading) return <ListSkeleton rows={4} />;
  if (errorMessage) {
    return <ErrorState title="Unable to load the order board" description={errorMessage} />;
  }

  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
        <StatTile
          label="Total Orders"
          value={total}
          hint="On this board"
          icon={LayoutGrid}
          iconClass="bg-blue-500 text-white"
        />
        {COLUMNS.map((column) => (
          <StatTile
            key={column.id}
            label={column.label}
            value={grouped[column.id].length}
            hint={column.hint}
            icon={column.icon}
            iconClass={column.iconClass}
          />
        ))}
      </div>

      {moveError ? (
        <ErrorState title="Order stayed in its column" description={moveError} />
      ) : null}

      <div className="flex gap-3 overflow-x-auto pb-2">
        {COLUMNS.map((column) => {
          const rows = grouped[column.id];
          const draggingOrder = orders.find((item) => item.id === draggingId) ?? null;
          const sourceColumn = draggingOrder
            ? boardColumn(draggingOrder.workflowStatus?.code)
            : null;
          const isDropTarget = overColumn === column.id && sourceColumn !== column.id;
          return (
            <section
              key={column.id}
              className={cn(
                'flex w-[320px] shrink-0 flex-col rounded-[var(--radius-lg)] border-2 transition-colors duration-150',
                isDropTarget
                  ? 'border-[var(--primary)] bg-[var(--primary-soft)] shadow-[var(--shadow-md)]'
                  : 'border-transparent',
              )}
              style={isDropTarget ? undefined : { background: column.tint }}
              onDragEnter={(event) => {
                event.preventDefault();
                setOverColumn(column.id);
              }}
              onDragOver={(event) => {
                event.preventDefault();
                event.dataTransfer.dropEffect = 'move';
                if (overColumn !== column.id) setOverColumn(column.id);
              }}
              onDrop={(event) => {
                event.preventDefault();
                const orderId =
                  event.dataTransfer.getData('text/plain') || draggingId || '';
                if (orderId) onDrop(column.id, orderId);
              }}
            >
              <header className="flex items-center gap-2 px-3 py-3">
                <span className={cn('flex h-7 w-7 items-center justify-center rounded-full', column.iconClass)}>
                  <column.icon className="h-3.5 w-3.5" aria-hidden />
                </span>
                <h2 className="text-sm font-semibold text-[var(--foreground)]">{column.label}</h2>
                <span className="rounded-full bg-[var(--surface)] px-2 py-0.5 text-xs font-medium text-[var(--muted)]">
                  {rows.length}
                </span>
                <Link
                  href={`/orders?lifecycleStage=${column.id}`}
                  className="ml-auto text-xs font-medium text-[var(--primary)]"
                >
                  View all
                </Link>
              </header>
              <div className="flex min-h-48 flex-1 flex-col gap-2 px-2 pb-2">
                {isDropTarget ? (
                  <div className="rounded-[var(--radius-md)] border-2 border-dashed border-[var(--primary)] bg-[var(--surface)] px-3 py-4 text-center text-sm font-medium text-[var(--primary)]">
                    Drop {draggingOrder?.name || draggingOrder?.code || 'order'} here
                  </div>
                ) : null}
                {rows.length === 0 && !isDropTarget ? (
                  <p className="px-2 py-6 text-center text-xs text-[var(--muted)]">
                    Drag an order here
                  </p>
                ) : null}
                {rows.length === 0 ? null : (
                  rows.map((order) => (
                    <OrderCard
                      key={order.id}
                      order={order}
                      dragging={draggingId === order.id}
                      onOpen={onOpenOrder}
                      onDragStart={() => setDraggingId(order.id)}
                      onDragEnd={() => {
                        setDraggingId(null);
                        setOverColumn(null);
                      }}
                    />
                  ))
                )}
                <Link
                  href={`/orders?lifecycleStage=${column.id}`}
                  className="mt-auto rounded-[var(--radius-md)] border border-dashed border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-center text-xs font-medium text-[var(--muted)] hover:text-[var(--foreground)]"
                >
                  {column.footer}
                </Link>
              </div>
            </section>
          );
        })}
      </div>

      <Modal
        open={Boolean(linkPrompt)}
        title="Delivery link"
        description={
          linkPrompt
            ? `Add the delivery link for ${linkPrompt.name} before it can be marked Delivered.`
            : undefined
        }
        onClose={() => {
          if (!busy) setLinkPrompt(null);
        }}
        footer={
          <ModalActions
            onCancel={() => setLinkPrompt(null)}
            onSubmit={() => {
              if (!linkPrompt) return;
              const href = toExternalHref(linkValue);
              if (!href) {
                setLinkError('Enter an http or https link.');
                return;
              }
              setLinkError(null);
              void moveOrder(linkPrompt, 'delivered', href);
            }}
            submitLabel="Mark delivered"
            isSubmitting={busy}
          />
        }
      >
        <Input
          label="Delivery link"
          value={linkValue}
          onChange={(event) => setLinkValue(event.target.value)}
          placeholder="https://"
          error={linkError ?? undefined}
        />
      </Modal>
    </div>
  );
}

function StatTile({
  label,
  value,
  hint,
  icon: Icon,
  iconClass,
}: {
  label: string;
  value: number;
  hint: string;
  icon: typeof Clock;
  iconClass: string;
}) {
  return (
    <div className="rounded-[var(--radius-lg)] bg-[#0f172a] px-4 py-3 text-white">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs text-slate-300">{label}</p>
          <p className="mt-1 text-2xl font-semibold">{value}</p>
          <p className="text-xs text-slate-400">{hint}</p>
        </div>
        <span className={cn('flex h-9 w-9 items-center justify-center rounded-xl', iconClass)}>
          <Icon className="h-4 w-4" aria-hidden />
        </span>
      </div>
    </div>
  );
}

function OrderCard({
  order,
  dragging,
  onOpen,
  onDragStart,
  onDragEnd,
}: {
  order: OrderSummary;
  dragging: boolean;
  onOpen?: (orderId: string) => void;
  onDragStart: () => void;
  onDragEnd: () => void;
}) {
  const router = useRouter();
  const dragged = useRef(false);
  const artist = artistName(order);
  const count = order.inFileCount || order.imageCount || 0;
  const deliveryHref = toExternalHref(order.deliveryLink ?? '');
  const ready = order.workflowStatus?.code === 'ready_for_delivery';
  const priority = order.priority;

  function openOrder() {
    if (onOpen) onOpen(order.id);
    else router.push(`/orders/${order.id}`);
  }

  return (
    <article
      draggable
      role="link"
      tabIndex={0}
      onClick={(event) => {
        if (dragged.current) {
          dragged.current = false;
          return;
        }
        const target = event.target;
        if (target instanceof Element && target.closest('a')) return;
        openOrder();
      }}
      onKeyDown={(event) => {
        if (event.key === 'Enter') openOrder();
      }}
      onDragStart={(event) => {
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
      }}
      onDragEnd={() => {
        onDragEnd();
        window.setTimeout(() => {
          dragged.current = false;
        }, 0);
      }}
      className={cn(
        'cursor-grab rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--surface)] p-3 shadow-sm transition-transform duration-150 hover:border-[var(--primary)] active:cursor-grabbing',
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
            <p className="text-[11px] text-[var(--muted)]">{order.code}</p>
            {deliveryHref ? (
              <a
                href={deliveryHref}
                target="_blank"
                rel="noreferrer"
                aria-label="Open delivery link"
                onClick={(event) => event.stopPropagation()}
              >
                <ExternalLink className="h-3.5 w-3.5 text-[var(--muted)]" />
              </a>
            ) : null}
          </div>
          <p className="truncate text-sm font-semibold text-[var(--foreground)]">
            {order.name}
          </p>
          <p className="truncate text-xs text-[var(--muted)]">
            {order.clientOrganization?.name ?? 'No client'}
          </p>
        </div>
      </div>
      <div className="mt-3 flex items-end justify-between gap-2">
        <div className="text-[11px] text-[var(--muted)]">
          <p>{formatWhen(order.inDate ?? order.dueDate)}</p>
          <p>{count.toLocaleString()} images</p>
        </div>
        <div className="flex items-center gap-1.5">
          {ready ? (
            <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-medium text-emerald-800">
              Ready
            </span>
          ) : null}
          <span
            className={cn(
              'rounded-full px-2 py-0.5 text-[10px] font-medium',
              priority === 'urgent' || priority === 'high'
                ? 'bg-rose-100 text-rose-700'
                : priority === 'low'
                  ? 'bg-slate-100 text-slate-600'
                  : 'bg-amber-100 text-amber-800',
            )}
          >
            {boardColumn(order.workflowStatus?.code) === 'delivered'
              ? 'Delivered'
              : priorityLabel(priority)}
          </span>
          {artist ? (
            <span className="flex h-6 w-6 items-center justify-center rounded-full bg-[#0f172a] text-[10px] font-medium text-white">
              {initials(artist)}
            </span>
          ) : null}
        </div>
      </div>
    </article>
  );
}
