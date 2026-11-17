'use client';

import { Button } from '@/components/ui/Button';

interface DeleteMessageDialogProps {
  open: boolean;
  canDeleteForEveryone: boolean;
  busy?: boolean;
  onDeleteForMe: () => void;
  onDeleteForEveryone: () => void;
  onCancel: () => void;
}

export function DeleteMessageDialog({
  open,
  canDeleteForEveryone,
  busy = false,
  onDeleteForMe,
  onDeleteForEveryone,
  onCancel,
}: DeleteMessageDialogProps) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/40 p-4">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="delete-message-title"
        className="w-full max-w-sm rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--surface)] p-4 shadow-lg"
      >
        <h2
          id="delete-message-title"
          className="text-base font-semibold text-[var(--foreground)]"
        >
          Delete message
        </h2>
        <p className="mt-2 text-sm text-[var(--muted)]">
          Choose how this message should be removed. Delete for me only hides it
          from your chat. Delete for everyone removes it for all participants.
        </p>
        <div className="mt-4 flex flex-col gap-2">
          <Button
            type="button"
            variant="secondary"
            disabled={busy}
            onClick={onDeleteForMe}
          >
            Delete for me
          </Button>
          {canDeleteForEveryone ? (
            <Button
              type="button"
              variant="secondary"
              className="text-[var(--danger)]"
              disabled={busy}
              onClick={onDeleteForEveryone}
            >
              Delete for everyone
            </Button>
          ) : null}
          <Button type="button" variant="ghost" disabled={busy} onClick={onCancel}>
            Cancel
          </Button>
        </div>
      </div>
    </div>
  );
}
