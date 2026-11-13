'use client';

import { useEffect, useState } from 'react';
import { Loader2 } from 'lucide-react';
import { Modal } from '@/components/ui/Modal';
import { Input } from '@/components/ui/Input';
import { apiRequest } from '@/lib/api-client';
import { ApiResponse } from '@/lib/auth';
import { OrderSummary } from '@/lib/orders';
import { RequestRevisionModal } from '@/components/orders/RequestRevisionModal';
import { useWorkspace } from '@/components/providers/WorkspaceProvider';
import { userIsExternal } from '@/lib/auth';

interface RevisionOrderPickerModalProps {
  open: boolean;
  canSetPriority?: boolean;
  onClose: () => void;
  onCreated: () => void;
}

export function RevisionOrderPickerModal({
  open,
  canSetPriority = false,
  onClose,
  onCreated,
}: RevisionOrderPickerModalProps) {
  const { user } = useWorkspace();
  const isExternal = userIsExternal(user);
  const [orders, setOrders] = useState<OrderSummary[]>([]);
  const [query, setQuery] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [selected, setSelected] = useState<OrderSummary | null>(null);

  useEffect(() => {
    if (!open) return;
    setSelected(null);
    setQuery('');
    setErrorMessage(null);
    setIsLoading(true);

    const params = new URLSearchParams({ pageSize: '50' });
    if (isExternal) {
      params.set('clientTab', 'delivered');
    } else {
      params.set('managerTab', 'delivered');
      params.set('listScope', 'board');
    }

    apiRequest<ApiResponse<{ items: OrderSummary[] }>>(
      `/orders?${params.toString()}`,
    )
      .then((response) => {
        const eligible = response.data.items.filter(
          (order) => !order.hasOpenClientRevision,
        );
        setOrders(eligible);
      })
      .catch((error: Error) => setErrorMessage(error.message))
      .finally(() => setIsLoading(false));
  }, [open, isExternal]);

  const filtered = orders.filter((order) => {
    const term = query.trim().toLowerCase();
    if (!term) return true;
    return (
      order.name.toLowerCase().includes(term) ||
      order.code.toLowerCase().includes(term) ||
      (order.clientOrganization?.name ?? '').toLowerCase().includes(term)
    );
  });

  return (
    <>
      <Modal
        open={open && !selected}
        onClose={onClose}
        title="Request revision"
        description="Choose a previously delivered order to revise."
        size="md"
      >
        <div className="space-y-3">
          <Input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search delivered orders"
            aria-label="Search delivered orders"
          />
          {errorMessage ? (
            <p role="alert" className="text-sm text-[var(--danger)]">
              {errorMessage}
            </p>
          ) : null}
          <div className="max-h-80 overflow-y-auto rounded-[var(--radius-md)] border border-[var(--border)]">
            {isLoading ? (
              <div className="flex items-center gap-2 px-3 py-6 text-sm text-[var(--muted)]">
                <Loader2 className="h-4 w-4 animate-spin" />
                Loading delivered orders
              </div>
            ) : filtered.length === 0 ? (
              <p className="px-3 py-6 text-sm text-[var(--muted)]">
                No delivered orders are available for revision.
              </p>
            ) : (
              <div className="divide-y divide-[var(--border)]">
                {filtered.map((order) => (
                  <button
                    key={order.id}
                    type="button"
                    onClick={() => setSelected(order)}
                    className="flex w-full flex-col items-start gap-0.5 px-3 py-2.5 text-left hover:bg-[var(--surface-muted)]"
                  >
                    <span className="text-sm font-medium text-[var(--foreground)]">
                      {order.name}
                    </span>
                    <span className="text-xs text-[var(--muted)]">
                      {order.code}
                      {order.clientOrganization?.name
                        ? ` · ${order.clientOrganization.name}`
                        : ''}
                    </span>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </Modal>

      <RequestRevisionModal
        open={Boolean(selected)}
        order={selected}
        canSetPriority={canSetPriority}
        onClose={() => {
          setSelected(null);
          onClose();
        }}
        onCreated={() => {
          setSelected(null);
          onCreated();
          onClose();
        }}
      />
    </>
  );
}
