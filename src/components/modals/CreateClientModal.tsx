'use client';

import { FormEvent, useState } from 'react';
import { Modal, ModalActions } from '@/components/ui/Modal';
import { Input } from '@/components/ui/Input';
import { apiRequest } from '@/lib/api-client';

interface CreateClientModalProps {
  open: boolean;
  onClose: () => void;
  onCreated: () => void;
}

export function CreateClientModal({
  open,
  onClose,
  onCreated,
}: CreateClientModalProps) {
  const [name, setName] = useState('');
  const [primaryContactName, setPrimaryContactName] = useState('');
  const [primaryContactEmail, setPrimaryContactEmail] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  async function handleSubmit(event?: FormEvent) {
    event?.preventDefault();
    if (!name.trim()) return;

    setIsSubmitting(true);
    setErrorMessage(null);

    try {
      await apiRequest('/clients', {
        method: 'POST',
        body: JSON.stringify({
          name: name.trim(),
          primaryContactName: primaryContactName.trim() || undefined,
          primaryContactEmail: primaryContactEmail.trim() || undefined,
        }),
      });
      setName('');
      setPrimaryContactName('');
      setPrimaryContactEmail('');
      onCreated();
      onClose();
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : 'Failed to create client',
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Modal
      open={open}
      title="Invite New Client"
      description="Create a client organization and start onboarding."
      onClose={onClose}
      footer={
        <ModalActions
          onCancel={onClose}
          onSubmit={() => void handleSubmit()}
          submitLabel="Create Client"
          isSubmitting={isSubmitting}
          disabled={!name.trim()}
        />
      }
    >
      <form className="space-y-4" onSubmit={(event) => void handleSubmit(event)}>
        <Input
          label="Organization name"
          value={name}
          onChange={(event) => setName(event.target.value)}
          required
        />
        <Input
          label="Primary contact name"
          value={primaryContactName}
          onChange={(event) => setPrimaryContactName(event.target.value)}
        />
        <Input
          label="Primary contact email"
          type="email"
          value={primaryContactEmail}
          onChange={(event) => setPrimaryContactEmail(event.target.value)}
        />
        {errorMessage ? (
          <p className="text-sm text-[var(--danger)]">{errorMessage}</p>
        ) : null}
      </form>
    </Modal>
  );
}
