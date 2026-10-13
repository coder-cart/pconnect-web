'use client';

import { useEffect, useState } from 'react';
import { Plus } from 'lucide-react';
import { apiRequest } from '@/lib/api-client';
import { ApiResponse } from '@/lib/auth';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Badge } from '@/components/ui/Badge';
import { Modal, ModalActions } from '@/components/ui/Modal';
import { ListSkeleton } from '@/components/ui/Skeleton';
import { ErrorState } from '@/components/ui/StatePanels';
import { useWorkspace } from '@/components/providers/WorkspaceProvider';
import { formatEditorMoney, formatMoney } from '@/lib/money';

interface ServiceMasterItem {
  id: string;
  name: string;
  code: string;
  category?: string | null;
  description?: string | null;
  defaultPrice?: string | number | null;
  artistRatePerImage?: string | number | null;
  defaultUnit: string;
  estimatedTatHours?: number | null;
  isActive: boolean;
  createdAt?: string;
  updatedAt?: string;
}

interface ServiceFormState {
  name: string;
  code: string;
  category: string;
  description: string;
  defaultUnit: string;
  defaultPrice: string;
  artistRatePerImage: string;
  estimatedTatHours: string;
  isActive: boolean;
}

const EMPTY_FORM: ServiceFormState = {
  name: '',
  code: '',
  category: '',
  description: '',
  defaultUnit: 'Per Image',
  defaultPrice: '',
  artistRatePerImage: '',
  estimatedTatHours: '',
  isActive: true,
};

function formatEta(hours?: number | null) {
  if (hours === null || hours === undefined) return '—';
  return `${hours} Hours`;
}

