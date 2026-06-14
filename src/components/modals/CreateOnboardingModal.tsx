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

interface ProjectOption {
  id: string;
  name: string;
  code: string;
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
  const [projects, setProjects] = useState<ProjectOption[]>([]);
  const [clientOrganizationId, setClientOrganizationId] = useState('');
  const [projectId, setProjectId] = useState('');
  const [name, setName] = useState('');
  const [itemTitle, setItemTitle] = useState('Kickoff meeting');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;

    Promise.all([
      apiRequest<ApiResponse<ClientOption[]>>('/clients'),
      apiRequest<ApiResponse<ProjectOption[]>>('/projects'),
    ])
      .then(([clientsResponse, projectsResponse]) => {
        setClients(clientsResponse.data);
        setProjects(projectsResponse.data);
        const clientId = defaultClientId ?? clientsResponse.data[0]?.id ?? '';
        setClientOrganizationId(clientId);
        const clientName =
          clientsResponse.data.find((client) => client.id === clientId)?.name ??
          'Client';
        setName(`${clientName} Onboarding`);
      })
      .catch(() => {
        setClients([]);
        setProjects([]);
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
          projectId: projectId || undefined,
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
      description="Start a client onboarding workflow with an initial checklist item."
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
        <Select
          label="Client"
          value={clientOrganizationId}
          onChange={(event) => setClientOrganizationId(event.target.value)}
          options={clients.map((client) => ({
            value: client.id,
            label: client.name,
          }))}
        />
        <Select
          label="Project (optional)"
          value={projectId}
          onChange={(event) => setProjectId(event.target.value)}
          options={[
            { value: '', label: 'None' },
            ...projects.map((project) => ({
              value: project.id,
              label: `${project.name} (${project.code})`,
            })),
          ]}
        />
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
