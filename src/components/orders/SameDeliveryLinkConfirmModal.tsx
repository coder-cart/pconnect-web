'use client';

import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';

interface SameDeliveryLinkConfirmModalProps {
  open: boolean;
  isSubmitting?: boolean;
  onYes: () => void;
  onChangeLink: () => void;
  onCancel: () => void;
}

export function SameDeliveryLinkConfirmModal({
  open,
  isSubmitting = false,
  onYes,
  onChangeLink,
  onCancel,
}: SameDeliveryLinkConfirmModalProps) {
  return (
    <Modal
      open={open}
      title="Same delivery link?"
      description='Are you sure you want to use the same delivery link as the previous revision/order?'
      onClose={() => {
        if (!isSubmitting) onCancel();
      }}
      size="md"
      footer={
        <div className="flex flex-col gap-2 sm:flex-row sm:justify-end">
          <Button
            type="button"
            variant="ghost"
            disabled={isSubmitting}
            onClick={onCancel}
          >
            Cancel
          </Button>
          <Button
            type="button"
            variant="secondary"
            disabled={isSubmitting}
            onClick={onChangeLink}
          >
            No, change the link
          </Button>
          <Button
            type="button"
            disabled={isSubmitting}
            onClick={onYes}
          >
            Yes, use the same link
          </Button>
        </div>
      }
    >
      <p className="text-sm text-[var(--muted)]">
        Revisions usually use a new delivery folder. Confirm only if the previous
        link is intentional for this round.
      </p>
    </Modal>
  );
}
