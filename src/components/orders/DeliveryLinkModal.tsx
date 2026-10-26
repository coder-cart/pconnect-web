'use client';

import { FormEvent, useEffect, useState } from 'react';
import { ExternalLink, Link2 } from 'lucide-react';
import { Modal, ModalActions } from '@/components/ui/Modal';
import { Input } from '@/components/ui/Input';
import { toExternalHref } from '@/lib/orders';

interface DeliveryLinkModalProps {
  open: boolean;
  mode?: 'deliver' | 'save';
  orderCode?: string | null;
  orderName?: string | null;
  initialLink?: string | null;
  isSubmitting?: boolean;
  onClose: () => void;
  onConfirm: (deliveryLink: string) => void | Promise<void>;
}

export function DeliveryLinkModal({
  open,
  mode = 'deliver',
  orderCode,
  orderName,
  initialLink,
  isSubmitting = false,
  onClose,
  onConfirm,
}: DeliveryLinkModalProps) {
  const [link, setLink] = useState(initialLink ?? '');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setLink(initialLink?.trim() ?? '');
    setErrorMessage(null);
  }, [open, initialLink, mode]);

  const normalized = toExternalHref(link);
  const orderLabel = [orderCode, orderName].filter(Boolean).join(' · ');
  const isDeliverMode = mode === 'deliver';

  async function handleSubmit(event?: FormEvent) {
    event?.preventDefault();
    if (!normalized) {
      setErrorMessage(
        'Enter a valid delivery link (Google Drive, Dropbox, WeTransfer, etc.).',
      );
      return;
    }
    setErrorMessage(null);
    await onConfirm(normalized);
  }

  return (
    <Modal
      open={open}
      title={isDeliverMode ? 'Mark as Delivered' : 'Delivery link'}
      description={
        orderLabel
          ? isDeliverMode
            ? `Add the delivery link for ${orderLabel}, then confirm.`
            : `Update the delivery link for ${orderLabel}. Saving does not change the status.`
          : isDeliverMode
            ? 'Add the client delivery link, then confirm.'
            : 'Save the delivery link without changing the order status.'
      }
      onClose={() => {
        if (!isSubmitting) onClose();
      }}
      size="md"
      footer={
        <ModalActions
          onCancel={onClose}
          onSubmit={() => void handleSubmit()}
          submitLabel={isDeliverMode ? 'Mark Delivered' : 'Save link'}
          isSubmitting={isSubmitting}
          disabled={!normalized}
        />
      }
    >
      <form className="space-y-4" onSubmit={(event) => void handleSubmit(event)}>
        <div className="flex items-start gap-3 rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--surface-muted)]/60 p-3">
          <span className="mt-0.5 inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[var(--primary-soft)] text-[var(--primary)]">
            <Link2 className="h-4 w-4" aria-hidden="true" />
          </span>
          <div className="min-w-0 text-sm text-[var(--muted)]">
            {isDeliverMode
              ? 'Paste the shared folder or file URL the client should use. The order moves to Delivered after a valid link is saved.'
              : 'Save this link before marking the order Delivered. Saving the link does not change the status.'}
          </div>
        </div>

        <Input
          label="Delivery link"
          name="deliveryLink"
          type="url"
          inputMode="url"
          autoComplete="url"
          placeholder="https://drive.google.com/..."
          value={link}
          onChange={(event) => {
            setLink(event.target.value);
            if (errorMessage) setErrorMessage(null);
          }}
          hint="https:// links preferred. Drive, Dropbox, and WeTransfer work."
          required
        />

        {normalized ? (
          <a
            href={normalized}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1.5 text-sm text-[var(--primary)] hover:underline"
          >
            <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" />
            Open link preview
          </a>
        ) : null}

        {errorMessage ? (
          <p className="text-sm text-[var(--danger)]">{errorMessage}</p>
        ) : null}
      </form>
    </Modal>
  );
}
