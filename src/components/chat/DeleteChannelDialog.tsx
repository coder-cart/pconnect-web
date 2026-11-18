'use client';

import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';

interface DeleteChannelDialogProps {
  open: boolean;
  channelName: string;
  busy?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export function DeleteChannelDialog({
  open,
  channelName,
  busy = false,
  onConfirm,
  onCancel,
}: DeleteChannelDialogProps) {
  return (
    <Modal
      open={open}
      title="Delete channel"
      description={`Delete “${channelName}”? This cannot be undone.`}
      onClose={() => {
        if (!busy) onCancel();
      }}
      size="md"
      footer={
        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <Button
            type="button"
            variant="ghost"
            disabled={busy}
            onClick={onCancel}
          >
            Cancel
          </Button>
          <Button
            type="button"
            variant="danger"
            disabled={busy}
            onClick={onConfirm}
          >
            {busy ? 'Deleting…' : 'Delete channel'}
          </Button>
        </div>
      }
    >
      <p className="text-sm text-[var(--muted)]">
        The channel, its messages, and membership are permanently removed for
        everyone.
      </p>
    </Modal>
  );
}
