'use client';

import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';

interface ClearChatDialogProps {
  open: boolean;
  conversationName: string;
  busy?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export function ClearChatDialog({
  open,
  conversationName,
  busy = false,
  onConfirm,
  onCancel,
}: ClearChatDialogProps) {
  return (
    <Modal
      open={open}
      title="Clear chat"
      description={`Clear “${conversationName}” for you only?`}
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
            {busy ? 'Clearing…' : 'Clear chat'}
          </Button>
        </div>
      }
    >
      <p className="text-sm text-[var(--muted)]">
        Messages disappear from your view only. Other participants keep their
        full history and attachments.
      </p>
    </Modal>
  );
}
