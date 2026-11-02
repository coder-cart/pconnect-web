'use client';

import { useState } from 'react';
import { apiRequest } from '@/lib/api-client';
import { ApiResponse } from '@/lib/auth';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Modal, ModalActions } from '@/components/ui/Modal';
import { OrderSummary, toExternalHref } from '@/lib/orders';

interface RequestRevisionModalProps {
  open: boolean;
  order: OrderSummary | null;
  onClose: () => void;
  onCreated: () => void;
}

export function RequestRevisionModal({
  open,
  order,
  onClose,
  onCreated,
}: RequestRevisionModalProps) {
  const [instructions, setInstructions] = useState('');
  const [requestLink, setRequestLink] = useState('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const previousDeliveryHref = toExternalHref(
    order?.deliveryLink ?? order?.originalDeliveredLink ?? '',
  );

  async function handleSubmit() {
    if (!order) return;
    const trimmed = instructions.trim();
    if (!trimmed) {
      setErrorMessage('Describe what should change.');
      return;
    }
    setIsSaving(true);
    setErrorMessage(null);
    try {
      await apiRequest<ApiResponse<unknown>>(
        `/orders/${order.id}/client-revisions`,
        {
          method: 'POST',
          body: JSON.stringify({
            instructions: trimmed,
            requestLink: requestLink.trim() || undefined,
          }),
        },
      );
      setInstructions('');
      setRequestLink('');
      onCreated();
      onClose();
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : 'Unable to request revision',
      );
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <Modal
      open={open}
      title="Request revision"
      description={
        order
          ? `Add a revision to ${order.code}. The same order stays open — no new order is created.`
          : 'Add a revision to this order.'
      }
      onClose={onClose}
      footer={
        <ModalActions
          onCancel={onClose}
          onSubmit={handleSubmit}
          submitLabel="Request revision"
          isSubmitting={isSaving}
        />
      }
    >
      <div className="space-y-4">
        {errorMessage ? (
          <div
            role="alert"
            className="rounded-[var(--radius-md)] border border-[color-mix(in_srgb,var(--danger)_35%,var(--border))] bg-[color-mix(in_srgb,var(--danger)_8%,transparent)] px-3 py-2 text-sm text-[var(--danger)]"
          >
            {errorMessage}
          </div>
        ) : null}

        {order ? (
          <div className="rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--surface-muted)] px-3 py-2.5 text-sm">
            <p className="font-medium text-[var(--foreground)]">
              {order.code} · {order.name}
            </p>
            {previousDeliveryHref ? (
              <p className="mt-1 text-[var(--muted)]">
                Previous delivery:{' '}
                <a
                  href={previousDeliveryHref}
                  target="_blank"
                  rel="noreferrer"
                  className="text-[var(--primary)]"
                >
                  Open files
                </a>
              </p>
            ) : null}
          </div>
        ) : null}

        <label className="block space-y-1.5">
          <span className="text-sm font-medium text-[var(--foreground)]">
            Instructions
          </span>
          <textarea
            value={instructions}
            onChange={(event) => setInstructions(event.target.value)}
            rows={4}
            placeholder="What should change on this revision?"
            className="w-full resize-y rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-base text-[var(--foreground)] placeholder:text-[var(--muted)] focus:border-[var(--primary)] focus:outline-none focus:ring-2 focus:ring-[var(--primary-soft)] sm:text-sm"
          />
        </label>

        <Input
          label="Revision file link (optional)"
          value={requestLink}
          onChange={(event) => setRequestLink(event.target.value)}
          placeholder="https://drive.google.com/..."
        />

        <p className="text-xs text-[var(--muted)]">
          The team will use the previous delivery link while working on this
          revision.
        </p>

        <div className="flex justify-end sm:hidden">
          <Button onClick={handleSubmit} disabled={isSaving}>
            Request revision
          </Button>
        </div>
      </div>
    </Modal>
  );
}
