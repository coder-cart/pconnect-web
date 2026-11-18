'use client';

import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';

interface DeleteConversationDialogProps {
  open: boolean;
  conversationName: string;
  isDirect?: boolean;
  busy?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export function DeleteConversationDialog({
  open,
  conversationName,
  isDirect = true,
  busy = false,
  onConfirm,
  onCancel,
}: DeleteConversationDialogProps) {
  return (
    <Modal
      open={open}
      title="Delete conversation"
      description={
        isDirect
          ? `Remove “${conversationName}” from your Direct Messages?`
          : `Remove “${conversationName}” from your chat list?`
      }
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
            {busy ? 'Deleting…' : 'Delete'}
          </Button>
        </div>
      }
    >
      <p className="text-sm text-[var(--muted)]">
        {isDirect
          ? 'This removes the conversation from your view only. The other participant keeps their chat history and attachments.'
          : 'This removes the conversation from your view only. Other participants keep their chat history and attachments.'}
      </p>
    </Modal>
  );
}
