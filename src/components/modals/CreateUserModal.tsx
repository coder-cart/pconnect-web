'use client';

import { FormEvent, useState } from 'react';
import { Modal, ModalActions } from '@/components/ui/Modal';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { apiRequest } from '@/lib/api-client';

interface CreateUserModalProps {
  open: boolean;
  onClose: () => void;
  onCreated: () => void;
}

export function CreateUserModal({ open, onClose, onCreated }: CreateUserModalProps) {
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [userType, setUserType] = useState('internal');
  const [roleCode, setRoleCode] = useState('internal_member');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  async function handleSubmit(event?: FormEvent) {
    event?.preventDefault();
    if (!fullName.trim() || !email.trim()) return;

    setIsSubmitting(true);
    setErrorMessage(null);

    try {
      await apiRequest('/users', {
        method: 'POST',
        body: JSON.stringify({
          fullName: fullName.trim(),
          email: email.trim(),
          userType,
          roleCode:
            userType === 'external' ? 'external_client' : roleCode,
        }),
      });
      setFullName('');
      setEmail('');
      onCreated();
      onClose();
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Failed to invite user');
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Modal
      open={open}
      title="Invite User"
      description="Add a new user to the workspace. Default password is Password123!"
      onClose={onClose}
      footer={
        <ModalActions
          onCancel={onClose}
          onSubmit={() => void handleSubmit()}
          submitLabel="Invite User"
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
        <Select
          label="User type"
          value={userType}
          onChange={(event) => setUserType(event.target.value)}
          options={[
            { value: 'internal', label: 'Internal' },
            { value: 'external', label: 'External client' },
          ]}
        />
        {userType === 'internal' ? (
          <Select
            label="Role"
            value={roleCode}
            onChange={(event) => setRoleCode(event.target.value)}
            options={[
              { value: 'internal_admin', label: 'Admin' },
              { value: 'internal_manager', label: 'Manager' },
              { value: 'internal_member', label: 'Member' },
            ]}
          />
        ) : null}
        {errorMessage ? (
          <p className="text-sm text-[var(--danger)]">{errorMessage}</p>
        ) : null}
      </form>
    </Modal>
  );
}
