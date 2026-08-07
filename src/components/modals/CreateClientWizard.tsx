'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Modal } from '@/components/ui/Modal';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { apiRequest } from '@/lib/api-client';
import { ApiResponse } from '@/lib/auth';

interface ManagerOption {
  id: string;
  fullName: string;
}

interface ServiceRow {
  id: string;
  name: string;
  code: string;
  defaultUnit: string;
  defaultPrice?: string | number | null;
  estimatedTatHours?: number | null;
}

interface ServiceEdit {
  serviceId: string;
  enabled: boolean;
  clientPrice: string;
  clientEtaHours: string;
  defaultInstructions: string;
}

interface CreateClientWizardProps {
  open: boolean;
  onClose: () => void;
  onCreated?: () => void;
}

const STEPS = [
  'General Information',
  'Production Preferences',
  'Service Configuration',
  'Review & Save',
] as const;

const EMPTY_GENERAL = {
  name: '',
  clientName: '',
  primaryContactName: '',
  primaryContactEmail: '',
  phone: '',
  whatsapp: '',
  country: '',
  timeZone: '',
  currency: 'INR',
  paymentTerms: '',
  defaultManagerUserId: '',
  notes: '',
};

const EMPTY_PRODUCTION = {
  defaultPriority: 'medium',
  preferredDeliveryMethod: '',
  preferredUploadMethod: '',
  folderStructure: '',
  fileNamingConvention: '',
  workingDays: 'Mon–Fri',
  specialNotes: '',
};

