'use client';

import { useEffect, useMemo, useState } from 'react';
import { apiRequest, apiUpload } from '@/lib/api-client';
import { ApiResponse } from '@/lib/auth';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';

type PublishStatus = 'draft' | 'published' | 'unpublished';

interface BookingBlackout {
  id: string;
  startsOn: string;
  endsOn: string;
  reason: string | null;
}

interface PublicBookingSettings {
  exists: boolean;
  enabled: boolean;
  publishStatus: PublishStatus;
  publicSlug: string | null;
  publicUrl: string | null;
  timezone: string;
  title: string | null;
  description: string | null;
  primaryColor: string | null;
  secondaryColor: string | null;
  backgroundColor: string | null;
  hasBanner: boolean;
  bannerUpdatedAt: string | null;
  contact: Record<string, string | undefined>;
  social: Record<string, string | undefined>;
  embedSnippet: string;
}

interface PublicBookingSettingsPanelProps {
  clientOrganizationId: string;
  onSettingsChanged?: (settings: PublicBookingSettings) => void;
}

const PUBLISH_OPTIONS = [
  { value: 'draft', label: 'Draft (not public)' },
  { value: 'published', label: 'Published' },
  { value: 'unpublished', label: 'Unpublished (hidden)' },
];

const EMBED_PRESETS = [
  { id: 'compact', label: 'Compact', width: '100%', height: '560' },
  { id: 'standard', label: 'Standard', width: '100%', height: '750' },
  { id: 'tall', label: 'Tall', width: '100%', height: '900' },
] as const;

