'use client';

import { useEffect, useMemo, useState } from 'react';
import { Plus } from 'lucide-react';
import { apiRequest } from '@/lib/api-client';
import { ApiResponse } from '@/lib/auth';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Badge } from '@/components/ui/Badge';
import { Modal, ModalActions } from '@/components/ui/Modal';
import { TimeZoneSelect } from '@/components/ui/TimeZoneSelect';
import { ListSkeleton } from '@/components/ui/Skeleton';
import { ErrorState } from '@/components/ui/StatePanels';
import { useWorkspace } from '@/components/providers/WorkspaceProvider';

type CampaignStatus =
  | 'draft'
  | 'scheduled'
  | 'active'
  | 'paused'
  | 'expired'
  | 'archived';

interface CampaignListItem {
  id: string;
  name: string;
  slug: string;
  status: CampaignStatus;
  publicTitle: string;
  startsAt: string;
  endsAt: string;
  timezone: string;
  discountValue: string | number;
  brandProfile: string;
  _count?: { orders: number; redemptions: number };
}

interface CampaignFormState {
  name: string;
  slug: string;
  publicTitle: string;
  publicDescription: string;
  heroEyebrow: string;
  heroHeadline: string;
  heroSubheadline: string;
  startsAt: string;
  endsAt: string;
  timezone: string;
  discountValue: string;
  status: CampaignStatus;
  couponMode: 'automatic' | 'code' | 'both';
  couponCode: string;
  termsAndConditions: string;
  ctaPrimaryLabel: string;
}

const EMPTY_FORM: CampaignFormState = {
  name: '',
  slug: '',
  publicTitle: '',
  publicDescription: '',
  heroEyebrow: '',
  heroHeadline: '',
  heroSubheadline: '',
  startsAt: '',
  endsAt: '',
  timezone: 'America/New_York',
  discountValue: '30',
  status: 'draft',
  couponMode: 'automatic',
  couponCode: '',
  termsAndConditions: '',
  ctaPrimaryLabel: 'Start Your Order',
};

