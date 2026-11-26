'use client';

import { FormEvent, useCallback, useEffect, useState } from 'react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { ListSkeleton } from '@/components/ui/Skeleton';
import { apiRequest } from '@/lib/api-client';
import { ApiResponse } from '@/lib/auth';
import {
  ANNOUNCEMENT_THEME_OPTIONS,
  announcementThemeClass,
  defaultAnimationForTheme,
  fromDatetimeLocalValue,
  toDatetimeLocalValue,
  type PlatformAnnouncement,
  type PlatformAnnouncementTheme,
} from '@/lib/platform-announcements';
import { cn } from '@/lib/cn';

type FormState = {
  title: string;
  body: string;
  signoff: string;
  theme: PlatformAnnouncementTheme;
  startsAtLocal: string;
  endsAtLocal: string;
};

function emptyForm(): FormState {
  const start = new Date();
  start.setMinutes(0, 0, 0);
  const end = new Date(start.getTime() + 24 * 60 * 60 * 1000);
  return {
    title: '',
    body: '',
    signoff: '',
    theme: 'neutral',
    startsAtLocal: toDatetimeLocalValue(start.toISOString()),
    endsAtLocal: toDatetimeLocalValue(end.toISOString()),
  };
}

function formFromItem(item: PlatformAnnouncement): FormState {
  return {
    title: item.title,
    body: item.body,
    signoff: item.signoff ?? '',
    theme: item.theme,
    startsAtLocal: toDatetimeLocalValue(item.startsAt),
    endsAtLocal: toDatetimeLocalValue(item.endsAt),
  };
}

