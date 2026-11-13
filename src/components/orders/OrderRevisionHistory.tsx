'use client';

import { Badge } from '@/components/ui/Badge';
import { Card } from '@/components/ui/Card';
import {
  ClientRevisionSummary,
  OrderSummary,
  toExternalHref,
} from '@/lib/orders';

function LinkRow({
  label,
  href,
  value,
}: {
  label: string;
  href: string | null;
  value?: string | null;
}) {
  return (
    <div className="space-y-0.5">
      <p className="text-xs text-[var(--muted)]">{label}</p>
      {href ? (
        <a
          href={href}
          target="_blank"
          rel="noreferrer"
          className="break-all text-sm text-[var(--primary)]"
        >
          {value || href}
        </a>
      ) : (
        <p className="text-sm text-[var(--muted)]">Not set</p>
      )}
    </div>
  );
}

function revisionStatusVariant(
  status: ClientRevisionSummary['status'],
): 'neutral' | 'primary' | 'success' | 'warning' {
  switch (status) {
    case 'open':
      return 'warning';
    case 'in_progress':
      return 'primary';
    case 'delivered':
      return 'success';
    case 'approved':
      return 'success';
    case 'superseded':
      return 'neutral';
    default: {
      const _exhaustive: never = status;
      return _exhaustive;
    }
  }
}

export function OrderRevisionHistory({ order }: { order: OrderSummary }) {
  const revisions = order.clientRevisions ?? [];
  const openRevision = revisions.find(
    (row) => row.status === 'open' || row.status === 'in_progress',
  );
  const originalOrderHref = toExternalHref(
    order.originalOrderLink ?? order.sourceLink ?? '',
  );
  const originalDeliveredHref = toExternalHref(
    order.originalDeliveredLink ?? '',
  );
  const finalDeliveredHref = toExternalHref(
    order.finalDeliveredLink ?? order.finalDeliveryLink ?? '',
  );
  const previousForOpen = toExternalHref(
    openRevision?.previousDeliveryLink ?? order.deliveryLink ?? '',
  );

  return (
    <Card className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h3 className="text-sm font-medium text-[var(--foreground)]">
            Order & revision history
          </h3>
          <p className="mt-0.5 text-xs text-[var(--muted)]">
            All revisions stay under {order.code}.
          </p>
        </div>
        {order.hasOpenClientRevision || openRevision ? (
          <Badge variant="warning">Revision in progress</Badge>
        ) : null}
      </div>

      {openRevision && previousForOpen ? (
        <div className="rounded-[var(--radius-md)] border border-[color-mix(in_srgb,var(--warning)_35%,var(--border))] bg-[color-mix(in_srgb,var(--warning)_8%,transparent)] px-3 py-2.5">
          <p className="text-xs font-medium text-[var(--foreground)]">
            Previous delivered files (reference only — re-delivery needs a new link)
          </p>
          <a
            href={previousForOpen}
            target="_blank"
            rel="noreferrer"
            className="mt-1 break-all text-sm text-[var(--primary)]"
          >
            {openRevision.previousDeliveryLink ?? order.deliveryLink}
          </a>
        </div>
      ) : null}

      <div className="grid gap-3 sm:grid-cols-2">
        <LinkRow
          label="Original order link"
          href={originalOrderHref}
          value={order.originalOrderLink ?? order.sourceLink}
        />
        <LinkRow
          label="Original delivered link"
          href={originalDeliveredHref}
          value={order.originalDeliveredLink}
        />
      </div>

      {order.clientNotes ? (
        <div>
          <p className="text-xs text-[var(--muted)]">Current instructions</p>
          <p className="mt-1 whitespace-pre-wrap text-sm text-[var(--foreground)]">
            {order.clientNotes}
          </p>
        </div>
      ) : null}

      {revisions.length === 0 ? (
        <p className="text-sm text-[var(--muted)]">No revisions yet.</p>
      ) : (
        <div className="space-y-3">
          {revisions.map((revision) => {
            const requestHref = toExternalHref(revision.requestLink ?? '');
            const previousHref = toExternalHref(
              revision.previousDeliveryLink ?? '',
            );
            const deliveredHref = toExternalHref(revision.deliveryLink ?? '');
            return (
              <div
                key={revision.id}
                className="rounded-[var(--radius-md)] border border-[var(--border)] p-3"
              >
                <div className="mb-2 flex flex-wrap items-center gap-2">
                  <p className="text-sm font-medium text-[var(--foreground)]">
                    Revision {revision.round}
                  </p>
                  <Badge variant={revisionStatusVariant(revision.status)}>
                    {revision.status.replaceAll('_', ' ')}
                  </Badge>
                  {revision.requestedBy?.fullName ? (
                    <span className="text-xs text-[var(--muted)]">
                      by {revision.requestedBy.fullName}
                    </span>
                  ) : null}
                </div>
                <p className="whitespace-pre-wrap text-sm text-[var(--foreground)]">
                  {revision.instructions}
                </p>
                <div className="mt-3 grid gap-3 sm:grid-cols-3">
                  <LinkRow
                    label="Revision order link"
                    href={requestHref}
                    value={revision.requestLink}
                  />
                  <LinkRow
                    label="Previous delivered link"
                    href={previousHref}
                    value={revision.previousDeliveryLink}
                  />
                  <LinkRow
                    label="Revised delivered link"
                    href={deliveredHref}
                    value={revision.deliveryLink}
                  />
                </div>
              </div>
            );
          })}
        </div>
      )}

      <LinkRow
        label="Final delivered link"
        href={finalDeliveredHref}
        value={order.finalDeliveredLink ?? order.finalDeliveryLink}
      />
    </Card>
  );
}