function toLocalInputValue(iso: string) {
  const date = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

function statusVariant(status: CampaignStatus) {
  switch (status) {
    case 'active':
      return 'success' as const;
    case 'paused':
    case 'scheduled':
      return 'warning' as const;
    case 'expired':
    case 'archived':
      return 'neutral' as const;
    case 'draft':
      return 'neutral' as const;
    default: {
      const exhaustive: never = status;
      return exhaustive;
    }
  }
}

export function CampaignsManager() {
  const { refreshKey, notifyRefresh } = useWorkspace();
  const [campaigns, setCampaigns] = useState<CampaignListItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<CampaignFormState>(EMPTY_FORM);
  const [formError, setFormError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [analytics, setAnalytics] = useState<Record<string, unknown> | null>(
    null,
  );

  function load() {
    setIsLoading(true);
    apiRequest<ApiResponse<CampaignListItem[]>>('/admin/campaigns')
      .then((response) => setCampaigns(response.data))
      .catch((error: Error) => setErrorMessage(error.message))
      .finally(() => setIsLoading(false));
  }

  useEffect(load, [refreshKey]);

  const publicPreviewUrl = useMemo(() => {
    if (!form.slug.trim()) return '/offer/{slug}';
    return `/offer/${form.slug.trim().toLowerCase()}`;
  }, [form.slug]);

  function openCreate() {
    setEditingId(null);
    setForm(EMPTY_FORM);
    setAnalytics(null);
    setFormError(null);
    setModalOpen(true);
  }

  async function openEdit(campaign: CampaignListItem) {
    setEditingId(campaign.id);
    setFormError(null);
    setBusy(true);
    try {
      const [detail, stats] = await Promise.all([
        apiRequest<ApiResponse<CampaignListItem & CampaignFormState>>(
          `/admin/campaigns/${campaign.id}`,
        ),
        apiRequest<ApiResponse<Record<string, unknown>>>(
          `/admin/campaigns/${campaign.id}/analytics`,
        ),
      ]);
      const data = detail.data;
      setForm({
        name: data.name,
        slug: data.slug,
        publicTitle: data.publicTitle,
        publicDescription: (data as { publicDescription?: string })
          .publicDescription ?? '',
        heroEyebrow: (data as { heroEyebrow?: string | null }).heroEyebrow ?? '',
        heroHeadline:
          (data as { heroHeadline?: string | null }).heroHeadline ?? '',
        heroSubheadline:
          (data as { heroSubheadline?: string | null }).heroSubheadline ?? '',
        startsAt: toLocalInputValue(data.startsAt),
        endsAt: toLocalInputValue(data.endsAt),
        timezone: data.timezone,
        discountValue: String(data.discountValue),
        status: data.status,
        couponMode:
          (data as { couponMode?: 'automatic' | 'code' | 'both' }).couponMode ??
          'automatic',
        couponCode: (data as { couponCode?: string | null }).couponCode ?? '',
        termsAndConditions:
          (data as { termsAndConditions?: string | null })
            .termsAndConditions ?? '',
        ctaPrimaryLabel:
          (data as { ctaPrimaryLabel?: string | null }).ctaPrimaryLabel ??
          'Start Your Order',
      });
      setAnalytics(stats.data);
      setModalOpen(true);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Load failed');
    } finally {
      setBusy(false);
    }
  }

  async function handleSubmit() {
    if (!form.name.trim() || !form.slug.trim() || !form.publicTitle.trim()) {
      setFormError('Name, slug, and public title are required.');
      return;
    }
    setBusy(true);
    setFormError(null);
    const payload = {
      name: form.name.trim(),
      slug: form.slug.trim().toLowerCase(),
      publicTitle: form.publicTitle.trim(),
      publicDescription: form.publicDescription.trim() || form.publicTitle.trim(),
      heroEyebrow: form.heroEyebrow.trim() || undefined,
      heroHeadline: form.heroHeadline.trim() || undefined,
      heroSubheadline: form.heroSubheadline.trim() || undefined,
      startsAt: new Date(form.startsAt).toISOString(),
      endsAt: new Date(form.endsAt).toISOString(),
      timezone: form.timezone,
      discountType: 'percentage',
      discountValue: Number(form.discountValue),
      status: form.status,
      couponMode: form.couponMode,
      couponCode: form.couponCode.trim() || undefined,
      termsAndConditions: form.termsAndConditions.trim() || undefined,
      ctaPrimaryLabel: form.ctaPrimaryLabel.trim() || undefined,
      brandProfile: 'photophile_nhc',
      isPubliclyVisible: true,
    };

    try {
      if (editingId) {
        await apiRequest(`/admin/campaigns/${editingId}`, {
          method: 'PUT',
          body: JSON.stringify(payload),
        });
      } else {
        await apiRequest('/admin/campaigns', {
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

  async function setStatus(id: string, status: CampaignStatus) {
    setBusy(true);
    try {
      await apiRequest(`/admin/campaigns/${id}/status`, {
        method: 'PATCH',
        body: JSON.stringify({ status }),
      });
      notifyRefresh();
      load();
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Update failed');
    } finally {
      setBusy(false);
    }
  }

  if (isLoading) return <ListSkeleton rows={5} />;
  if (errorMessage) {
    return (
      <ErrorState title="Unable to load campaigns" description={errorMessage} />
    );
  }

  return (
    <div className="space-y-4">
      <Card>
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h3 className="text-sm font-medium text-[var(--foreground)]">
              Offers & Campaigns
            </h3>
            <p className="mt-1 text-xs text-[var(--muted)]">
              Manage public Photophile offer pages. Live URL pattern:{' '}
              <code className="text-[var(--foreground)]">/offer/[slug]</code>
            </p>
          </div>
          <Button onClick={openCreate}>
            <Plus className="h-4 w-4" />
            New campaign
          </Button>
        </div>

        {campaigns.length === 0 ? (
          <p className="text-sm text-[var(--muted)]">
            No campaigns yet. Create one or run{' '}
            <code>npm run seed:black-friday-2026</code> in the API.
          </p>
        ) : (
          <ul className="divide-y divide-[var(--border)]">
            {campaigns.map((campaign) => (
              <li
                key={campaign.id}
                className="flex flex-wrap items-start justify-between gap-3 py-3"
              >
                <div className="min-w-0">
                  <p className="text-sm font-medium text-[var(--foreground)]">
                    {campaign.name}
                  </p>
                  <p className="text-xs text-[var(--muted)]">
                    /offer/{campaign.slug} · {campaign.discountValue}% ·{' '}
                    {campaign._count?.orders ?? 0} orders
                  </p>
                  <p className="mt-1 text-xs text-[var(--muted)]">
                    {new Date(campaign.startsAt).toLocaleString()} →{' '}
                    {new Date(campaign.endsAt).toLocaleString()} (
                    {campaign.timezone})
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <Badge variant={statusVariant(campaign.status)}>
                    {campaign.status}
                  </Badge>
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={() => openEdit(campaign)}
                  >
                    Edit
                  </Button>
                  {campaign.status === 'active' ? (
                    <Button
                      size="sm"
                      variant="secondary"
                      disabled={busy}
                      onClick={() => setStatus(campaign.id, 'paused')}
                    >
                      Pause
                    </Button>
                  ) : null}
                  {campaign.status === 'paused' ||
                  campaign.status === 'draft' ? (
                    <Button
                      size="sm"
                      variant="secondary"
                      disabled={busy}
                      onClick={() => setStatus(campaign.id, 'active')}
                    >
                      Activate
                    </Button>
                  ) : null}
                </div>
              </li>
            ))}
          </ul>
        )}
      </Card>

      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editingId ? 'Edit campaign' : 'New campaign'}
        size="lg"
        footer={
          <ModalActions
            onCancel={() => setModalOpen(false)}
            onSubmit={handleSubmit}
            submitLabel={editingId ? 'Save changes' : 'Create campaign'}
            isSubmitting={busy}
          />
        }
      >
        <div className="grid max-h-[70vh] gap-3 overflow-y-auto sm:grid-cols-2">
          <Input
            label="Internal name"
            value={form.name}
            onChange={(event) =>
              setForm((prev) => ({ ...prev, name: event.target.value }))
            }
          />
          <Input
            label="Slug"
            value={form.slug}
            onChange={(event) =>
              setForm((prev) => ({ ...prev, slug: event.target.value }))
            }
          />
          <Input
            label="Public title"
            value={form.publicTitle}
            onChange={(event) =>
              setForm((prev) => ({ ...prev, publicTitle: event.target.value }))
            }
          />
          <Input
            label="Discount %"
            type="number"
            value={form.discountValue}
            onChange={(event) =>
              setForm((prev) => ({
                ...prev,
                discountValue: event.target.value,
              }))
            }
          />
          <Input
            label="Starts at"
            type="datetime-local"
            value={form.startsAt}
            onChange={(event) =>
              setForm((prev) => ({ ...prev, startsAt: event.target.value }))
            }
          />
          <Input
            label="Ends at"
            type="datetime-local"
            value={form.endsAt}
            onChange={(event) =>
              setForm((prev) => ({ ...prev, endsAt: event.target.value }))
            }
          />
          <TimeZoneSelect
            label="Timezone"
            name="campaignTimezone"
            value={form.timezone}
            onChange={(timezone) =>
              setForm((prev) => ({ ...prev, timezone }))
            }
          />
          <label className="text-sm">
            <span className="mb-1 block text-[var(--muted)]">Status</span>
            <select
              className="w-full rounded-md border border-[var(--border)] bg-[var(--background)] px-3 py-2"
              value={form.status}
              onChange={(event) =>
                setForm((prev) => ({
                  ...prev,
                  status: event.target.value as CampaignStatus,
                }))
              }
            >
              {[
                'draft',
                'scheduled',
                'active',
                'paused',
                'expired',
                'archived',
              ].map((status) => (
                <option key={status} value={status}>
                  {status}
                </option>
              ))}
            </select>
          </label>
          <Input
            label="Hero eyebrow"
            value={form.heroEyebrow}
            onChange={(event) =>
              setForm((prev) => ({ ...prev, heroEyebrow: event.target.value }))
            }
          />
          <Input
            label="Hero headline"
            value={form.heroHeadline}
            onChange={(event) =>
              setForm((prev) => ({
                ...prev,
                heroHeadline: event.target.value,
              }))
            }
          />
          <div className="sm:col-span-2">
            <Input
              label="Hero subheadline"
              value={form.heroSubheadline}
              onChange={(event) =>
                setForm((prev) => ({
                  ...prev,
                  heroSubheadline: event.target.value,
                }))
              }
            />
          </div>
          <div className="sm:col-span-2">
            <label className="text-sm">
              <span className="mb-1 block text-[var(--muted)]">
                Public description
              </span>
              <textarea
                className="min-h-[80px] w-full rounded-md border border-[var(--border)] bg-[var(--background)] px-3 py-2"
                value={form.publicDescription}
                onChange={(event) =>
                  setForm((prev) => ({
                    ...prev,
                    publicDescription: event.target.value,
                  }))
                }
              />
            </label>
          </div>
          <div className="sm:col-span-2">
            <label className="text-sm">
              <span className="mb-1 block text-[var(--muted)]">
                Terms & conditions
              </span>
              <textarea
                className="min-h-[80px] w-full rounded-md border border-[var(--border)] bg-[var(--background)] px-3 py-2"
                value={form.termsAndConditions}
                onChange={(event) =>
                  setForm((prev) => ({
                    ...prev,
                    termsAndConditions: event.target.value,
                  }))
                }
              />
            </label>
          </div>
          <p className="sm:col-span-2 text-xs text-[var(--muted)]">
            Public preview URL:{' '}
            <a
              className="text-[var(--primary)] hover:underline"
              href={publicPreviewUrl}
              target="_blank"
              rel="noreferrer"
            >
              {publicPreviewUrl}
            </a>
          </p>
          {analytics ? (
            <div className="sm:col-span-2 rounded-md border border-[var(--border)] p-3 text-xs text-[var(--muted)]">
              Analytics: {String(analytics.views ?? 0)} views ·{' '}
              {String(analytics.submittedOrders ?? 0)} orders ·{' '}
              {String(analytics.externalOrders ?? 0)} external · conversion{' '}
              {String(analytics.conversionRate ?? 0)}%
            </div>
          ) : null}
          {formError ? (
            <p className="sm:col-span-2 text-sm text-red-600">{formError}</p>
          ) : null}
        </div>
      </Modal>
    </div>
  );
}
