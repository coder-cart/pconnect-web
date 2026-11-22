'use client';

import { FormEvent, useEffect, useState } from 'react';
import { apiRequest } from '@/lib/api-client';
import { ApiResponse } from '@/lib/auth';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';

type FormFieldType =
  | 'text'
  | 'textarea'
  | 'email'
  | 'phone'
  | 'select'
  | 'checkbox';

interface FormField {
  id: string;
  label: string;
  type: FormFieldType;
  required: boolean;
  options?: string[];
}

interface CatalogService {
  id: string;
  name: string;
  description?: string | null;
  durationMinutes: number;
  priceCents?: number | null;
  currency: string;
  formSchema: FormField[];
  sortOrder: number;
  isActive: boolean;
}

interface CatalogCategory {
  id: string;
  name: string;
  description?: string | null;
  sortOrder: number;
  isActive: boolean;
  services: CatalogService[];
}

interface BookingCatalogPanelProps {
  clientOrganizationId: string;
}

const FIELD_TYPE_OPTIONS = [
  { value: 'text', label: 'Text' },
  { value: 'textarea', label: 'Long text' },
  { value: 'email', label: 'Email' },
  { value: 'phone', label: 'Phone' },
  { value: 'select', label: 'Select' },
  { value: 'checkbox', label: 'Checkbox' },
];

function emptyField(): FormField {
  return {
    id: `field-${Date.now()}`,
    label: '',
    type: 'text',
    required: false,
  };
}

