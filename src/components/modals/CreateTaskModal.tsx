'use client';

import { FormEvent, useEffect, useState } from 'react';
import { Modal, ModalActions } from '@/components/ui/Modal';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { apiRequest } from '@/lib/api-client';
import { ApiResponse, AuthenticatedUser, userIsExternal } from '@/lib/auth';

interface ProjectOption {
  id: string;
  name: string;
  code: string;
}

interface CandidateUser {
  id: string;
  fullName: string;
  email: string;
  userType: string;
}

interface CreateTaskModalProps {
  open: boolean;
  onClose: () => void;
  onCreated: () => void;
  user: AuthenticatedUser;
}

export function CreateTaskModal({
  open,
  onClose,
  onCreated,
  user,
}: CreateTaskModalProps) {
  const isExternal = userIsExternal(user);
  const [projects, setProjects] = useState<ProjectOption[]>([]);
  const [projectId, setProjectId] = useState('');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [priority, setPriority] = useState('medium');
  const [assigneeUserId, setAssigneeUserId] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [startDate, setStartDate] = useState('');
  const [candidates, setCandidates] = useState<CandidateUser[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;

    let cancelled = false;
    Promise.all([
      apiRequest<ApiResponse<ProjectOption[] | { items: ProjectOption[] }>>(
        '/projects',
      ).catch(() => null),
      apiRequest<
        ApiResponse<{
          portalUsers: CandidateUser[];
          internalUsers: CandidateUser[];
        }>
      >('/tasks/assignee-candidates').catch(() => null),
      isExternal
        ? apiRequest<ApiResponse<ProjectOption>>('/tasks/studio-project', {
            method: 'POST',
            body: JSON.stringify({}),
          }).catch(() => null)
        : Promise.resolve(null),
    ]).then(([projectsResponse, candidatesResponse, studioProject]) => {
      if (cancelled) return;

      const projectList = Array.isArray(projectsResponse?.data)
        ? projectsResponse.data
        : projectsResponse?.data &&
            'items' in projectsResponse.data &&
            Array.isArray(projectsResponse.data.items)
          ? projectsResponse.data.items
          : [];

      const merged = [...projectList];
      if (studioProject?.data && !merged.some((p) => p.id === studioProject.data.id)) {
        merged.unshift(studioProject.data);
      }
      setProjects(merged);
      setProjectId(studioProject?.data?.id ?? merged[0]?.id ?? '');

      const people = [
        ...(candidatesResponse?.data.portalUsers ?? []),
        ...(candidatesResponse?.data.internalUsers ?? []),
      ];
      const unique = new Map(people.map((person) => [person.id, person]));
      setCandidates(Array.from(unique.values()));
    });

    return () => {
      cancelled = true;
    };
  }, [open, isExternal]);

  function resetForm() {
    setTitle('');
    setDescription('');
    setPriority('medium');
    setAssigneeUserId('');
    setDueDate('');
    setStartDate('');
    setErrorMessage(null);
  }

  async function handleSubmit(event?: FormEvent) {
    event?.preventDefault();
    if (!title.trim()) return;

    setIsSubmitting(true);
    setErrorMessage(null);

    try {
      await apiRequest('/tasks', {
        method: 'POST',
        body: JSON.stringify({
          projectId: projectId || undefined,
          title: title.trim(),
          description: description.trim() || undefined,
          priority,
          assigneeUserId: assigneeUserId || undefined,
          startDate: startDate || undefined,
          dueDate: dueDate || undefined,
          visibilityScope: isExternal ? 'shared_with_client' : undefined,
        }),
      });
      resetForm();
      onCreated();
      onClose();
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : 'Failed to create task',
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Modal
      open={open}
      title="New Task"
      description={
        isExternal
          ? 'Create a studio task and assign it to your team or Colabdeck staff.'
          : 'Create a task for your team.'
      }
      onClose={() => {
        resetForm();
        onClose();
      }}
      footer={
        <ModalActions
          onCancel={onClose}
          onSubmit={() => void handleSubmit()}
          submitLabel="Create Task"
          isSubmitting={isSubmitting}
          disabled={!title.trim()}
        />
      }
    >
      <form className="space-y-4" onSubmit={(event) => void handleSubmit(event)}>
        {!isExternal && projects.length > 0 ? (
          <Select
            label="Project"
            value={projectId}
            onChange={(event) => setProjectId(event.target.value)}
            options={projects.map((project) => ({
              value: project.id,
              label: `${project.name} (${project.code})`,
            }))}
          />
        ) : null}
        <Input
          label="Title"
          value={title}
          onChange={(event) => setTitle(event.target.value)}
          placeholder="Task title"
          required
        />
        <label className="block space-y-1.5">
          <span className="text-sm font-medium text-[var(--foreground)]">
            Description
          </span>
          <textarea
            value={description}
            onChange={(event) => setDescription(event.target.value)}
            rows={3}
            className="w-full rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-sm"
          />
        </label>
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
          label="Assignee"
          value={assigneeUserId}
          onChange={(event) => setAssigneeUserId(event.target.value)}
          options={[
            { value: '', label: 'Unassigned' },
            ...candidates.map((person) => ({
              value: person.id,
              label: `${person.fullName} (${person.userType})`,
            })),
          ]}
        />
        <div className="grid gap-3 sm:grid-cols-2">
          <Input
            label="Start date"
            type="date"
            value={startDate}
            onChange={(event) => setStartDate(event.target.value)}
          />
          <Input
            label="Due date"
            type="date"
            value={dueDate}
            onChange={(event) => setDueDate(event.target.value)}
          />
        </div>
        {errorMessage ? (
          <p className="text-sm text-[var(--danger)]">{errorMessage}</p>
        ) : null}
      </form>
    </Modal>
  );
}
