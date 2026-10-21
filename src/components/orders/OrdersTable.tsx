'use client';

import Link from 'next/link';
import { OrderSummary, humanize, orderPriorityVariant } from '@/lib/orders';
import { parseStatusMetadata } from '@/lib/order-status';
import { StatusBadge } from '@/components/orders/StatusBadge';
import { Badge } from '@/components/ui/Badge';
import { TableScroll } from '@/components/ui/TableScroll';

function isOverdue(order: OrderSummary): boolean {
  if (!order.dueDate) return false;
  const due = new Date(order.dueDate);
  if (Number.isNaN(due.getTime())) return false;
  const terminal = ['delivered', 'completed', 'cancelled'].includes(order.status);
  return due.getTime() < Date.now() && !terminal;
}

function orderArtists(order: OrderSummary) {
  const allocationArtists = (order.workAllocations ?? [])
    .map((row) => row.assignedArtist?.fullName)
    .filter((name): name is string => Boolean(name));
  const uniqueArtists = Array.from(new Set(allocationArtists));
  const primaryArtist =
    uniqueArtists[0] ?? order.assignedArtist?.fullName ?? null;
  const extraArtistCount = Math.max(uniqueArtists.length - 1, 0);
  return { primaryArtist, extraArtistCount };
}

function orderFolderDisplay(order: OrderSummary) {
  const allocationFolder =
    order.workAllocations?.find((row) => row.folderStatus)?.folderStatus ?? null;
  return (
    allocationFolder ??
    order.displayFolderStatus ??
    order.folderStatus ??
    null
  );
}

interface OrdersTableProps {
  orders: OrderSummary[];
  selectedIds: string[];
  onToggle: (orderId: string) => void;
  canBulk: boolean;
  showClient?: boolean;
  onOpen?: (orderId: string) => void;
}

