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

interface CreateInvoiceModalProps {
  open: boolean;
  onClose: () => void;
  onCreated: () => void;
}

export function CreateInvoiceModal({
  open,
  onClose,
  onCreated,
}: CreateInvoiceModalProps) {
  const [clients, setClients] = useState<ClientOption[]>([]);
  const [projects, setProjects] = useState<ProjectOption[]>([]);
  const [clientOrganizationId, setClientOrganizationId] = useState('');
  const [projectId, setProjectId] = useState('');
  const [invoiceNumber, setInvoiceNumber] = useState('');
  const [description, setDescription] = useState('Professional services');
  const [amount, setAmount] = useState('1000');
  const [issueDate, setIssueDate] = useState(
    new Date().toISOString().slice(0, 10),
  );
  const [dueDate, setDueDate] = useState(
    new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10),
  );
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
        if (clientsResponse.data[0]) {
          setClientOrganizationId(clientsResponse.data[0].id);
        }
      })
      .catch(() => {
        setClients([]);
        setProjects([]);
      });
  }, [open]);

  async function handleSubmit(event?: FormEvent) {
    event?.preventDefault();
    if (!clientOrganizationId || !invoiceNumber.trim()) return;

    setIsSubmitting(true);
    setErrorMessage(null);

    try {
      await apiRequest('/invoices', {
        method: 'POST',
        body: JSON.stringify({
          clientOrganizationId,
          projectId: projectId || undefined,
          invoiceNumber: invoiceNumber.trim(),
          issueDate,
          dueDate,
          items: [
            {
              description: description.trim(),
              quantity: 1,
              unitPrice: Number(amount),
            },
          ],
        }),
      });
      onCreated();
      onClose();
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : 'Failed to create invoice',
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Modal
      open={open}
      title="Create Invoice"
      description="Create a new invoice for a client organization."
      onClose={onClose}
      size="lg"
      footer={
        <ModalActions
          onCancel={onClose}
          onSubmit={() => void handleSubmit()}
          submitLabel="Create Invoice"
          isSubmitting={isSubmitting}
          disabled={!clientOrganizationId || !invoiceNumber.trim()}
        />
      }
    >
      <form className="grid gap-4 sm:grid-cols-2" onSubmit={(event) => void handleSubmit(event)}>
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
          label="Invoice number"
          value={invoiceNumber}
          onChange={(event) => setInvoiceNumber(event.target.value)}
          placeholder="INV-1003"
          required
        />
        <Input
          label="Amount (USD)"
          type="number"
          min="0"
          step="0.01"
          value={amount}
          onChange={(event) => setAmount(event.target.value)}
          required
        />
        <Input
          label="Line item description"
          value={description}
          onChange={(event) => setDescription(event.target.value)}
          className="sm:col-span-2"
        />
        <Input
          label="Issue date"
          type="date"
          value={issueDate}
          onChange={(event) => setIssueDate(event.target.value)}
        />
        <Input
          label="Due date"
          type="date"
          value={dueDate}
          onChange={(event) => setDueDate(event.target.value)}
        />
        {errorMessage ? (
          <p className="sm:col-span-2 text-sm text-[var(--danger)]">{errorMessage}</p>
        ) : null}
      </form>
    </Modal>
  );
}
