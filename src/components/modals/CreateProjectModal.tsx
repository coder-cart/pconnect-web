'use client';

import { FormEvent, useEffect, useState } from 'react';
import { Modal, ModalActions } from '@/components/ui/Modal';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { apiRequest } from '@/lib/api-client';
import { ApiResponse } from '@/lib/auth';

interface ClientOption {
  id: string;
  name: string;
}

interface CreateProjectModalProps {
  open: boolean;
  onClose: () => void;
  onCreated: () => void;
}

export function CreateProjectModal({
  open,
  onClose,
  onCreated,
}: CreateProjectModalProps) {
  const [clients, setClients] = useState<ClientOption[]>([]);
  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [description, setDescription] = useState('');
  const [status, setStatus] = useState('planning');
  const [visibilityScope, setVisibilityScope] = useState('internal');
  const [clientOrganizationId, setClientOrganizationId] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;

    apiRequest<ApiResponse<ClientOption[]>>('/clients')
      .then((response) => setClients(response.data))
      .catch(() => setClients([]));
  }, [open]);

  async function handleSubmit(event?: FormEvent) {
    event?.preventDefault();
    if (!name.trim() || !code.trim()) return;

    setIsSubmitting(true);
    setErrorMessage(null);

    try {
      await apiRequest('/projects', {
        method: 'POST',
        body: JSON.stringify({
          name: name.trim(),
          code: code.trim(),
          description: description.trim() || undefined,
          status,
          visibilityScope,
          clientOrganizationId: clientOrganizationId || undefined,
        }),
      });
      setName('');
      setCode('');
      setDescription('');
      onCreated();
      onClose();
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : 'Failed to create project',
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Modal
      open={open}
      title="New Project"
      description="Create a project for your workspace."
      onClose={onClose}
      size="lg"
      footer={
        <ModalActions
          onCancel={onClose}
          onSubmit={() => void handleSubmit()}
          submitLabel="Create Project"
          isSubmitting={isSubmitting}
          disabled={!name.trim() || !code.trim()}
        />
      }
    >
      <form className="grid gap-4 sm:grid-cols-2" onSubmit={(event) => void handleSubmit(event)}>
        <Input
          label="Project name"
          value={name}
          onChange={(event) => setName(event.target.value)}
          required
        />
        <Input
          label="Project code"
          value={code}
          onChange={(event) => setCode(event.target.value)}
          placeholder="ACM-002"
          required
        />
        <div className="sm:col-span-2">
          <Input
            label="Description"
            value={description}
            onChange={(event) => setDescription(event.target.value)}
          />
        </div>
        <Select
          label="Status"
          value={status}
          onChange={(event) => setStatus(event.target.value)}
          options={[
            { value: 'planning', label: 'Planning' },
            { value: 'active', label: 'Active' },
            { value: 'on_hold', label: 'On hold' },
          ]}
        />
        <Select
          label="Visibility"
          value={visibilityScope}
          onChange={(event) => setVisibilityScope(event.target.value)}
          options={[
            { value: 'internal', label: 'Internal' },
            { value: 'shared_with_client', label: 'Shared with client' },
          ]}
        />
        <div className="sm:col-span-2">
          <Select
            label="Client organization (optional)"
            value={clientOrganizationId}
            onChange={(event) => setClientOrganizationId(event.target.value)}
            options={[
              { value: '', label: 'None' },
              ...clients.map((client) => ({
                value: client.id,
                label: client.name,
              })),
            ]}
          />
        </div>
        {errorMessage ? (
          <p className="sm:col-span-2 text-sm text-[var(--danger)]">{errorMessage}</p>
        ) : null}
      </form>
    </Modal>
  );
}
