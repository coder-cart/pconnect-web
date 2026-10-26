'use client';

import { FormEvent, useEffect, useState } from 'react';
import { Modal, ModalActions } from '@/components/ui/Modal';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { apiRequest } from '@/lib/api-client';
import { ClientPortalAccessLevel } from '@/lib/auth';

export interface InviteContactOption {
  id: string;
  name: string;
  email: string;
  isPrimary?: boolean;
}

const EMPTY_CONTACTS: InviteContactOption[] = [];

const ACCESS_OPTIONS: Array<{
  value: ClientPortalAccessLevel;
  label: string;
  hint: string;
}> = [
  {
    value: 'chat_only',
    label: 'Only chat access (1:1)',
    hint: 'Private direct messages only. Someone must start a chat with them. No Orders.',
  },
  {
    value: 'chat_and_orders',
    label: 'Chat and Order update access',
    hint: 'Messages hub plus create and update orders.',
  },
];

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
  const [accessLevel, setAccessLevel] =
    useState<ClientPortalAccessLevel>('chat_and_orders');
  const [selectedContactId, setSelectedContactId] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setFullName(initialFullName);
    setEmail(initialEmail);
    setPassword('');
    setAccessLevel('chat_and_orders');
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
          accessLevel,
        }),
      });

      setFullName('');
      setEmail('');
      setPassword('');
      setAccessLevel('chat_and_orders');
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

  const accessHint =
    ACCESS_OPTIONS.find((option) => option.value === accessLevel)?.hint ?? '';

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={mode === 'client' ? 'Invite teammate' : 'Send login details'}
      description={
        mode === 'client'
          ? clientName
            ? `Invite a teammate to ${clientName} and choose what they can access.`
            : 'Invite a teammate and choose what they can access.'
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
        <Select
          label="Access"
          value={accessLevel}
          options={ACCESS_OPTIONS.map((option) => ({
            value: option.value,
            label: option.label,
          }))}
          onChange={(event) =>
            setAccessLevel(event.target.value as ClientPortalAccessLevel)
          }
        />
        <p className="text-xs text-[var(--muted)]">{accessHint}</p>
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
