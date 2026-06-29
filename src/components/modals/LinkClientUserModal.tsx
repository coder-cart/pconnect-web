'use client';

import { FormEvent, useState } from 'react';
import { Modal, ModalActions } from '@/components/ui/Modal';
import { Input } from '@/components/ui/Input';
import { apiRequest } from '@/lib/api-client';

interface LinkClientUserModalProps {
  open: boolean;
  clientId: string | null;
  clientName: string | null;
  onClose: () => void;
  onLinked: () => void;
}

export function LinkClientUserModal({
  open,
  clientId,
  clientName,
  onClose,
  onLinked,
}: LinkClientUserModalProps) {
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  async function handleSubmit(event?: FormEvent) {
    event?.preventDefault();
    if (!clientId || !fullName.trim() || !email.trim()) return;

    setIsSubmitting(true);
    setErrorMessage(null);

    try {
      await apiRequest(`/clients/${clientId}/users`, {
        method: 'POST',
        body: JSON.stringify({
          fullName: fullName.trim(),
          email: email.trim(),
          password: password.trim() || undefined,
        }),
      });

      setFullName('');
      setEmail('');
      setPassword('');
      onLinked();
      onClose();
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : 'Unable to link client user',
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Link client user"
      description={
        clientName
          ? `Invite an external user to ${clientName}. They will be invited to the client messages hub.`
          : 'Invite an external user to this client organization. They will be invited to the client messages hub.'
      }
      footer={
        <ModalActions
          onCancel={onClose}
          onSubmit={() => void handleSubmit()}
          submitLabel="Send invite"
          isSubmitting={isSubmitting}
          disabled={!fullName.trim() || !email.trim()}
        />
      }
    >
      <form className="space-y-4" onSubmit={(event) => void handleSubmit(event)}>
        <Input
          label="Full name"
          value={fullName}
          onChange={(event) => setFullName(event.target.value)}
          required
        />
        <Input
          label="Email"
          type="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          required
        />
        <Input
          label="Temporary password (optional)"
          type="password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          placeholder="Defaults to Password123!"
        />
        {errorMessage ? (
          <p className="text-sm text-[var(--danger)]">{errorMessage}</p>
        ) : null}
      </form>
    </Modal>
  );
}
