'use client';

import { FormEvent, useEffect, useState } from 'react';
import { ExternalLink, Link2 } from 'lucide-react';
import { Modal, ModalActions } from '@/components/ui/Modal';
import { Input } from '@/components/ui/Input';
import { toExternalHref } from '@/lib/orders';

interface DeliveryLinkModalProps {
  open: boolean;
  orderCode?: string | null;
  orderName?: string | null;
  initialLink?: string | null;
  isSubmitting?: boolean;
  onClose: () => void;
  onConfirm: (deliveryLink: string) => void | Promise<void>;
}

export function DeliveryLinkModal({
  open,
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
  }, [open, initialLink]);

  const normalized = toExternalHref(link);
  const orderLabel = [orderCode, orderName].filter(Boolean).join(' · ');

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
      title="Mark as Delivered"
      description={
        orderLabel
          ? `Add the delivery link for ${orderLabel}, then confirm.`
          : 'Add the client delivery link, then confirm.'
      }
      onClose={() => {
        if (!isSubmitting) onClose();
      }}
      size="md"
      footer={
        <ModalActions
          onCancel={onClose}
          onSubmit={() => void handleSubmit()}
          submitLabel="Mark Delivered"
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
            Paste the shared folder or file URL the client should use. The order
            moves to Delivered only after a valid link is saved.
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
