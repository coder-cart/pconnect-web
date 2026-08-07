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

interface CreateOnboardingModalProps {
  open: boolean;
  onClose: () => void;
  onCreated: () => void;
  defaultClientId?: string;
}

export function CreateOnboardingModal({
  open,
  onClose,
  onCreated,
  defaultClientId,
}: CreateOnboardingModalProps) {
  const [clients, setClients] = useState<ClientOption[]>([]);
  const [clientOrganizationId, setClientOrganizationId] = useState('');
  const [name, setName] = useState('');
  const [itemTitle, setItemTitle] = useState('Kickoff meeting');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const clientLocked = Boolean(defaultClientId);

  useEffect(() => {
    if (!open) return;

    apiRequest<ApiResponse<ClientOption[]>>('/clients')
      .then((clientsResponse) => {
        setClients(clientsResponse.data);
        const clientId = defaultClientId ?? clientsResponse.data[0]?.id ?? '';
        setClientOrganizationId(clientId);
        const clientName =
          clientsResponse.data.find((client) => client.id === clientId)?.name ??
          'Client';
        setName(`${clientName} Onboarding`);
      })
      .catch(() => {
        setClients([]);
      });
  }, [open, defaultClientId]);

  async function handleSubmit(event?: FormEvent) {
    event?.preventDefault();
    if (!clientOrganizationId || !name.trim()) return;

    setIsSubmitting(true);
    setErrorMessage(null);

    try {
      const workflowResponse = await apiRequest<
        ApiResponse<{ id: string }>
      >('/onboarding/workflows', {
        method: 'POST',
        body: JSON.stringify({
          clientOrganizationId,
          name: name.trim(),
        }),
      });

      if (itemTitle.trim()) {
        await apiRequest(
          `/onboarding/workflows/${workflowResponse.data.id}/items`,
          {
            method: 'POST',
            body: JSON.stringify({
              title: itemTitle.trim(),
              visibilityScope: 'shared_with_client',
            }),
          },
        );
      }

      onCreated();
      onClose();
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : 'Failed to create workflow',
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Modal
      open={open}
      title="Create Onboarding Workflow"
      description="Start a client onboarding workflow with an initial checklist item. A default project is attached automatically."
      onClose={onClose}
      size="lg"
      footer={
        <ModalActions
          onCancel={onClose}
          onSubmit={() => void handleSubmit()}
          submitLabel="Create Workflow"
          isSubmitting={isSubmitting}
          disabled={!clientOrganizationId || !name.trim()}
        />
      }
    >
      <form className="space-y-4" onSubmit={(event) => void handleSubmit(event)}>
        {clientLocked ? (
          <div className="rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--surface-muted)] px-3 py-2">
            <p className="text-xs font-medium uppercase tracking-wide text-[var(--muted)]">
              Client
            </p>
            <p className="text-sm font-medium text-[var(--foreground)]">
              {clients.find((c) => c.id === clientOrganizationId)?.name ??
                'Client'}
            </p>
          </div>
        ) : (
          <Select
            label="Client"
            value={clientOrganizationId}
            onChange={(event) => setClientOrganizationId(event.target.value)}
            options={clients.map((client) => ({
              value: client.id,
              label: client.name,
            }))}
          />
        )}
        <Input
          label="Workflow name"
          value={name}
          onChange={(event) => setName(event.target.value)}
          required
        />
        <Input
          label="First checklist item"
          value={itemTitle}
          onChange={(event) => setItemTitle(event.target.value)}
        />
        {errorMessage ? (
          <p className="text-sm text-[var(--danger)]">{errorMessage}</p>
        ) : null}
      </form>
    </Modal>
  );
}
