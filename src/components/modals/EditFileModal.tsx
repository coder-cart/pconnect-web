'use client';

import { FormEvent, useEffect, useState } from 'react';
import { Modal, ModalActions } from '@/components/ui/Modal';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { apiRequest } from '@/lib/api-client';

interface EditFileModalProps {
  open: boolean;
  fileId: string | null;
  fileName: string | null;
  visibilityScope: 'internal' | 'shared_with_client' | null;
  onClose: () => void;
  onUpdated: () => void;
}

export function EditFileModal({
  open,
  fileId,
  fileName,
  visibilityScope,
  onClose,
  onUpdated,
}: EditFileModalProps) {
  const [name, setName] = useState('');
  const [scope, setScope] = useState('internal');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      setName(fileName ?? '');
      setScope(visibilityScope ?? 'internal');
      setErrorMessage(null);
    }
  }, [open, fileName, visibilityScope]);

  async function handleSubmit(event?: FormEvent) {
    event?.preventDefault();
    if (!fileId || !name.trim()) return;

    setIsSubmitting(true);
    setErrorMessage(null);

    try {
      await apiRequest(`/files/${fileId}`, {
        method: 'PATCH',
        body: JSON.stringify({
          fileName: name.trim(),
          visibilityScope: scope,
        }),
      });

      onUpdated();
      onClose();
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : 'Unable to update file',
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Edit file"
      description="Rename the file or change who can see it."
      footer={
        <ModalActions
          onCancel={onClose}
          onSubmit={() => void handleSubmit()}
          submitLabel="Save changes"
          isSubmitting={isSubmitting}
          disabled={!name.trim()}
        />
      }
    >
      <form className="space-y-4" onSubmit={(event) => void handleSubmit(event)}>
        <Input
          label="File name"
          value={name}
          onChange={(event) => setName(event.target.value)}
          required
        />
        <Select
          label="Visibility"
          value={scope}
          onChange={(event) => setScope(event.target.value)}
          options={[
            { value: 'internal', label: 'Internal' },
            { value: 'shared_with_client', label: 'Shared with client' },
          ]}
        />
        {errorMessage ? (
          <p className="text-sm text-[var(--danger)]">{errorMessage}</p>
        ) : null}
      </form>
    </Modal>
  );
}