export function OrdersTable({
  orders,
  selectedIds,
  onToggle,
  canBulk,
  showClient = true,
  onOpen,
}: OrdersTableProps) {
  return (
    <>
      <div className="space-y-3 md:hidden">
        {orders.map((order) => {
          const overdue = isOverdue(order);
          const { primaryArtist, extraArtistCount } = orderArtists(order);
          const folderDisplay = orderFolderDisplay(order);
          return (
            <article
              key={order.id}
              className={`rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--surface)] p-3 ${
                overdue
                  ? 'bg-[color-mix(in_srgb,var(--danger)_8%,transparent)]'
                  : ''
              }`}
            >
              <div className="flex items-start gap-3">
                {canBulk ? (
                  <input
                    type="checkbox"
                    className="mt-1 h-4 w-4"
                    checked={selectedIds.includes(order.id)}
                    onChange={() => onToggle(order.id)}
                    aria-label={`Select ${order.name}`}
                  />
                ) : null}
                <div className="min-w-0 flex-1 space-y-2">
                  <div>
                    {onOpen ? (
                      <button
                        type="button"
                        onClick={() => onOpen(order.id)}
                        className="text-left text-sm font-semibold text-[var(--foreground)] hover:text-[var(--primary)]"
                      >
                        {order.name}
                      </button>
                    ) : (
                      <Link
                        href={`/orders/${order.id}`}
                        className="text-sm font-semibold text-[var(--foreground)] hover:text-[var(--primary)]"
                      >
                        {order.name}
                      </Link>
                    )}
                    <p className="text-xs text-[var(--muted)]">{order.code}</p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Badge variant="primary">{order.outputFormat ?? 'JPG'}</Badge>
                    <Badge
                      variant={orderPriorityVariant(order.priority)}
                      className="capitalize"
                    >
                      {humanize(order.priority)}
                    </Badge>
                    {order.workflowStatus ? (
                      <StatusBadge
                        label={order.workflowStatus.name}
                        metadata={parseStatusMetadata(order.workflowStatus.metadata)}
                      />
                    ) : (
                      <Badge variant="neutral" className="capitalize">
                        {humanize(order.status)}
                      </Badge>
                    )}
                  </div>
                  <dl className="grid grid-cols-2 gap-x-3 gap-y-1 text-xs text-[var(--muted)]">
                    {showClient ? (
                      <>
                        <dt>Client</dt>
                        <dd className="truncate text-[var(--foreground)]">
                          {order.clientOrganization?.name ?? '—'}
                        </dd>
                      </>
                    ) : null}
                    <dt>Folder</dt>
                    <dd className="truncate text-[var(--foreground)]">
                      {folderDisplay?.name ?? '—'}
                    </dd>
                    <dt>Artist</dt>
                    <dd className="truncate text-[var(--foreground)]">
                      {primaryArtist
                        ? `${primaryArtist}${extraArtistCount > 0 ? ` +${extraArtistCount}` : ''}`
                        : '—'}
                    </dd>
                    <dt>Due</dt>
                    <dd
                      className={
                        overdue
                          ? 'font-medium text-[var(--danger)]'
                          : 'text-[var(--foreground)]'
                      }
                    >
                      {order.dueDate
                        ? new Date(order.dueDate).toLocaleDateString()
                        : '—'}
                      {overdue ? ' · Overdue' : ''}
                    </dd>
                    <dt>In files</dt>
                    <dd className="text-[var(--foreground)]">{order.imageCount}</dd>
                  </dl>
                </div>
              </div>
            </article>
          );
        })}
      </div>

      <TableScroll className="hidden md:block">
        <table className="w-full min-w-[720px] text-sm">
          <thead className="border-b border-[var(--border)] bg-[var(--surface-muted)] text-left text-xs text-[var(--muted)]">
            <tr>
              {canBulk ? <th className="w-10 px-4 py-3" /> : null}
              <th className="sticky left-0 z-10 bg-[var(--surface-muted)] px-4 py-3 font-medium">
                Order
              </th>
              {showClient ? (
                <th className="px-4 py-3 font-medium">Client</th>
              ) : null}
              <th className="px-4 py-3 font-medium">Format</th>
              <th className="px-4 py-3 font-medium">Priority</th>
              <th className="px-4 py-3 font-medium">Workflow</th>
              <th className="px-4 py-3 font-medium">Folder Status</th>
              <th className="px-4 py-3 font-medium">Artist</th>
              <th className="px-4 py-3 font-medium">Due</th>
              <th className="px-4 py-3 font-medium">In Files</th>
            </tr>
          </thead>
          <tbody>
            {orders.map((order) => {
              const overdue = isOverdue(order);
              const { primaryArtist, extraArtistCount } = orderArtists(order);
              const folderDisplay = orderFolderDisplay(order);
              return (
                <tr
                  key={order.id}
                  className={`border-b border-[var(--border)] last:border-0 ${
                    overdue
                      ? 'bg-[color-mix(in_srgb,var(--danger)_8%,transparent)]'
                      : ''
                  }`}
                >
                  {canBulk ? (
                    <td className="px-4 py-3">
                      <input
                        type="checkbox"
                        checked={selectedIds.includes(order.id)}
                        onChange={() => onToggle(order.id)}
                      />
                    </td>
                  ) : null}
                  <td
                    className={`sticky left-0 z-10 px-4 py-3 ${
                      overdue
                        ? 'bg-[color-mix(in_srgb,var(--danger)_8%,var(--surface))]'
                        : 'bg-[var(--surface)]'
                    }`}
                  >
                    {onOpen ? (
                      <button
                        type="button"
                        onClick={() => onOpen(order.id)}
                        className="font-medium text-[var(--foreground)] hover:text-[var(--primary)]"
                      >
                        {order.name}
                      </button>
                    ) : (
                      <Link
                        href={`/orders/${order.id}`}
                        className="font-medium text-[var(--foreground)] hover:text-[var(--primary)]"
                      >
                        {order.name}
                      </Link>
                    )}
                    <p className="text-xs text-[var(--muted)]">{order.code}</p>
                  </td>
                  {showClient ? (
                    <td className="px-4 py-3 text-[var(--muted)]">
                      {order.clientOrganization?.name ?? '—'}
                    </td>
                  ) : null}
                  <td className="px-4 py-3">
                    <Badge variant="primary">{order.outputFormat ?? 'JPG'}</Badge>
                  </td>
                  <td className="px-4 py-3">
                    <Badge
                      variant={orderPriorityVariant(order.priority)}
                      className="capitalize"
                    >
                      {humanize(order.priority)}
                    </Badge>
                  </td>
                  <td className="px-4 py-3">
                    {order.workflowStatus ? (
                      <StatusBadge
                        label={order.workflowStatus.name}
                        metadata={parseStatusMetadata(order.workflowStatus.metadata)}
                      />
                    ) : (
                      <span className="capitalize text-[var(--muted)]">
                        {humanize(order.status)}
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    {folderDisplay ? (
                      <StatusBadge
                        label={folderDisplay.name}
                        metadata={parseStatusMetadata(folderDisplay.metadata)}
                      />
                    ) : (
                      '—'
                    )}
                  </td>
                  <td className="px-4 py-3 text-[var(--muted)]">
                    {primaryArtist ? (
                      <span>
                        {primaryArtist}
                        {extraArtistCount > 0 ? (
                          <span className="ml-1 text-xs">+{extraArtistCount}</span>
                        ) : null}
                      </span>
                    ) : (
                      '—'
                    )}
                  </td>
                  <td
                    className={`px-4 py-3 ${
                      overdue
                        ? 'font-medium text-[var(--danger)]'
                        : 'text-[var(--muted)]'
                    }`}
                  >
                    {order.dueDate
                      ? new Date(order.dueDate).toLocaleDateString()
                      : '—'}
                    {overdue ? ' · Overdue' : ''}
                  </td>
                  <td className="px-4 py-3">{order.imageCount}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </TableScroll>
    </>
  );
}
