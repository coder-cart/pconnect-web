'use client';

import { FormEvent, useEffect, useState } from 'react';
import { Modal, ModalActions } from '@/components/ui/Modal';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { apiRequest } from '@/lib/api-client';
import { ApiResponse } from '@/lib/auth';

interface UserOption {
  id: string;
  fullName: string;
  email: string;
}

interface ClientOption {
  id: string;
  name: string;
}

interface ShareFileModalProps {
  open: boolean;
  fileId: string | null;
  fileName?: string;
  onClose: () => void;
  onShared: () => void;
}

export function ShareFileModal({
  open,
  fileId,
  fileName,
  onClose,
  onShared,
}: ShareFileModalProps) {
  const [users, setUsers] = useState<UserOption[]>([]);
  const [clients, setClients] = useState<ClientOption[]>([]);
  const [shareType, setShareType] = useState('user');
  const [sharedWithUserId, setSharedWithUserId] = useState('');
  const [sharedWithClientOrgId, setSharedWithClientOrgId] = useState('');
  const [permissionLevel, setPermissionLevel] = useState('view');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;

    Promise.all([
      apiRequest<ApiResponse<UserOption[]>>('/users').catch(() => ({
        data: [],
      })),
      apiRequest<ApiResponse<ClientOption[]>>('/clients'),
    ]).then(([usersResponse, clientsResponse]) => {
      setUsers(usersResponse.data);
      setClients(clientsResponse.data);
      if (usersResponse.data[0]) setSharedWithUserId(usersResponse.data[0].id);
      if (clientsResponse.data[0]) {
        setSharedWithClientOrgId(clientsResponse.data[0].id);
      }
    });
  }, [open]);

  async function handleSubmit(event?: FormEvent) {
    event?.preventDefault();
    if (!fileId) return;

    setIsSubmitting(true);
    setErrorMessage(null);

    try {
      await apiRequest(`/files/${fileId}/share`, {
        method: 'POST',
        body: JSON.stringify({
          sharedWithUserId:
            shareType === 'user' ? sharedWithUserId : undefined,
          sharedWithClientOrgId:
            shareType === 'client' ? sharedWithClientOrgId : undefined,
          permissionLevel,
        }),
      });
      onShared();
      onClose();
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Failed to share file');
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Modal
      open={open}
      title="Share File"
      description={fileName ? `Share ${fileName} with a user or client.` : undefined}
      onClose={onClose}
      footer={
        <ModalActions
          onCancel={onClose}
          onSubmit={() => void handleSubmit()}
          submitLabel="Share"
          isSubmitting={isSubmitting}
        />
      }
    >
      <form className="space-y-4" onSubmit={(event) => void handleSubmit(event)}>
        <Select
          label="Share with"
          value={shareType}
          onChange={(event) => setShareType(event.target.value)}
          options={[
            { value: 'user', label: 'User' },
            { value: 'client', label: 'Client organization' },
          ]}
        />
        {shareType === 'user' ? (
          <Select
            label="User"
            value={sharedWithUserId}
            onChange={(event) => setSharedWithUserId(event.target.value)}
            options={users.map((user) => ({
              value: user.id,
              label: `${user.fullName} (${user.email})`,
            }))}
          />
        ) : (
          <Select
            label="Client"
            value={sharedWithClientOrgId}
            onChange={(event) => setSharedWithClientOrgId(event.target.value)}
            options={clients.map((client) => ({
              value: client.id,
              label: client.name,
            }))}
          />
        )}
        <Select
          label="Permission"
          value={permissionLevel}
          onChange={(event) => setPermissionLevel(event.target.value)}
          options={[
            { value: 'view', label: 'View' },
            { value: 'download', label: 'Download' },
          ]}
        />
        {errorMessage ? (
          <p className="text-sm text-[var(--danger)]">{errorMessage}</p>
        ) : null}
      </form>
    </Modal>
  );
}
