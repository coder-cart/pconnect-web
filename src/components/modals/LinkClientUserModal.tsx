'use client';

import { FormEvent, useEffect, useState } from 'react';
import { Modal, ModalActions } from '@/components/ui/Modal';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { apiRequest } from '@/lib/api-client';

export interface InviteContactOption {
  id: string;
  name: string;
  email: string;
  isPrimary?: boolean;
}

const EMPTY_CONTACTS: InviteContactOption[] = [];

interface LinkClientUserModalProps {
  open: boolean;
  clientId: string | null;
  clientName: string | null;
  onClose: () => void;
  onLinked: () => void;
  /** Softer copy for client self-serve invites. */
  mode?: 'staff' | 'client';
  contacts?: InviteContactOption[];
  initialFullName?: string;
  initialEmail?: string;
}

export function LinkClientUserModal({
  open,
  clientId,
  clientName,
  onClose,
  onLinked,
  mode = 'staff',
  contacts = EMPTY_CONTACTS,
  initialFullName = '',
  initialEmail = '',
}: LinkClientUserModalProps) {
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [selectedContactId, setSelectedContactId] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setFullName(initialFullName);
    setEmail(initialEmail);
    setPassword('');
    setErrorMessage(null);
    const match = contacts.find(
      (contact) => contact.email.toLowerCase() === initialEmail.toLowerCase(),
    );
    setSelectedContactId(match?.id ?? '');
  }, [open, initialFullName, initialEmail, contacts]);

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
      title={mode === 'client' ? 'Invite teammate' : 'Send login details'}
      description={
        mode === 'client'
          ? clientName
            ? `Invite a teammate to ${clientName}. They will get portal access and join the messages hub.`
            : 'Invite a teammate to your organization. They will get portal access and join the messages hub.'
          : clientName
            ? `Create a portal login for ${clientName} and email the sign-in details.`
            : 'Create a portal login and email the sign-in details.'
      }
      footer={
        <ModalActions
          onCancel={onClose}
          onSubmit={() => void handleSubmit()}
          submitLabel={mode === 'client' ? 'Send invite' : 'Send login email'}
          isSubmitting={isSubmitting}
          disabled={!fullName.trim() || !email.trim()}
        />
      }
    >
      <form className="space-y-4" onSubmit={(event) => void handleSubmit(event)}>
        {mode === 'staff' && contacts.length > 0 ? (
          <Select
            label="Saved contact"
            value={selectedContactId}
            options={[
              { value: '', label: 'Enter a different person' },
              ...contacts.map((contact) => ({
                value: contact.id,
                label: `${contact.name} · ${contact.email}${
                  contact.isPrimary ? ' (default)' : ''
                }`,
              })),
            ]}
            onChange={(event) => {
              const contactId = event.target.value;
              setSelectedContactId(contactId);
              const contact = contacts.find((item) => item.id === contactId);
              if (!contact) return;
              setFullName(contact.name);
              setEmail(contact.email);
            }}
          />
        ) : null}
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
          placeholder="Leave blank to email a unique temporary password"
        />
        {errorMessage ? (
          <p className="text-sm text-[var(--danger)]">{errorMessage}</p>
        ) : null}
      </form>
    </Modal>
  );
}
