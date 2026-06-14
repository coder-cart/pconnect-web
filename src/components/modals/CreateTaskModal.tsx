'use client';

import { FormEvent, useEffect, useState } from 'react';
import { Modal, ModalActions } from '@/components/ui/Modal';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { apiRequest } from '@/lib/api-client';
import { ApiResponse } from '@/lib/auth';

interface ProjectOption {
  id: string;
  name: string;
  code: string;
}

interface CreateTaskModalProps {
  open: boolean;
  onClose: () => void;
  onCreated: () => void;
}

export function CreateTaskModal({ open, onClose, onCreated }: CreateTaskModalProps) {
  const [projects, setProjects] = useState<ProjectOption[]>([]);
  const [projectId, setProjectId] = useState('');
  const [title, setTitle] = useState('');
  const [priority, setPriority] = useState('medium');
  const [visibilityScope, setVisibilityScope] = useState('internal');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;

    apiRequest<ApiResponse<ProjectOption[]>>('/projects')
      .then((response) => {
        setProjects(response.data);
        if (response.data[0]) setProjectId(response.data[0].id);
      })
      .catch(() => setProjects([]));
  }, [open]);

  async function handleSubmit(event?: FormEvent) {
    event?.preventDefault();
    if (!projectId || !title.trim()) return;

    setIsSubmitting(true);
    setErrorMessage(null);

    try {
      await apiRequest('/tasks', {
        method: 'POST',
        body: JSON.stringify({
          projectId,
          title: title.trim(),
          priority,
          visibilityScope,
        }),
      });
      setTitle('');
      onCreated();
      onClose();
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Failed to create task');
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Modal
      open={open}
      title="New Task"
      description="Create a task in one of your accessible projects."
      onClose={onClose}
      footer={
        <ModalActions
          onCancel={onClose}
          onSubmit={() => void handleSubmit()}
          submitLabel="Create Task"
          isSubmitting={isSubmitting}
          disabled={!projectId || !title.trim()}
        />
      }
    >
      <form className="space-y-4" onSubmit={(event) => void handleSubmit(event)}>
        <Select
          label="Project"
          value={projectId}
          onChange={(event) => setProjectId(event.target.value)}
          options={projects.map((project) => ({
            value: project.id,
            label: `${project.name} (${project.code})`,
          }))}
        />
        <Input
          label="Title"
          value={title}
          onChange={(event) => setTitle(event.target.value)}
          placeholder="Task title"
          required
        />
        <Select
          label="Priority"
          value={priority}
          onChange={(event) => setPriority(event.target.value)}
          options={[
            { value: 'low', label: 'Low' },
            { value: 'medium', label: 'Medium' },
            { value: 'high', label: 'High' },
            { value: 'urgent', label: 'Urgent' },
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
        {errorMessage ? (
          <p className="text-sm text-[var(--danger)]">{errorMessage}</p>
        ) : null}
      </form>
    </Modal>
  );
}