export function CreateClientWizard({
  open,
  onClose,
  onCreated,
}: CreateClientWizardProps) {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [general, setGeneral] = useState(EMPTY_GENERAL);
  const [production, setProduction] = useState(EMPTY_PRODUCTION);
  const [managers, setManagers] = useState<ManagerOption[]>([]);
  const [serviceEdits, setServiceEdits] = useState<ServiceEdit[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setStep(0);
    setGeneral(EMPTY_GENERAL);
    setProduction(EMPTY_PRODUCTION);
    setErrorMessage(null);

    apiRequest<ApiResponse<ManagerOption[]>>('/orders/assignable-users')
      .then((response) => setManagers(response.data))
      .catch(() => setManagers([]));

    apiRequest<ApiResponse<ServiceRow[]>>('/master-data/services')
      .then((response) => {
        setServiceEdits(
          response.data.map((service) => ({
            serviceId: service.id,
            enabled: true,
            clientPrice:
              service.defaultPrice != null ? String(service.defaultPrice) : '',
            clientEtaHours:
              service.estimatedTatHours != null
                ? String(service.estimatedTatHours)
                : '',
            defaultInstructions: '',
            // keep for table display via parallel arrays below
          })),
        );
        setServices(response.data);
      })
      .catch(() => {
        setServiceEdits([]);
        setServices([]);
      });
  }, [open]);

  const [services, setServices] = useState<ServiceRow[]>([]);

  function updateService(serviceId: string, patch: Partial<ServiceEdit>) {
    setServiceEdits((prev) =>
      prev.map((row) =>
        row.serviceId === serviceId ? { ...row, ...patch } : row,
      ),
    );
  }

  function canContinue() {
    if (step === 0) return Boolean(general.name.trim());
    return true;
  }

  async function handleSave() {
    if (!general.name.trim()) {
      setErrorMessage('Company name is required.');
      return;
    }
    setIsSubmitting(true);
    setErrorMessage(null);
    try {
      const response = await apiRequest<ApiResponse<{ id: string }>>(
        '/clients',
        {
          method: 'POST',
          body: JSON.stringify({
            ...general,
            name: general.name.trim(),
            clientName: general.clientName.trim() || undefined,
            primaryContactName: general.primaryContactName.trim() || undefined,
            primaryContactEmail:
              general.primaryContactEmail.trim() || undefined,
            phone: general.phone.trim() || undefined,
            whatsapp: general.whatsapp.trim() || undefined,
            country: general.country.trim() || undefined,
            timeZone: general.timeZone.trim() || undefined,
            currency: general.currency.trim() || undefined,
            paymentTerms: general.paymentTerms.trim() || undefined,
            defaultManagerUserId: general.defaultManagerUserId || undefined,
            notes: general.notes.trim() || undefined,
            ...production,
            defaultPriority: production.defaultPriority || undefined,
            preferredDeliveryMethod:
              production.preferredDeliveryMethod.trim() || undefined,
            preferredUploadMethod:
              production.preferredUploadMethod.trim() || undefined,
            folderStructure: production.folderStructure.trim() || undefined,
            fileNamingConvention:
              production.fileNamingConvention.trim() || undefined,
            workingDays: production.workingDays.trim() || undefined,
            specialNotes: production.specialNotes.trim() || undefined,
            services: serviceEdits.map((row) => ({
              serviceId: row.serviceId,
              enabled: row.enabled,
              clientPrice: row.clientPrice ? Number(row.clientPrice) : null,
              clientEtaHours: row.clientEtaHours
                ? Number(row.clientEtaHours)
                : null,
              defaultInstructions: row.defaultInstructions.trim() || null,
            })),
            contacts:
              general.primaryContactName || general.primaryContactEmail
                ? [
                    {
                      name:
                        general.primaryContactName.trim() ||
                        general.name.trim(),
                      email: general.primaryContactEmail.trim() || undefined,
                      phone: general.phone.trim() || undefined,
                      whatsapp: general.whatsapp.trim() || undefined,
                      isPrimary: true,
                    },
                  ]
                : undefined,
          }),
        },
      );
      onCreated?.();
      onClose();
      router.push(`/clients/${response.data.id}`);
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : 'Failed to create client',
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Modal
      open={open}
      title="Create client"
      description={STEPS[step]}
      size="lg"
      onClose={onClose}
      footer={
        <div className="flex w-full items-center justify-between gap-2">
          <div className="flex gap-1">
            {STEPS.map((label, index) => (
              <span
                key={label}
                className={`h-1.5 w-8 rounded-full ${
                  index <= step
                    ? 'bg-[var(--primary)]'
                    : 'bg-[var(--surface-muted)]'
                }`}
              />
            ))}
          </div>
          <div className="flex gap-2">
            {step > 0 ? (
              <Button
                variant="secondary"
                onClick={() => setStep((current) => current - 1)}
                disabled={isSubmitting}
              >
                Back
              </Button>
            ) : (
              <Button variant="secondary" onClick={onClose} disabled={isSubmitting}>
                Cancel
              </Button>
            )}
            {step < STEPS.length - 1 ? (
              <Button
                onClick={() => setStep((current) => current + 1)}
                disabled={!canContinue()}
              >
                Continue
              </Button>
            ) : (
              <Button
                onClick={() => void handleSave()}
                disabled={isSubmitting || !canContinue()}
              >
                {isSubmitting ? 'Saving…' : 'Save client'}
              </Button>
            )}
          </div>
        </div>
      }
    >
      <div className="space-y-4">
        {errorMessage ? (
          <p className="text-sm text-[var(--danger)]">{errorMessage}</p>
        ) : null}

        {step === 0 ? (
          <div className="grid gap-3 md:grid-cols-2">
            <Input
              label="Company name"
              value={general.name}
              onChange={(event) =>
                setGeneral((prev) => ({ ...prev, name: event.target.value }))
              }
              required
            />
            <Input
              label="Client name"
              value={general.clientName}
              onChange={(event) =>
                setGeneral((prev) => ({
                  ...prev,
                  clientName: event.target.value,
                }))
              }
            />
            <Input
              label="Contact person"
              value={general.primaryContactName}
              onChange={(event) =>
                setGeneral((prev) => ({
                  ...prev,
                  primaryContactName: event.target.value,
                }))
              }
            />
            <Input
              label="Email"
              type="email"
              value={general.primaryContactEmail}
              onChange={(event) =>
                setGeneral((prev) => ({
                  ...prev,
                  primaryContactEmail: event.target.value,
                }))
              }
            />
            <Input
              label="Phone number"
              value={general.phone}
              onChange={(event) =>
                setGeneral((prev) => ({ ...prev, phone: event.target.value }))
              }
            />
            <Input
              label="WhatsApp"
              value={general.whatsapp}
              onChange={(event) =>
                setGeneral((prev) => ({
                  ...prev,
                  whatsapp: event.target.value,
                }))
              }
            />
            <Input
              label="Country"
              value={general.country}
              onChange={(event) =>
                setGeneral((prev) => ({ ...prev, country: event.target.value }))
              }
            />
            <Input
              label="Time zone"
              value={general.timeZone}
              onChange={(event) =>
                setGeneral((prev) => ({
                  ...prev,
                  timeZone: event.target.value,
                }))
              }
              placeholder="Asia/Kolkata"
            />
            <Input
              label="Currency"
              value={general.currency}
              onChange={(event) =>
                setGeneral((prev) => ({
                  ...prev,
                  currency: event.target.value,
                }))
              }
            />
            <Input
              label="Payment terms"
              value={general.paymentTerms}
              onChange={(event) =>
                setGeneral((prev) => ({
                  ...prev,
                  paymentTerms: event.target.value,
                }))
              }
              placeholder="Net 30"
            />
            <label className="block space-y-1.5 md:col-span-2">
              <span className="text-sm font-medium text-[var(--foreground)]">
                Default manager
              </span>
              <select
                value={general.defaultManagerUserId}
                onChange={(event) =>
                  setGeneral((prev) => ({
                    ...prev,
                    defaultManagerUserId: event.target.value,
                  }))
                }
                className="h-11 w-full rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--surface)] px-3 text-sm"
              >
                <option value="">Select manager</option>
                {managers.map((manager) => (
                  <option key={manager.id} value={manager.id}>
                    {manager.fullName}
                  </option>
                ))}
              </select>
            </label>
            <div className="md:col-span-2">
              <Input
                label="Notes"
                value={general.notes}
                onChange={(event) =>
                  setGeneral((prev) => ({ ...prev, notes: event.target.value }))
                }
              />
            </div>
          </div>
        ) : null}

        {step === 1 ? (
          <div className="grid gap-3 md:grid-cols-2">
            <label className="block space-y-1.5">
              <span className="text-sm font-medium text-[var(--foreground)]">
                Default priority
              </span>
              <select
                value={production.defaultPriority}
                onChange={(event) =>
                  setProduction((prev) => ({
                    ...prev,
                    defaultPriority: event.target.value,
                  }))
                }
                className="h-11 w-full rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--surface)] px-3 text-sm"
              >
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
                <option value="urgent">Urgent</option>
              </select>
            </label>
            <Input
              label="Preferred delivery method"
              value={production.preferredDeliveryMethod}
              onChange={(event) =>
                setProduction((prev) => ({
                  ...prev,
                  preferredDeliveryMethod: event.target.value,
                }))
              }
              placeholder="Google Drive / Dropbox"
            />
            <Input
              label="Preferred upload method"
              value={production.preferredUploadMethod}
              onChange={(event) =>
                setProduction((prev) => ({
                  ...prev,
                  preferredUploadMethod: event.target.value,
                }))
              }
            />
            <Input
              label="Working days"
              value={production.workingDays}
              onChange={(event) =>
                setProduction((prev) => ({
                  ...prev,
                  workingDays: event.target.value,
                }))
              }
            />
            <div className="md:col-span-2">
              <Input
                label="Folder structure"
                value={production.folderStructure}
                onChange={(event) =>
                  setProduction((prev) => ({
                    ...prev,
                    folderStructure: event.target.value,
                  }))
                }
              />
            </div>
            <div className="md:col-span-2">
              <Input
                label="File naming convention"
                value={production.fileNamingConvention}
                onChange={(event) =>
                  setProduction((prev) => ({
                    ...prev,
                    fileNamingConvention: event.target.value,
                  }))
                }
              />
            </div>
            <div className="md:col-span-2">
              <Input
                label="Special notes"
                value={production.specialNotes}
                onChange={(event) =>
                  setProduction((prev) => ({
                    ...prev,
                    specialNotes: event.target.value,
                  }))
                }
              />
            </div>
          </div>
        ) : null}

        {step === 2 ? (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[720px] text-left text-sm">
              <thead>
                <tr className="border-b border-[var(--border)] text-xs uppercase text-[var(--muted)]">
                  <th className="pb-2 pr-3">Enable</th>
                  <th className="pb-2 pr-3">Service</th>
                  <th className="pb-2 pr-3 text-right">Client price</th>
                  <th className="pb-2 pr-3 text-right">Client ETA</th>
                  <th className="pb-2 pr-3">Unit</th>
                  <th className="pb-2">Default instructions</th>
                </tr>
              </thead>
              <tbody>
                {services.map((service) => {
                  const edit = serviceEdits.find(
                    (row) => row.serviceId === service.id,
                  );
                  if (!edit) return null;
                  return (
                    <tr
                      key={service.id}
                      className="border-b border-[var(--border)] last:border-0"
                    >
                      <td className="py-2 pr-3">
                        <input
                          type="checkbox"
                          checked={edit.enabled}
                          onChange={(event) =>
                            updateService(service.id, {
                              enabled: event.target.checked,
                            })
                          }
                        />
                      </td>
                      <td className="py-2 pr-3">
                        <div className="font-medium">{service.name}</div>
                        <div className="text-xs text-[var(--muted)]">
                          {service.code}
                        </div>
                      </td>
                      <td className="py-2 pr-3 text-right">
                        <input
                          type="number"
                          min={0}
                          step="0.01"
                          disabled={!edit.enabled}
                          value={edit.clientPrice}
                          onChange={(event) =>
                            updateService(service.id, {
                              clientPrice: event.target.value,
                            })
                          }
                          className="w-20 rounded border border-[var(--border)] px-2 py-1 text-right text-sm disabled:opacity-50"
                        />
                      </td>
                      <td className="py-2 pr-3 text-right">
                        <input
                          type="number"
                          min={0}
                          disabled={!edit.enabled}
                          value={edit.clientEtaHours}
                          onChange={(event) =>
                            updateService(service.id, {
                              clientEtaHours: event.target.value,
                            })
                          }
                          className="w-16 rounded border border-[var(--border)] px-2 py-1 text-right text-sm disabled:opacity-50"
                        />
                      </td>
                      <td className="py-2 pr-3 text-[var(--muted)]">
                        {edit.enabled ? service.defaultUnit : '—'}
                      </td>
                      <td className="py-2">
                        <input
                          disabled={!edit.enabled}
                          value={edit.defaultInstructions}
                          onChange={(event) =>
                            updateService(service.id, {
                              defaultInstructions: event.target.value,
                            })
                          }
                          placeholder="Match previous edits"
                          className="w-full rounded border border-[var(--border)] px-2 py-1 text-sm disabled:opacity-50"
                        />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : null}

        {step === 3 ? (
          <div className="space-y-3 text-sm">
            <p>
              <span className="text-[var(--muted)]">Company:</span>{' '}
              <span className="font-medium">{general.name}</span>
            </p>
            <p>
              <span className="text-[var(--muted)]">Contact:</span>{' '}
              {general.primaryContactName || '—'} ·{' '}
              {general.primaryContactEmail || '—'}
            </p>
            <p>
              <span className="text-[var(--muted)]">Enabled services:</span>{' '}
              {serviceEdits.filter((row) => row.enabled).length} of{' '}
              {serviceEdits.length}
            </p>
            <p className="text-[var(--muted)]">
              After save you will land on the client detail page. A general
              conversation channel is created automatically.
            </p>
          </div>
        ) : null}
      </div>
    </Modal>
  );
}