export function PublicBookingSettingsPanel({
  clientOrganizationId,
  onSettingsChanged,
}: PublicBookingSettingsPanelProps) {
  const [settings, setSettings] = useState<PublicBookingSettings | null>(null);
  const [blackouts, setBlackouts] = useState<BookingBlackout[]>([]);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);
  const [copiedEmbed, setCopiedEmbed] = useState(false);
  const [slugDraft, setSlugDraft] = useState('');
  const [blackoutStart, setBlackoutStart] = useState('');
  const [blackoutEnd, setBlackoutEnd] = useState('');
  const [blackoutReason, setBlackoutReason] = useState('');
  const [embedPreset, setEmbedPreset] =
    useState<(typeof EMBED_PRESETS)[number]['id']>('standard');

  async function load() {
    setIsLoading(true);
    setErrorMessage(null);
    try {
      const [settingsResponse, blackoutsResponse] = await Promise.all([
        apiRequest<ApiResponse<PublicBookingSettings>>(
          `/clients/${clientOrganizationId}/booking-settings`,
        ),
        apiRequest<ApiResponse<{ items: BookingBlackout[] }>>(
          `/clients/${clientOrganizationId}/booking-blackouts`,
        ).catch(() => ({ data: { items: [] as BookingBlackout[] } })),
      ]);
      const data = {
        ...settingsResponse.data,
        publishStatus: settingsResponse.data.publishStatus ?? 'draft',
        contact: settingsResponse.data.contact ?? {},
        social: settingsResponse.data.social ?? {},
        embedSnippet: settingsResponse.data.embedSnippet ?? '',
        hasBanner: Boolean(settingsResponse.data.hasBanner),
      };
      setSettings(data);
      setSlugDraft(data.publicSlug ?? '');
      setBlackouts(blackoutsResponse.data.items ?? []);
      onSettingsChanged?.(data);
    } catch (error) {
      setSettings(null);
      setErrorMessage(
        error instanceof Error
          ? error.message
          : 'Unable to load booking settings',
      );
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clientOrganizationId]);

  async function enable() {
    setIsSaving(true);
    setErrorMessage(null);
    try {
      const response = await apiRequest<ApiResponse<PublicBookingSettings>>(
        `/clients/${clientOrganizationId}/booking-settings/enable`,
        { method: 'POST' },
      );
      const data = {
        ...response.data,
        publishStatus: response.data.publishStatus ?? 'published',
        contact: response.data.contact ?? {},
        social: response.data.social ?? {},
        embedSnippet: response.data.embedSnippet ?? '',
        hasBanner: Boolean(response.data.hasBanner),
      };
      setSettings(data);
      setSlugDraft(data.publicSlug ?? '');
      onSettingsChanged?.(data);
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : 'Unable to enable booking',
      );
    } finally {
      setIsSaving(false);
    }
  }

  async function save(patch: Record<string, unknown>) {
    setIsSaving(true);
    setErrorMessage(null);
    try {
      const response = await apiRequest<ApiResponse<PublicBookingSettings>>(
        `/clients/${clientOrganizationId}/booking-settings`,
        {
          method: 'PATCH',
          body: JSON.stringify(patch),
        },
      );
      const data = {
        ...response.data,
        publishStatus: response.data.publishStatus ?? 'draft',
        contact: response.data.contact ?? {},
        social: response.data.social ?? {},
        embedSnippet: response.data.embedSnippet ?? '',
        hasBanner: Boolean(response.data.hasBanner),
      };
      setSettings(data);
      setSlugDraft(data.publicSlug ?? '');
      onSettingsChanged?.(data);
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : 'Unable to save settings',
      );
    } finally {
      setIsSaving(false);
    }
  }

  async function uploadBanner(file: File) {
    setIsSaving(true);
    setErrorMessage(null);
    try {
      const formData = new FormData();
      formData.append('file', file);
      const response = await apiUpload<ApiResponse<PublicBookingSettings>>(
        `/clients/${clientOrganizationId}/booking-settings/banner`,
        formData,
      );
      const data = {
        ...response.data,
        publishStatus: response.data.publishStatus ?? 'draft',
        contact: response.data.contact ?? {},
        social: response.data.social ?? {},
        embedSnippet: response.data.embedSnippet ?? '',
        hasBanner: Boolean(response.data.hasBanner),
      };
      setSettings(data);
      onSettingsChanged?.(data);
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : 'Unable to upload banner',
      );
    } finally {
      setIsSaving(false);
    }
  }

  async function removeBanner() {
    setIsSaving(true);
    setErrorMessage(null);
    try {
      const response = await apiRequest<ApiResponse<PublicBookingSettings>>(
        `/clients/${clientOrganizationId}/booking-settings/banner`,
        { method: 'DELETE' },
      );
      const data = {
        ...response.data,
        publishStatus: response.data.publishStatus ?? 'draft',
        contact: response.data.contact ?? {},
        social: response.data.social ?? {},
        embedSnippet: response.data.embedSnippet ?? '',
        hasBanner: Boolean(response.data.hasBanner),
      };
      setSettings(data);
      onSettingsChanged?.(data);
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : 'Unable to remove banner',
      );
    } finally {
      setIsSaving(false);
    }
  }

  async function addBlackout() {
    if (!blackoutStart || !blackoutEnd) return;
    setIsSaving(true);
    setErrorMessage(null);
    try {
      await apiRequest(`/clients/${clientOrganizationId}/booking-blackouts`, {
        method: 'POST',
        body: JSON.stringify({
          startsOn: blackoutStart,
          endsOn: blackoutEnd,
          reason: blackoutReason || undefined,
        }),
      });
      setBlackoutStart('');
      setBlackoutEnd('');
      setBlackoutReason('');
      const response = await apiRequest<
        ApiResponse<{ items: BookingBlackout[] }>
      >(`/clients/${clientOrganizationId}/booking-blackouts`);
      setBlackouts(response.data.items ?? []);
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : 'Unable to add holiday',
      );
    } finally {
      setIsSaving(false);
    }
  }

  async function removeBlackout(blackoutId: string) {
    setIsSaving(true);
    setErrorMessage(null);
    try {
      await apiRequest(
        `/clients/${clientOrganizationId}/booking-blackouts/${blackoutId}`,
        { method: 'DELETE' },
      );
      setBlackouts((current) =>
        current.filter((item) => item.id !== blackoutId),
      );
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : 'Unable to remove holiday',
      );
    } finally {
      setIsSaving(false);
    }
  }

  const embedCode = useMemo(() => {
    if (!settings?.publicUrl) return '';
    const preset =
      EMBED_PRESETS.find((item) => item.id === embedPreset) ?? EMBED_PRESETS[1];
    return `<iframe src="${settings.publicUrl}?embed=1" width="${preset.width}" height="${preset.height}" style="border:0;border-radius:12px;" loading="lazy" title="Book online"></iframe>`;
  }, [settings?.publicUrl, embedPreset]);

  if (isLoading) {
    return (
      <Card padding="sm">
        <p className="text-sm text-[var(--muted)]">
          Loading public booking settings…
        </p>
      </Card>
    );
  }

  if (!settings) {
    return (
      <Card padding="sm" className="space-y-3">
        <p className="text-sm text-[var(--danger)]">
          {errorMessage ?? 'Unable to load booking settings'}
        </p>
        <Button size="sm" variant="secondary" onClick={() => void load()}>
          Retry
        </Button>
      </Card>
    );
  }

  return (
    <Card padding="md" className="space-y-5">
      <div>
        <h3 className="text-sm font-semibold text-[var(--foreground)]">
          Public booking settings
        </h3>
        <p className="mt-1 text-xs text-[var(--muted)]">
          Share a branded page, embed it on your website, and control holidays.
          Guests request time; you confirm from Projects.
        </p>
      </div>

      {errorMessage ? (
        <p className="text-xs text-[var(--danger)]">{errorMessage}</p>
      ) : null}

      {!settings.exists || !settings.enabled ? (
        <div className="space-y-3">
          <Button disabled={isSaving} onClick={() => void enable()}>
            {settings.exists
              ? 'Re-enable public booking'
              : 'Enable public booking'}
          </Button>
        </div>
      ) : (
        <>
          <div className="space-y-2">
            <Input label="Share URL" value={settings.publicUrl ?? ''} readOnly />
            <div className="flex flex-wrap gap-2">
              <Button
                size="sm"
                variant="secondary"
                disabled={!settings.publicUrl}
                onClick={async () => {
                  if (!settings.publicUrl) return;
                  await navigator.clipboard.writeText(settings.publicUrl);
                  setCopiedLink(true);
                  window.setTimeout(() => setCopiedLink(false), 1500);
                }}
              >
                {copiedLink ? 'Copied' : 'Copy link'}
              </Button>
              <Button
                size="sm"
                variant="secondary"
                disabled={!settings.publicUrl}
                onClick={() => {
                  if (settings.publicUrl) {
                    window.open(
                      settings.publicUrl,
                      '_blank',
                      'noopener,noreferrer',
                    );
                  }
                }}
              >
                Open
              </Button>
              <Button
                size="sm"
                variant="ghost"
                disabled={isSaving}
                onClick={() => void save({ enabled: false })}
              >
                Disable
              </Button>
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <Input
              label="URL slug"
              value={slugDraft}
              onChange={(event) =>
                setSlugDraft(
                  event.target.value
                    .toLowerCase()
                    .replace(/[^a-z0-9-]/g, '-'),
                )
              }
            />
            <Select
              label="Publish status"
              value={settings.publishStatus}
              onChange={(event) =>
                setSettings({
                  ...settings,
                  publishStatus: event.target.value as PublishStatus,
                })
              }
              options={PUBLISH_OPTIONS}
            />
            <Input
              label="Public title"
              value={settings.title ?? ''}
              onChange={(event) =>
                setSettings({ ...settings, title: event.target.value })
              }
            />
            <Input
              label="Timezone"
              value={settings.timezone}
              onChange={(event) =>
                setSettings({ ...settings, timezone: event.target.value })
              }
            />
          </div>

          <label className="block space-y-1.5">
            <span className="text-sm font-medium text-[var(--foreground)]">
              Public description
            </span>
            <textarea
              className="w-full rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-sm"
              rows={3}
              value={settings.description ?? ''}
              onChange={(event) =>
                setSettings({ ...settings, description: event.target.value })
              }
            />
          </label>

          <div className="space-y-2">
            <h4 className="text-sm font-semibold text-[var(--foreground)]">
              Branding
            </h4>
            <div className="grid gap-3 sm:grid-cols-3">
              <Input
                label="Primary color"
                type="color"
                value={settings.primaryColor || '#4b3fe0'}
                onChange={(event) =>
                  setSettings({
                    ...settings,
                    primaryColor: event.target.value,
                  })
                }
              />
              <Input
                label="Secondary color"
                type="color"
                value={settings.secondaryColor || '#ecebfd'}
                onChange={(event) =>
                  setSettings({
                    ...settings,
                    secondaryColor: event.target.value,
                  })
                }
              />
              <Input
                label="Background"
                type="color"
                value={settings.backgroundColor || '#f5f5fb'}
                onChange={(event) =>
                  setSettings({
                    ...settings,
                    backgroundColor: event.target.value,
                  })
                }
              />
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <label className="inline-flex cursor-pointer items-center gap-2 text-sm">
                <span className="rounded-[var(--radius-md)] border border-[var(--border)] px-3 py-1.5">
                  Upload banner
                </span>
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp,image/gif"
                  className="sr-only"
                  disabled={isSaving}
                  onChange={(event) => {
                    const file = event.target.files?.[0];
                    if (file) void uploadBanner(file);
                    event.target.value = '';
                  }}
                />
              </label>
              {settings.hasBanner ? (
                <Button
                  size="sm"
                  variant="ghost"
                  disabled={isSaving}
                  onClick={() => void removeBanner()}
                >
                  Remove banner
                </Button>
              ) : (
                <span className="text-xs text-[var(--muted)]">
                  Logo comes from the client company profile.
                </span>
              )}
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <Input
              label="Contact email"
              value={settings.contact.email ?? ''}
              onChange={(event) =>
                setSettings({
                  ...settings,
                  contact: { ...settings.contact, email: event.target.value },
                })
              }
            />
            <Input
              label="Contact phone"
              value={settings.contact.phone ?? ''}
              onChange={(event) =>
                setSettings({
                  ...settings,
                  contact: { ...settings.contact, phone: event.target.value },
                })
              }
            />
            <Input
              label="Instagram"
              value={settings.social.instagram ?? ''}
              onChange={(event) =>
                setSettings({
                  ...settings,
                  social: { ...settings.social, instagram: event.target.value },
                })
              }
            />
            <Input
              label="Website"
              value={settings.social.website ?? ''}
              onChange={(event) =>
                setSettings({
                  ...settings,
                  social: { ...settings.social, website: event.target.value },
                })
              }
            />
          </div>

          <div className="space-y-2">
            <h4 className="text-sm font-semibold text-[var(--foreground)]">
              Holidays / blackouts
            </h4>
            <p className="text-xs text-[var(--muted)]">
              Dates in these ranges will not show open slots on the public page.
            </p>
            <div className="grid gap-2 sm:grid-cols-[1fr_1fr_1fr_auto]">
              <Input
                label="Starts on"
                type="date"
                value={blackoutStart}
                onChange={(event) => setBlackoutStart(event.target.value)}
              />
              <Input
                label="Ends on"
                type="date"
                value={blackoutEnd}
                onChange={(event) => setBlackoutEnd(event.target.value)}
              />
              <Input
                label="Reason"
                value={blackoutReason}
                onChange={(event) => setBlackoutReason(event.target.value)}
              />
              <div className="flex items-end">
                <Button
                  size="sm"
                  variant="secondary"
                  disabled={isSaving || !blackoutStart || !blackoutEnd}
                  onClick={() => void addBlackout()}
                >
                  Add
                </Button>
              </div>
            </div>
            {blackouts.length === 0 ? (
              <p className="text-xs text-[var(--muted)]">No holidays yet.</p>
            ) : (
              <ul className="space-y-2">
                {blackouts.map((item) => (
                  <li
                    key={item.id}
                    className="flex flex-wrap items-center justify-between gap-2 rounded-[var(--radius-md)] bg-[var(--surface-muted)] px-3 py-2 text-sm"
                  >
                    <span>
                      {item.startsOn}
                      {item.endsOn !== item.startsOn
                        ? ` → ${item.endsOn}`
                        : ''}
                      {item.reason ? ` · ${item.reason}` : ''}
                    </span>
                    <Button
                      size="sm"
                      variant="ghost"
                      disabled={isSaving}
                      onClick={() => void removeBlackout(item.id)}
                    >
                      Remove
                    </Button>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="space-y-2">
            <h4 className="text-sm font-semibold text-[var(--foreground)]">
              Website embed
            </h4>
            <p className="text-xs text-[var(--muted)]">
              Paste this iframe into WordPress, Shopify, or any site that allows
              HTML embeds. Use <code>?embed=1</code> for a compact layout.
            </p>
            <Select
              label="Size preset"
              value={embedPreset}
              onChange={(event) =>
                setEmbedPreset(
                  event.target.value as (typeof EMBED_PRESETS)[number]['id'],
                )
              }
              options={EMBED_PRESETS.map((item) => ({
                value: item.id,
                label: `${item.label} (${item.height}px)`,
              }))}
            />
            <textarea
              className="w-full rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--surface)] px-3 py-2 font-mono text-xs"
              rows={3}
              readOnly
              value={embedCode}
            />
            <Button
              size="sm"
              variant="secondary"
              disabled={!embedCode}
              onClick={async () => {
                if (!embedCode) return;
                await navigator.clipboard.writeText(embedCode);
                setCopiedEmbed(true);
                window.setTimeout(() => setCopiedEmbed(false), 1500);
              }}
            >
              {copiedEmbed ? 'Copied embed' : 'Copy embed code'}
            </Button>
          </div>

          <Button
            disabled={isSaving}
            onClick={() =>
              void save({
                publicSlug: slugDraft.trim() || undefined,
                publishStatus: settings.publishStatus,
                title: settings.title,
                description: settings.description,
                timezone: settings.timezone,
                primaryColor: settings.primaryColor,
                secondaryColor: settings.secondaryColor,
                backgroundColor: settings.backgroundColor,
                contact: settings.contact,
                social: settings.social,
              })
            }
          >
            Save public settings
          </Button>
        </>
      )}
    </Card>
  );
}
