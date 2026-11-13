'use client';

import { useEffect, useState } from 'react';
import { apiRequest } from '@/lib/api-client';
import { ApiResponse } from '@/lib/auth';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';

interface BookingSettings {
  exists: boolean;
  enabled: boolean;
  publicSlug: string | null;
  publicUrl: string | null;
  timezone: string;
  slotDurationMinutes: number;
  bufferMinutes: number;
  minNoticeHours: number;
  maxAdvanceDays: number;
  title: string | null;
  description: string | null;
}

interface BookingSettingsPanelProps {
  clientOrganizationId: string;
}

export function BookingSettingsPanel({
  clientOrganizationId,
}: BookingSettingsPanelProps) {
  const [settings, setSettings] = useState<BookingSettings | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [copied, setCopied] = useState(false);

  async function load() {
    setErrorMessage(null);
    try {
      const response = await apiRequest<ApiResponse<BookingSettings>>(
        `/clients/${clientOrganizationId}/booking-settings`,
      );
      setSettings(response.data);
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : 'Unable to load booking settings',
      );
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
      const response = await apiRequest<ApiResponse<BookingSettings>>(
        `/clients/${clientOrganizationId}/booking-settings/enable`,
        { method: 'POST' },
      );
      setSettings(response.data);
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : 'Unable to enable booking',
      );
    } finally {
      setIsSaving(false);
    }
  }

  async function save(patch: Partial<BookingSettings>) {
    setIsSaving(true);
    setErrorMessage(null);
    try {
      const response = await apiRequest<ApiResponse<BookingSettings>>(
        `/clients/${clientOrganizationId}/booking-settings`,
        {
          method: 'PATCH',
          body: JSON.stringify(patch),
        },
      );
      setSettings(response.data);
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : 'Unable to save settings',
      );
    } finally {
      setIsSaving(false);
    }
  }

  if (!settings) {
    return (
      <Card padding="sm">
        <p className="text-sm text-[var(--muted)]">
          {errorMessage ?? 'Loading public booking settings…'}
        </p>
      </Card>
    );
  }

  return (
    <Card padding="md" className="space-y-4">
      <div>
        <h3 className="text-sm font-semibold text-[var(--foreground)]">
          Public booking link
        </h3>
        <p className="mt-1 text-xs text-[var(--muted)]">
          Share a Colabdeck-branded page so visitors can request studio time.
          Requests need your approval before a calendar event is created.
        </p>
      </div>

      {errorMessage ? (
        <p className="text-xs text-[var(--danger)]">{errorMessage}</p>
      ) : null}

      {!settings.exists || !settings.enabled ? (
        <Button disabled={isSaving} onClick={() => void enable()}>
          Enable public booking
        </Button>
      ) : (
        <>
          <div className="flex flex-wrap items-center gap-2">
            <Input
              label="Share URL"
              value={settings.publicUrl ?? ''}
              readOnly
            />
            <Button
              variant="secondary"
              disabled={!settings.publicUrl}
              onClick={async () => {
                if (!settings.publicUrl) return;
                await navigator.clipboard.writeText(settings.publicUrl);
                setCopied(true);
                window.setTimeout(() => setCopied(false), 1500);
              }}
            >
              {copied ? 'Copied' : 'Copy link'}
            </Button>
            <Button
              variant="secondary"
              disabled={isSaving}
              onClick={() => void save({ enabled: false })}
            >
              Disable
            </Button>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <Input
              label="Public title"
              value={settings.title ?? ''}
              onChange={(event) =>
                setSettings({ ...settings, title: event.target.value })
              }
            />
            <Select
              label="Slot duration (minutes)"
              value={String(settings.slotDurationMinutes)}
              onChange={(event) =>
                setSettings({
                  ...settings,
                  slotDurationMinutes: Number(event.target.value),
                })
              }
              options={[
                { value: '30', label: '30' },
                { value: '60', label: '60' },
                { value: '90', label: '90' },
                { value: '120', label: '120' },
              ]}
            />
            <Input
              label="Buffer (minutes)"
              type="number"
              value={String(settings.bufferMinutes)}
              onChange={(event) =>
                setSettings({
                  ...settings,
                  bufferMinutes: Number(event.target.value),
                })
              }
            />
            <Input
              label="Min notice (hours)"
              type="number"
              value={String(settings.minNoticeHours)}
              onChange={(event) =>
                setSettings({
                  ...settings,
                  minNoticeHours: Number(event.target.value),
                })
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
          <Button
            disabled={isSaving}
            onClick={() =>
              void save({
                title: settings.title,
                description: settings.description,
                slotDurationMinutes: settings.slotDurationMinutes,
                bufferMinutes: settings.bufferMinutes,
                minNoticeHours: settings.minNoticeHours,
              })
            }
          >
            Save settings
          </Button>
        </>
      )}
    </Card>
  );
}
