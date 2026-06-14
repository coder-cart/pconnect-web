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

interface CreateExpenseModalProps {
  open: boolean;
  onClose: () => void;
  onCreated: () => void;
}

export function CreateExpenseModal({
  open,
  onClose,
  onCreated,
}: CreateExpenseModalProps) {
  const [projects, setProjects] = useState<ProjectOption[]>([]);
  const [category, setCategory] = useState('');
  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState('');
  const [projectId, setProjectId] = useState('');
  const [incurredOn, setIncurredOn] = useState(
    new Date().toISOString().slice(0, 10),
  );
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;

    apiRequest<ApiResponse<ProjectOption[]>>('/projects')
      .then((response) => setProjects(response.data))
      .catch(() => setProjects([]));
  }, [open]);

  async function handleSubmit(event?: FormEvent) {
    event?.preventDefault();
    if (!category.trim() || !description.trim() || !amount.trim()) return;

    setIsSubmitting(true);
    setErrorMessage(null);

    try {
      await apiRequest('/expenses', {
        method: 'POST',
        body: JSON.stringify({
          category: category.trim(),
          description: description.trim(),
          amount: Number(amount),
          projectId: projectId || undefined,
          incurredOn,
        }),
      });

      setCategory('');
      setDescription('');
      setAmount('');
      setProjectId('');
      onCreated();
      onClose();
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : 'Unable to create expense',
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Submit expense"
      description="Record a reimbursable or billable expense."
      footer={
        <ModalActions
          onCancel={onClose}
          onSubmit={() => void handleSubmit()}
          submitLabel="Submit expense"
          isSubmitting={isSubmitting}
          disabled={!category.trim() || !description.trim() || !amount.trim()}
        />
      }
    >
      <form className="space-y-4" onSubmit={(event) => void handleSubmit(event)}>
        <Input
          label="Category"
          value={category}
          onChange={(event) => setCategory(event.target.value)}
          placeholder="Travel, Software, etc."
          required
        />
        <Input
          label="Description"
          value={description}
          onChange={(event) => setDescription(event.target.value)}
          required
        />
        <Input
          label="Amount (USD)"
          type="number"
          min="0.01"
          step="0.01"
          value={amount}
          onChange={(event) => setAmount(event.target.value)}
          required
        />
        <Input
          label="Incurred on"
          type="date"
          value={incurredOn}
          onChange={(event) => setIncurredOn(event.target.value)}
          required
        />
        <Select
          label="Project (optional)"
          value={projectId}
          onChange={(event) => setProjectId(event.target.value)}
          options={[
            { value: '', label: 'No project' },
            ...projects.map((project) => ({
              value: project.id,
              label: `${project.name} (${project.code})`,
            })),
          ]}
        />
        {errorMessage ? (
          <p className="text-sm text-[var(--danger)]">{errorMessage}</p>
        ) : null}
      </form>
    </Modal>
  );
}