export function BookingCatalogPanel({
  clientOrganizationId,
}: BookingCatalogPanelProps) {
  const [categories, setCategories] = useState<CatalogCategory[]>([]);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isBusy, setIsBusy] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [expandedCategoryId, setExpandedCategoryId] = useState<string | null>(
    null,
  );
  const [serviceDraft, setServiceDraft] = useState({
    name: '',
    durationMinutes: 60,
    priceDollars: '',
    description: '',
  });
  const [editingServiceId, setEditingServiceId] = useState<string | null>(null);
  const [formDraft, setFormDraft] = useState<FormField[]>([]);

  async function load() {
    setIsLoading(true);
    setErrorMessage(null);
    try {
      const response = await apiRequest<
        ApiResponse<{ categories: CatalogCategory[] }>
      >(`/clients/${clientOrganizationId}/booking-catalog`);
      const items = response.data.categories ?? [];
      setCategories(items);
      if (!expandedCategoryId && items[0]) {
        setExpandedCategoryId(items[0].id);
      }
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : 'Unable to load catalog',
      );
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clientOrganizationId]);

  async function createCategory(event: FormEvent) {
    event.preventDefault();
    const name = newCategoryName.trim();
    if (!name) return;
    setIsBusy(true);
    setErrorMessage(null);
    try {
      await apiRequest(`/clients/${clientOrganizationId}/booking-categories`, {
        method: 'POST',
        body: JSON.stringify({ name }),
      });
      setNewCategoryName('');
      await load();
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : 'Unable to create category',
      );
    } finally {
      setIsBusy(false);
    }
  }

  async function toggleCategoryActive(category: CatalogCategory) {
    setIsBusy(true);
    setErrorMessage(null);
    try {
      await apiRequest(
        `/clients/${clientOrganizationId}/booking-categories/${category.id}`,
        {
          method: 'PATCH',
          body: JSON.stringify({ isActive: !category.isActive }),
        },
      );
      await load();
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : 'Unable to update category',
      );
    } finally {
      setIsBusy(false);
    }
  }

  async function createService(categoryId: string, event: FormEvent) {
    event.preventDefault();
    const name = serviceDraft.name.trim();
    if (!name) return;
    setIsBusy(true);
    setErrorMessage(null);
    try {
      const priceCents =
        serviceDraft.priceDollars.trim() === ''
          ? null
          : Math.round(Number(serviceDraft.priceDollars) * 100);
      await apiRequest(
        `/clients/${clientOrganizationId}/booking-categories/${categoryId}/services`,
        {
          method: 'POST',
          body: JSON.stringify({
            name,
            description: serviceDraft.description.trim() || null,
            durationMinutes: serviceDraft.durationMinutes,
            priceCents:
              priceCents !== null && Number.isFinite(priceCents)
                ? priceCents
                : null,
            formSchema: [],
          }),
        },
      );
      setServiceDraft({
        name: '',
        durationMinutes: 60,
        priceDollars: '',
        description: '',
      });
      await load();
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : 'Unable to create service',
      );
    } finally {
      setIsBusy(false);
    }
  }

  async function toggleServiceActive(service: CatalogService) {
    setIsBusy(true);
    setErrorMessage(null);
    try {
      await apiRequest(
        `/clients/${clientOrganizationId}/booking-services/${service.id}`,
        {
          method: 'PATCH',
          body: JSON.stringify({ isActive: !service.isActive }),
        },
      );
      await load();
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : 'Unable to update service',
      );
    } finally {
      setIsBusy(false);
    }
  }

  function startEditForm(service: CatalogService) {
    setEditingServiceId(service.id);
    setFormDraft(
      service.formSchema?.length
        ? service.formSchema.map((field) => ({ ...field }))
        : [emptyField()],
    );
  }

  async function saveFormSchema(serviceId: string) {
    setIsBusy(true);
    setErrorMessage(null);
    try {
      const formSchema = formDraft
        .map((field) => ({
          ...field,
          label: field.label.trim(),
          options:
            field.type === 'select'
              ? (field.options ?? [])
                  .map((item) => item.trim())
                  .filter(Boolean)
              : undefined,
        }))
        .filter((field) => field.label);
      await apiRequest(
        `/clients/${clientOrganizationId}/booking-services/${serviceId}`,
        {
          method: 'PATCH',
          body: JSON.stringify({ formSchema }),
        },
      );
      setEditingServiceId(null);
      await load();
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : 'Unable to save form fields',
      );
    } finally {
      setIsBusy(false);
    }
  }

  if (isLoading) {
    return (
      <Card padding="sm">
        <p className="text-sm text-[var(--muted)]">Loading catalog…</p>
      </Card>
    );
  }

  return (
    <Card padding="md" className="space-y-4">
      <div>
        <h3 className="text-sm font-semibold text-[var(--foreground)]">
          Categories & services
        </h3>
        <p className="mt-1 text-xs text-[var(--muted)]">
          Guests pick a category, then a service. Duration filters open slots on
          the public page. Optional form fields collect details at booking time.
        </p>
      </div>

      {errorMessage ? (
        <p className="text-xs text-[var(--danger)]">{errorMessage}</p>
      ) : null}

      <form
        className="flex flex-wrap items-end gap-2"
        onSubmit={(event) => void createCategory(event)}
      >
        <Input
          label="New category"
          value={newCategoryName}
          onChange={(event) => setNewCategoryName(event.target.value)}
          placeholder="e.g. Portraits"
        />
        <Button size="sm" disabled={isBusy || !newCategoryName.trim()}>
          Add category
        </Button>
      </form>

      {categories.length === 0 ? (
        <p className="text-sm text-[var(--muted)]">
          No categories yet. Add one to start building your catalog.
        </p>
      ) : (
        <ul className="space-y-3">
          {categories.map((category) => {
            const expanded = expandedCategoryId === category.id;
            return (
              <li
                key={category.id}
                className="rounded-[var(--radius-md)] border border-[var(--border)] p-3"
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <button
                    type="button"
                    className="text-left text-sm font-semibold text-[var(--foreground)]"
                    onClick={() =>
                      setExpandedCategoryId(expanded ? null : category.id)
                    }
                  >
                    {category.name}
                    {!category.isActive ? ' (inactive)' : ''}
                    <span className="ml-2 text-xs font-normal text-[var(--muted)]">
                      {category.services.length} service
                      {category.services.length === 1 ? '' : 's'}
                    </span>
                  </button>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="ghost"
                      disabled={isBusy}
                      onClick={() => void toggleCategoryActive(category)}
                    >
                      {category.isActive ? 'Deactivate' : 'Activate'}
                    </Button>
                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={() =>
                        setExpandedCategoryId(expanded ? null : category.id)
                      }
                    >
                      {expanded ? 'Collapse' : 'Manage'}
                    </Button>
                  </div>
                </div>

                {expanded ? (
                  <div className="mt-3 space-y-3 border-t border-[var(--border)] pt-3">
                    <ul className="space-y-2">
                      {category.services.map((service) => (
                        <li
                          key={service.id}
                          className="rounded-[var(--radius-md)] bg-[var(--surface-muted)] p-3"
                        >
                          <div className="flex flex-wrap items-start justify-between gap-2">
                            <div>
                              <p className="text-sm font-medium">
                                {service.name}
                                {!service.isActive ? ' (inactive)' : ''}
                              </p>
                              <p className="text-xs text-[var(--muted)]">
                                {service.durationMinutes} min
                                {service.priceCents != null
                                  ? ` · ${(service.priceCents / 100).toFixed(2)} ${service.currency}`
                                  : ''}
                                {service.formSchema?.length
                                  ? ` · ${service.formSchema.length} custom field${service.formSchema.length === 1 ? '' : 's'}`
                                  : ''}
                              </p>
                            </div>
                            <div className="flex flex-wrap gap-2">
                              <Button
                                size="sm"
                                variant="ghost"
                                disabled={isBusy}
                                onClick={() => void toggleServiceActive(service)}
                              >
                                {service.isActive ? 'Deactivate' : 'Activate'}
                              </Button>
                              <Button
                                size="sm"
                                variant="secondary"
                                onClick={() => startEditForm(service)}
                              >
                                Form fields
                              </Button>
                            </div>
                          </div>

                          {editingServiceId === service.id ? (
                            <div className="mt-3 space-y-2 border-t border-[var(--border)] pt-3">
                              {formDraft.map((field, index) => (
                                <div
                                  key={field.id}
                                  className="grid gap-2 sm:grid-cols-[1fr_140px_auto_auto]"
                                >
                                  <Input
                                    label="Label"
                                    value={field.label}
                                    onChange={(event) =>
                                      setFormDraft((current) =>
                                        current.map((item, i) =>
                                          i === index
                                            ? {
                                                ...item,
                                                label: event.target.value,
                                              }
                                            : item,
                                        ),
                                      )
                                    }
                                  />
                                  <Select
                                    label="Type"
                                    value={field.type}
                                    onChange={(event) =>
                                      setFormDraft((current) =>
                                        current.map((item, i) =>
                                          i === index
                                            ? {
                                                ...item,
                                                type: event.target
                                                  .value as FormFieldType,
                                              }
                                            : item,
                                        ),
                                      )
                                    }
                                    options={FIELD_TYPE_OPTIONS}
                                  />
                                  <label className="flex items-end gap-2 pb-2 text-xs">
                                    <input
                                      type="checkbox"
                                      checked={field.required}
                                      onChange={(event) =>
                                        setFormDraft((current) =>
                                          current.map((item, i) =>
                                            i === index
                                              ? {
                                                  ...item,
                                                  required:
                                                    event.target.checked,
                                                }
                                              : item,
                                          ),
                                        )
                                      }
                                    />
                                    Required
                                  </label>
                                  <div className="flex items-end">
                                    <Button
                                      size="sm"
                                      variant="ghost"
                                      onClick={() =>
                                        setFormDraft((current) =>
                                          current.filter((_, i) => i !== index),
                                        )
                                      }
                                    >
                                      Remove
                                    </Button>
                                  </div>
                                  {field.type === 'select' ? (
                                    <Input
                                      label="Options (comma-separated)"
                                      className="sm:col-span-4"
                                      value={(field.options ?? []).join(', ')}
                                      onChange={(event) =>
                                        setFormDraft((current) =>
                                          current.map((item, i) =>
                                            i === index
                                              ? {
                                                  ...item,
                                                  options: event.target.value
                                                    .split(',')
                                                    .map((part) => part.trim())
                                                    .filter(Boolean),
                                                }
                                              : item,
                                          ),
                                        )
                                      }
                                    />
                                  ) : null}
                                </div>
                              ))}
                              <div className="flex flex-wrap gap-2">
                                <Button
                                  size="sm"
                                  variant="secondary"
                                  onClick={() =>
                                    setFormDraft((current) => [
                                      ...current,
                                      emptyField(),
                                    ])
                                  }
                                >
                                  Add field
                                </Button>
                                <Button
                                  size="sm"
                                  disabled={isBusy}
                                  onClick={() =>
                                    void saveFormSchema(service.id)
                                  }
                                >
                                  Save form
                                </Button>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => setEditingServiceId(null)}
                                >
                                  Cancel
                                </Button>
                              </div>
                            </div>
                          ) : null}
                        </li>
                      ))}
                    </ul>

                    <form
                      className="grid gap-2 sm:grid-cols-[1fr_100px_100px_auto]"
                      onSubmit={(event) =>
                        void createService(category.id, event)
                      }
                    >
                      <Input
                        label="Service name"
                        value={serviceDraft.name}
                        onChange={(event) =>
                          setServiceDraft((current) => ({
                            ...current,
                            name: event.target.value,
                          }))
                        }
                        placeholder="e.g. 60-min portrait"
                      />
                      <Input
                        label="Minutes"
                        type="number"
                        min={15}
                        max={480}
                        value={String(serviceDraft.durationMinutes)}
                        onChange={(event) =>
                          setServiceDraft((current) => ({
                            ...current,
                            durationMinutes: Number(event.target.value) || 60,
                          }))
                        }
                      />
                      <Input
                        label="Price ($)"
                        value={serviceDraft.priceDollars}
                        onChange={(event) =>
                          setServiceDraft((current) => ({
                            ...current,
                            priceDollars: event.target.value,
                          }))
                        }
                        placeholder="Optional"
                      />
                      <div className="flex items-end">
                        <Button
                          size="sm"
                          disabled={isBusy || !serviceDraft.name.trim()}
                        >
                          Add service
                        </Button>
                      </div>
                    </form>
                  </div>
                ) : null}
              </li>
            );
          })}
        </ul>
      )}
    </Card>
  );
}
