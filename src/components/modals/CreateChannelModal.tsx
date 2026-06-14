'use client';

import { FormEvent, useEffect, useMemo, useState } from 'react';
import { Modal, ModalActions } from '@/components/ui/Modal';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import {
  ChannelMemberPicker,
  MemberCandidate,
} from '@/components/chat/ChannelMemberPicker';
import { apiRequest } from '@/lib/api-client';
import { ApiResponse } from '@/lib/auth';

interface CreateChannelModalProps {
  open: boolean;
  onClose: () => void;
  onCreated: () => void;
}

interface ClientOption {
  id: string;
  name: string;
}

interface ProjectOption {
  id: string;
  name: string;
  code: string;
  clientOrganizationId: string | null;
}

interface MemberCandidatesResponse {
  internalUsers: MemberCandidate[];
  clientUsers: MemberCandidate[];
}

export function CreateChannelModal({
  open,
  onClose,
  onCreated,
}: CreateChannelModalProps) {
  const [name, setName] = useState('');
  const [type, setType] = useState('public');
  const [clients, setClients] = useState<ClientOption[]>([]);
  const [projects, setProjects] = useState<ProjectOption[]>([]);
  const [clientOrganizationId, setClientOrganizationId] = useState('');
  const [projectId, setProjectId] = useState('');
  const [internalUsers, setInternalUsers] = useState<MemberCandidate[]>([]);
  const [clientUsers, setClientUsers] = useState<MemberCandidate[]>([]);
  const [selectedMemberIds, setSelectedMemberIds] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const showMemberPicker = type === 'private' || type === 'client_shared';
  const showClientFields = type === 'client_shared';

  const clientProjects = useMemo(
    () =>
      projects.filter(
        (project) =>
          project.clientOrganizationId &&
          project.clientOrganizationId === clientOrganizationId,
      ),
    [projects, clientOrganizationId],
  );

  useEffect(() => {
    if (!open) {
      return;
    }

    setName('');
    setType('public');
    setClientOrganizationId('');
    setProjectId('');
    setSelectedMemberIds([]);
    setErrorMessage(null);

    Promise.all([
      apiRequest<ApiResponse<ClientOption[]>>('/clients'),
      apiRequest<ApiResponse<ProjectOption[]>>('/projects'),
    ])
      .then(([clientsResponse, projectsResponse]) => {
        setClients(clientsResponse.data);
        setProjects(projectsResponse.data);
      })
      .catch(() => {
        setClients([]);
        setProjects([]);
      });
  }, [open]);

  useEffect(() => {
    if (!open || !showMemberPicker) {
      setInternalUsers([]);
      setClientUsers([]);
      return;
    }

    const query =
      type === 'client_shared' && clientOrganizationId
        ? `?clientOrganizationId=${clientOrganizationId}`
        : '';

    apiRequest<ApiResponse<MemberCandidatesResponse>>(
      `/channels/member-candidates${query}`,
    )
      .then((response) => {
        setInternalUsers(response.data.internalUsers);
        setClientUsers(response.data.clientUsers);
      })
      .catch(() => {
        setInternalUsers([]);
        setClientUsers([]);
      });
  }, [open, showMemberPicker, type, clientOrganizationId]);

  useEffect(() => {
    if (!clientProjects.some((project) => project.id === projectId)) {
      setProjectId(clientProjects[0]?.id ?? '');
    }
  }, [clientProjects, projectId]);

  const canSubmit =
    name.trim().length > 0 &&
    (!showClientFields || (clientOrganizationId && projectId));

  async function handleSubmit(event?: FormEvent) {
    event?.preventDefault();
    if (!canSubmit) return;

    setIsSubmitting(true);
    setErrorMessage(null);

    try {
      const payload: Record<string, unknown> = {
        name: name.trim(),
        type,
      };

      if (type === 'client_shared') {
        payload.projectId = projectId;
        payload.clientOrganizationId = clientOrganizationId;
      }

      if (showMemberPicker && selectedMemberIds.length > 0) {
        payload.memberUserIds = selectedMemberIds;
      }

      await apiRequest('/channels', {
        method: 'POST',
        body: JSON.stringify(payload),
      });

      onCreated();
      onClose();
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : 'Unable to create channel',
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Create channel"
      description="Start a public team channel, a private internal channel, or a client-shared channel."
      footer={
        <ModalActions
          onCancel={onClose}
          onSubmit={() => void handleSubmit()}
          submitLabel="Create channel"
          isSubmitting={isSubmitting}
          disabled={!canSubmit}
        />
      }
    >
      <form className="space-y-4" onSubmit={(event) => void handleSubmit(event)}>
        <Input
          label="Channel name"
          value={name}
          onChange={(event) => setName(event.target.value)}
          placeholder="e.g. acme-updates"
          required
        />
        <Select
          label="Channel type"
          value={type}
          onChange={(event) => setType(event.target.value)}
          options={[
            { value: 'public', label: 'Public (all internal users)' },
            { value: 'private', label: 'Private (members only)' },
            {
              value: 'client_shared',
              label: 'Client shared (internal staff + linked client users)',
            },
          ]}
        />

        {showClientFields ? (
          <>
            <Select
              label="Client organization"
              value={clientOrganizationId}
              onChange={(event) => setClientOrganizationId(event.target.value)}
              options={[
                { value: '', label: 'Select a client...' },
                ...clients.map((client) => ({
                  value: client.id,
                  label: client.name,
                })),
              ]}
            />
            <Select
              label="Project"
              value={projectId}
              onChange={(event) => setProjectId(event.target.value)}
              options={
                clientProjects.length > 0
                  ? clientProjects.map((project) => ({
                      value: project.id,
                      label: `${project.name} (${project.code})`,
                    }))
                  : [{ value: '', label: 'No projects for this client' }]
              }
              disabled={!clientOrganizationId || clientProjects.length === 0}
            />
          </>
        ) : null}

        {showMemberPicker ? (
          <div className="space-y-2">
            <p className="text-sm font-medium text-[var(--foreground)]">
              Initial members
            </p>
            <p className="text-xs text-[var(--muted)]">
              You are added automatically. Client users receive a pending invite and
              must accept before joining.
            </p>
            <ChannelMemberPicker
              internalUsers={internalUsers}
              clientUsers={clientUsers}
              selectedUserIds={selectedMemberIds}
              onChange={setSelectedMemberIds}
              showClientUsers={type === 'client_shared'}
            />
          </div>
        ) : null}

        {errorMessage ? (
          <p className="text-sm text-[var(--danger)]">{errorMessage}</p>
        ) : null}
      </form>
    </Modal>
  );
}