export function PlatformAnnouncementsManager() {
  const [items, setItems] = useState<PlatformAnnouncement[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [showForm, setShowForm] = useState(false);

  const load = useCallback(async () => {
    setIsLoading(true);
    setErrorMessage(null);
    try {
      const response = await apiRequest<
        ApiResponse<{ items: PlatformAnnouncement[] }>
      >('/announcements');
      setItems(response.data.items);
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : 'Unable to load announcements',
      );
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  function openCreate() {
    setEditingId(null);
    setForm(emptyForm());
    setShowForm(true);
    setMessage(null);
    setErrorMessage(null);
  }

  function openEdit(item: PlatformAnnouncement) {
    setEditingId(item.id);
    setForm(formFromItem(item));
    setShowForm(true);
    setMessage(null);
    setErrorMessage(null);
  }

  async function handleSave(event: FormEvent, publishAfter: boolean) {
    event.preventDefault();
    setIsSaving(true);
    setMessage(null);
    setErrorMessage(null);
    try {
      const payload = {
        title: form.title.trim(),
        body: form.body.trim(),
        signoff: form.signoff.trim() || undefined,
        theme: form.theme,
        animation: defaultAnimationForTheme(form.theme),
        startsAt: fromDatetimeLocalValue(form.startsAtLocal),
        endsAt: fromDatetimeLocalValue(form.endsAtLocal),
      };

      let saved: PlatformAnnouncement;
      if (editingId) {
        const response = await apiRequest<ApiResponse<PlatformAnnouncement>>(
          `/announcements/${editingId}`,
          { method: 'PATCH', body: JSON.stringify(payload) },
        );
        saved = response.data;
      } else {
        const response = await apiRequest<ApiResponse<PlatformAnnouncement>>(
          '/announcements',
          { method: 'POST', body: JSON.stringify(payload) },
        );
        saved = response.data;
      }

      if (publishAfter) {
        const published = await apiRequest<ApiResponse<PlatformAnnouncement>>(
          `/announcements/${saved.id}/publish`,
          { method: 'POST', body: '{}' },
        );
        saved = published.data;
      }

      setMessage(
        publishAfter ? 'Announcement published.' : 'Announcement saved as draft.',
      );
      setShowForm(false);
      setEditingId(null);
      await load();
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : 'Unable to save announcement',
      );
    } finally {
      setIsSaving(false);
    }
  }

  async function publish(id: string) {
    setErrorMessage(null);
    try {
      await apiRequest(`/announcements/${id}/publish`, {
        method: 'POST',
        body: '{}',
      });
      setMessage('Announcement published.');
      await load();
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : 'Unable to publish',
      );
    }
  }

  async function archive(id: string) {
    setErrorMessage(null);
    try {
      await apiRequest(`/announcements/${id}/archive`, {
        method: 'POST',
        body: '{}',
      });
      setMessage('Announcement archived.');
      await load();
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : 'Unable to archive',
      );
    }
  }

  return (
    <div className="space-y-4">
      <Card>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h2 className="text-sm font-semibold text-[var(--foreground)]">
              Platform announcements
            </h2>
            <p className="mt-1 text-xs text-[var(--muted)]">
              Festival and workspace banners for all signed-in users. Schedules
              use your browser timezone (Photophile ops often use America/New_York).
            </p>
          </div>
          <Button type="button" size="sm" onClick={openCreate}>
            New announcement
          </Button>
        </div>

        {message ? (
          <p className="mt-3 text-sm text-[var(--success)]">{message}</p>
        ) : null}
        {errorMessage ? (
          <p className="mt-3 text-sm text-[var(--danger)]" role="alert">
            {errorMessage}
          </p>
        ) : null}
      </Card>

      {showForm ? (
        <Card>
          <form
            className="space-y-3"
            onSubmit={(event) => void handleSave(event, false)}
          >
            <p className="text-sm font-medium text-[var(--foreground)]">
              {editingId ? 'Edit announcement' : 'Create announcement'}
            </p>
            <Input
              label="Title"
              value={form.title}
              onChange={(event) =>
                setForm((prev) => ({ ...prev, title: event.target.value }))
              }
              required
              maxLength={160}
            />
            <label className="block space-y-1.5 text-sm">
              <span className="font-medium text-[var(--foreground)]">Body</span>
              <textarea
                className="min-h-24 w-full rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-sm text-[var(--foreground)] outline-none focus-visible:ring-2 focus-visible:ring-[var(--primary)]/30"
                value={form.body}
                onChange={(event) =>
                  setForm((prev) => ({ ...prev, body: event.target.value }))
                }
                required
                maxLength={4000}
              />
            </label>
            <Input
              label="Sign-off (optional)"
              value={form.signoff}
              onChange={(event) =>
                setForm((prev) => ({ ...prev, signoff: event.target.value }))
              }
              maxLength={240}
            />
            <label className="block space-y-1.5 text-sm">
              <span className="font-medium text-[var(--foreground)]">Theme</span>
              <select
                className="w-full rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-sm"
                value={form.theme}
                onChange={(event) =>
                  setForm((prev) => ({
                    ...prev,
                    theme: event.target.value as PlatformAnnouncementTheme,
                  }))
                }
              >
                {ANNOUNCEMENT_THEME_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>
            <div className="grid gap-3 sm:grid-cols-2">
              <Input
                label="Starts"
                type="datetime-local"
                value={form.startsAtLocal}
                onChange={(event) =>
                  setForm((prev) => ({
                    ...prev,
                    startsAtLocal: event.target.value,
                  }))
                }
                required
              />
              <Input
                label="Ends"
                type="datetime-local"
                value={form.endsAtLocal}
                onChange={(event) =>
                  setForm((prev) => ({
                    ...prev,
                    endsAtLocal: event.target.value,
                  }))
                }
                required
              />
            </div>

            <div
              className={cn(
                'seasonal-banner rounded-[var(--radius-md)] border border-[var(--border)] px-3 py-2.5',
                announcementThemeClass(form.theme),
              )}
            >
              <p className="text-xs font-semibold uppercase tracking-wide text-[var(--muted)]">
                Preview
              </p>
              <p className="mt-1 font-semibold text-[var(--foreground)]">
                {form.title || 'Title'}
              </p>
              <p className="mt-0.5 text-sm text-[var(--muted-foreground)]">
                {form.body || 'Body text'}
              </p>
              {form.signoff ? (
                <p className="mt-1 whitespace-pre-line text-xs text-[var(--muted)]">
                  {form.signoff}
                </p>
              ) : null}
            </div>

            <div className="flex flex-wrap gap-2">
              <Button type="submit" size="sm" disabled={isSaving}>
                Save draft
              </Button>
              <Button
                type="button"
                size="sm"
                disabled={isSaving}
                onClick={(event) =>
                  void handleSave(event as unknown as FormEvent, true)
                }
              >
                Save & publish
              </Button>
              <Button
                type="button"
                size="sm"
                variant="ghost"
                disabled={isSaving}
                onClick={() => {
                  setShowForm(false);
                  setEditingId(null);
                }}
              >
                Cancel
              </Button>
            </div>
          </form>
        </Card>
      ) : null}

      <Card padding="none" className="overflow-hidden">
        {isLoading ? <ListSkeleton rows={4} /> : null}
        {!isLoading && items.length === 0 ? (
          <p className="px-4 py-6 text-sm text-[var(--muted)]">
            No announcements yet. Create one for festivals or workspace notices.
          </p>
        ) : null}
        {!isLoading && items.length > 0 ? (
          <ul className="divide-y divide-[var(--border)]">
            {items.map((item) => (
              <li key={item.id} className="px-4 py-3">
                <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-[var(--foreground)]">
                      {item.title}
                    </p>
                    <p className="mt-0.5 text-xs text-[var(--muted)]">
                      {item.theme} · {item.status} ·{' '}
                      {new Date(item.startsAt).toLocaleString()} →{' '}
                      {new Date(item.endsAt).toLocaleString()}
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Button
                      type="button"
                      size="sm"
                      variant="secondary"
                      onClick={() => openEdit(item)}
                    >
                      Edit
                    </Button>
                    {item.status !== 'published' && item.status !== 'archived' ? (
                      <Button
                        type="button"
                        size="sm"
                        onClick={() => void publish(item.id)}
                      >
                        Publish
                      </Button>
                    ) : null}
                    {item.status !== 'archived' ? (
                      <Button
                        type="button"
                        size="sm"
                        variant="ghost"
                        onClick={() => void archive(item.id)}
                      >
                        Archive
                      </Button>
                    ) : null}
                  </div>
                </div>
              </li>
            ))}
          </ul>
        ) : null}
      </Card>
    </div>
  );
}
