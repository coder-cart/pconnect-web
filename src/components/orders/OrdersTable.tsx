'use client';

import Link from 'next/link';
import { OrderSummary, humanize, orderPriorityVariant } from '@/lib/orders';
import { parseStatusMetadata } from '@/lib/order-status';
import { StatusBadge } from '@/components/orders/StatusBadge';
import { Badge } from '@/components/ui/Badge';

function isOverdue(order: OrderSummary): boolean {
  if (!order.dueDate) return false;
  const due = new Date(order.dueDate);
  if (Number.isNaN(due.getTime())) return false;
  const terminal = ['delivered', 'completed', 'cancelled'].includes(order.status);
  return due.getTime() < Date.now() && !terminal;
}

interface OrdersTableProps {
  orders: OrderSummary[];
  selectedIds: string[];
  onToggle: (orderId: string) => void;
  canBulk: boolean;
  onOpen?: (orderId: string) => void;
}

export function OrdersTable({
  orders,
  selectedIds,
  onToggle,
  canBulk,
  onOpen,
}: OrdersTableProps) {
  return (
    <table className="w-full text-sm">
      <thead className="border-b border-[var(--border)] bg-[var(--surface-muted)] text-left text-xs text-[var(--muted)]">
        <tr>
          {canBulk ? <th className="w-10 px-4 py-3" /> : null}
          <th className="px-4 py-3 font-medium">Order</th>
          <th className="px-4 py-3 font-medium">Client</th>
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
          const allocationArtists = (order.workAllocations ?? [])
            .map((row) => row.assignedArtist?.fullName)
            .filter((name): name is string => Boolean(name));
          const uniqueArtists = Array.from(new Set(allocationArtists));
          const primaryArtist =
            uniqueArtists[0] ?? order.assignedArtist?.fullName ?? null;
          const extraArtistCount = Math.max(uniqueArtists.length - 1, 0);
          const allocationFolder =
            order.workAllocations?.find((row) => row.folderStatus)?.folderStatus ??
            null;
          const folderDisplay =
            allocationFolder ??
            order.displayFolderStatus ??
            order.folderStatus ??
            null;
          return (
            <tr
              key={order.id}
              className={`border-b border-[var(--border)] last:border-0 ${
                overdue ? 'bg-[color-mix(in_srgb,var(--danger)_8%,transparent)]' : ''
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
              <td className="px-4 py-3">
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
              <td className="px-4 py-3 text-[var(--muted)]">
                {order.clientOrganization?.name ?? '—'}
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
                  overdue ? 'font-medium text-[var(--danger)]' : 'text-[var(--muted)]'
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
  );
}