function formatDate(value?: string) {
  if (!value) return '—';
  return new Date(value).toLocaleDateString([], {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

export function ServiceMasterManager() {
  const { refreshKey, notifyRefresh } = useWorkspace();
  const [services, setServices] = useState<ServiceMasterItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<ServiceFormState>(EMPTY_FORM);

  function load() {
    setIsLoading(true);
    apiRequest<ApiResponse<ServiceMasterItem[]>>(
      '/master-data/services?activeOnly=false',
    )
      .then((response) => setServices(response.data))
      .catch((error: Error) => setErrorMessage(error.message))
      .finally(() => setIsLoading(false));
  }

  useEffect(load, [refreshKey]);

  function openCreate() {
    setEditingId(null);
    setForm(EMPTY_FORM);
    setFormError(null);
    setModalOpen(true);
  }

  function openEdit(service: ServiceMasterItem) {
    setEditingId(service.id);
    setForm({
      name: service.name,
      code: service.code,
      category: service.category ?? '',
      description: service.description ?? '',
      defaultUnit: service.defaultUnit ?? 'Per Image',
      defaultPrice:
        service.defaultPrice != null ? String(service.defaultPrice) : '',
      artistRatePerImage:
        service.artistRatePerImage != null
          ? String(service.artistRatePerImage)
          : '',
      estimatedTatHours:
        service.estimatedTatHours != null
          ? String(service.estimatedTatHours)
          : '',
      isActive: service.isActive,
    });
    setFormError(null);
    setModalOpen(true);
  }

  async function handleSubmit() {
    if (!form.name.trim() || !form.code.trim()) {
      setFormError('Service name and short code are required.');
      return;
    }
    setBusy(true);
    setFormError(null);

    const payload = {
      name: form.name.trim(),
      code: form.code.trim().toUpperCase(),
      category: form.category.trim() || undefined,
      description: form.description.trim() || undefined,
      defaultUnit: form.defaultUnit.trim() || 'Per Image',
      defaultPrice: form.defaultPrice ? Number(form.defaultPrice) : undefined,
      artistRatePerImage: form.artistRatePerImage
        ? Number(form.artistRatePerImage)
        : undefined,
      estimatedTatHours: form.estimatedTatHours
        ? Number(form.estimatedTatHours)
        : undefined,
      isActive: form.isActive,
    };

    try {
      if (editingId) {
        await apiRequest(`/master-data/services/${editingId}`, {
          method: 'PATCH',
          body: JSON.stringify(payload),
        });
      } else {
        await apiRequest('/master-data/services', {
          method: 'POST',
          body: JSON.stringify(payload),
        });
      }
      setModalOpen(false);
      notifyRefresh();
      load();
    } catch (error) {
      setFormError(error instanceof Error ? error.message : 'Save failed');
    } finally {
      setBusy(false);
    }
  }

  if (isLoading) return <ListSkeleton rows={6} />;
  if (errorMessage) {
    return (
      <ErrorState title="Unable to load Service Master" description={errorMessage} />
    );
  }

  return (
    <div className="space-y-4">
      <Card>
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h3 className="text-sm font-medium text-[var(--foreground)]">
              Service Master
            </h3>
            <p className="mt-1 text-xs text-[var(--muted)]">
              Company-wide default configuration for each service. Clients inherit
              these defaults and may override price and ETA in their Service
              Configuration.
            </p>
          </div>
          <Button onClick={openCreate}>
            <Plus className="h-4 w-4" />
            Add service
          </Button>
        </div>

        {services.length === 0 ? (
          <p className="text-sm text-[var(--muted)]">
            No services yet. Add the first service to build your catalogue.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[860px] text-left text-sm">
              <thead>
                <tr className="border-b border-[var(--border)] text-xs font-medium uppercase tracking-wide text-[var(--muted)]">
                  <th className="pb-2 pr-4 font-medium">Code</th>
                  <th className="pb-2 pr-4 font-medium">Service</th>
                  <th className="pb-2 pr-4 font-medium">Category</th>
                  <th className="pb-2 pr-4 text-right font-medium">
                    Client price ($)
                  </th>
                  <th className="pb-2 pr-4 text-right font-medium">
                    Artist rate (₹)
                  </th>
                  <th className="pb-2 pr-4 font-medium">Unit</th>
                  <th className="pb-2 pr-4 font-medium">Default ETA</th>
                  <th className="pb-2 pr-4 font-medium">Status</th>
                  <th className="pb-2 pr-4 font-medium">Updated</th>
                  <th className="pb-2 font-medium" />
                </tr>
              </thead>
              <tbody>
                {services.map((service) => (
                  <tr
                    key={service.id}
                    className="border-b border-[var(--border)] last:border-0"
                  >
                    <td className="py-3 pr-4 font-medium text-[var(--foreground)]">
                      {service.code}
                    </td>
                    <td className="py-3 pr-4">
                      <div className="text-[var(--foreground)]">{service.name}</div>
                      {service.description ? (
                        <div className="text-xs text-[var(--muted)]">
                          {service.description}
                        </div>
                      ) : null}
                    </td>
                    <td className="py-3 pr-4 text-[var(--muted-foreground)]">
                      {service.category || '—'}
                    </td>
                    <td className="py-3 pr-4 text-right">
                      {formatMoney(service.defaultPrice, 'USD')}
                    </td>
                    <td className="py-3 pr-4 text-right">
                      {formatEditorMoney(service.artistRatePerImage)}
                    </td>
                    <td className="py-3 pr-4 text-[var(--muted-foreground)]">
                      {service.defaultUnit}
                    </td>
                    <td className="py-3 pr-4 text-[var(--muted-foreground)]">
                      {formatEta(service.estimatedTatHours)}
                    </td>
                    <td className="py-3 pr-4">
                      <Badge variant={service.isActive ? 'success' : 'neutral'}>
                        {service.isActive ? 'Active' : 'Inactive'}
                      </Badge>
                    </td>
                    <td className="py-3 pr-4 text-xs text-[var(--muted)]">
                      {formatDate(service.updatedAt)}
                    </td>
                    <td className="py-3 text-right">
                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={() => openEdit(service)}
                      >
                        Edit
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      <Modal
        open={modalOpen}
        title={editingId ? 'Edit service' : 'Add service'}
        description="Default configuration inherited by every client."
        onClose={() => setModalOpen(false)}
        footer={
          <ModalActions
            onCancel={() => setModalOpen(false)}
            onSubmit={handleSubmit}
            submitLabel={editingId ? 'Save changes' : 'Create service'}
            isSubmitting={busy}
          />
        }
      >
        <div className="space-y-3">
          {formError ? (
            <p className="text-sm text-[var(--danger)]">{formError}</p>
          ) : null}

          <div className="grid gap-3 md:grid-cols-2">
            <Input
              label="Service name"
              value={form.name}
              onChange={(event) =>
                setForm((prev) => ({ ...prev, name: event.target.value }))
              }
              placeholder="Color Correction"
            />
            <Input
              label="Short code"
              value={form.code}
              onChange={(event) =>
                setForm((prev) => ({ ...prev, code: event.target.value }))
              }
              placeholder="CC"
            />
          </div>

          <div className="grid gap-3 md:grid-cols-2">
            <Input
              label="Category"
              value={form.category}
              onChange={(event) =>
                setForm((prev) => ({ ...prev, category: event.target.value }))
              }
              placeholder="Retouching"
            />
            <Input
              label="Default unit"
              value={form.defaultUnit}
              onChange={(event) =>
                setForm((prev) => ({ ...prev, defaultUnit: event.target.value }))
              }
              placeholder="Per Image"
            />
          </div>

          <Input
            label="Description"
            value={form.description}
            onChange={(event) =>
              setForm((prev) => ({ ...prev, description: event.target.value }))
            }
            placeholder="Short description of the service"
          />

          <div className="grid gap-3 md:grid-cols-3">
            <Input
              label="Default client price ($)"
              type="number"
              min={0}
              step="0.01"
              value={form.defaultPrice}
              onChange={(event) =>
                setForm((prev) => ({ ...prev, defaultPrice: event.target.value }))
              }
              placeholder="2"
              hint="Client billing default in USD; override per client currency on the client page."
            />
            <Input
              label="Default artist rate (₹)"
              type="number"
              min={0}
              step="0.01"
              value={form.artistRatePerImage}
              onChange={(event) =>
                setForm((prev) => ({
                  ...prev,
                  artistRatePerImage: event.target.value,
                }))
              }
              placeholder="0.50"
              hint="Editor pay is always INR."
            />
            <Input
              label="Default ETA (hours)"
              type="number"
              min={0}
              value={form.estimatedTatHours}
              onChange={(event) =>
                setForm((prev) => ({
                  ...prev,
                  estimatedTatHours: event.target.value,
                }))
              }
              placeholder="24"
            />
          </div>

          <label className="flex items-center gap-2 text-sm text-[var(--foreground)]">
            <input
              type="checkbox"
              checked={form.isActive}
              onChange={(event) =>
                setForm((prev) => ({ ...prev, isActive: event.target.checked }))
              }
            />
            Active status
          </label>
        </div>
      </Modal>
    </div>
  );
}
