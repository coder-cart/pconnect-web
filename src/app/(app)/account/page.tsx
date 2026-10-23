'use client';

import { FormEvent, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { PageHeader } from '@/components/ui/PageHeader';
import { Card } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Button } from '@/components/ui/Button';
import { ListSkeleton } from '@/components/ui/Skeleton';
import { ErrorState } from '@/components/ui/StatePanels';
import { UserAvatar } from '@/components/ui/UserAvatar';
import { apiRequest, apiUpload } from '@/lib/api-client';
import { ApiResponse } from '@/lib/auth';
import { useWorkspace } from '@/components/providers/WorkspaceProvider';
import { useNotifications } from '@/components/providers/NotificationProvider';
import { getBrowserTimeZone } from '@/lib/formatMessageDate';
import { getRoleLabel } from '@/lib/navigation';
import { formatTimeZoneLabel, listTimeZoneOptions } from '@/lib/timezones';
import {
  isNotificationSoundMuted,
  setNotificationSoundMuted,
} from '@/lib/notification-sound';

interface ProfileDetails {
  fullName: string;
  email: string;
  phone: string | null;
  jobTitle: string | null;
  bio: string | null;
  avatarUpdatedAt: string | null;
  timeZone: string | null;
}

export default function AccountProfilePage() {
  const { user, refreshUser } = useWorkspace();
  const {
    pushStatus,
    pushBusy,
    enablePush,
    disablePush,
    pushMessage,
  } = useNotifications();
  const [soundMuted, setSoundMuted] = useState(false);
  const [profile, setProfile] = useState<ProfileDetails | null>(null);
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [jobTitle, setJobTitle] = useState('');
  const [bio, setBio] = useState('');
  const [timeZone, setTimeZone] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [savedMessage, setSavedMessage] = useState<string | null>(null);

  const roleLabel = getRoleLabel(user.userType, user.roleCodes);
  const deviceTimeZone = useMemo(() => getBrowserTimeZone(), []);
  const timeZoneOptions = useMemo(() => {
    const zones = listTimeZoneOptions();
    return [
      {
        value: '',
        label: `Use device timezone (${formatTimeZoneLabel(deviceTimeZone)})`,
      },
      ...zones.map((zone) => ({
        value: zone,
        label: formatTimeZoneLabel(zone),
      })),
    ];
  }, [deviceTimeZone]);

  useEffect(() => {
    setSoundMuted(isNotificationSoundMuted());
    apiRequest<ApiResponse<ProfileDetails>>('/users/me')
      .then((response) => {
        setProfile(response.data);
        setFullName(response.data.fullName);
        setPhone(response.data.phone ?? '');
        setJobTitle(response.data.jobTitle ?? '');
        setBio(response.data.bio ?? '');
        setTimeZone(response.data.timeZone ?? '');
      })
      .catch((error: Error) => {
        setErrorMessage(error.message);
      })
      .finally(() => setIsLoading(false));
  }, []);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSaving(true);
    setErrorMessage(null);
    setSavedMessage(null);

    if (fullName.trim().length < 2) {
      setErrorMessage('Name must be at least 2 characters.');
      setIsSaving(false);
      return;
    }
    if (phone.trim() && !/^[0-9+().\-\s]{7,40}$/.test(phone.trim())) {
      setErrorMessage('Enter a valid phone number.');
      setIsSaving(false);
      return;
    }

    try {
      const response = await apiRequest<ApiResponse<ProfileDetails>>('/users/me', {
        method: 'PATCH',
        body: JSON.stringify({
          fullName,
          phone,
          jobTitle,
          bio,
          timeZone: timeZone.trim() ? timeZone.trim() : null,
        }),
      });
      setProfile(response.data);
      setFullName(response.data.fullName);
      setPhone(response.data.phone ?? '');
      setJobTitle(response.data.jobTitle ?? '');
      setBio(response.data.bio ?? '');
      setTimeZone(response.data.timeZone ?? '');
      await refreshUser();
      setSavedMessage('Profile saved.');
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : 'Unable to save profile',
      );
    } finally {
      setIsSaving(false);
    }
  }

  async function handlePhoto(file: File | undefined) {
    if (!file) {
      return;
    }

    setErrorMessage(null);
    setSavedMessage(null);

    if (file.size > 2 * 1024 * 1024) {
      setErrorMessage('Profile photo must be 2 MB or smaller.');
      return;
    }

    const formData = new FormData();
    formData.append('file', file);
    setIsUploading(true);

    try {
      const response = await apiUpload<ApiResponse<ProfileDetails>>(
        '/users/me/avatar',
        formData,
      );
      setProfile(response.data);
      await refreshUser();
      setSavedMessage('Profile photo updated.');
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : 'Unable to upload photo',
      );
    } finally {
      setIsUploading(false);
    }
  }

  async function handleRemovePhoto() {
    setIsUploading(true);
    setErrorMessage(null);
    setSavedMessage(null);

    try {
      const response = await apiRequest<ApiResponse<ProfileDetails>>(
        '/users/me/avatar',
        { method: 'DELETE' },
      );
      setProfile(response.data);
      await refreshUser();
      setSavedMessage('Profile photo removed.');
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : 'Unable to remove photo',
      );
    } finally {
      setIsUploading(false);
    }
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <PageHeader
        title="My Profile"
        description="Update your photo, name, and job title. Your role, permissions, and sign-in email stay managed by an admin."
      />

      {isLoading ? <ListSkeleton rows={4} /> : null}

      {!isLoading && errorMessage && !profile ? (
        <ErrorState title="Unable to load profile" description={errorMessage} />
      ) : null}

      {!isLoading && profile ? (
        <Card>
          <div className="flex flex-col gap-6 sm:flex-row sm:items-start">
            <UserAvatar
              user={{
                id: user.id,
                fullName: profile.fullName,
                avatarUpdatedAt: user.avatarUpdatedAt ?? profile.avatarUpdatedAt,
              }}
              size="lg"
              className="h-16 w-16 text-lg"
            />
            <div className="space-y-3">
              <div>
                <p className="text-sm font-medium text-[var(--foreground)]">
                  Profile photo
                </p>
                <p className="mt-1 text-sm text-[var(--muted)]">
                  JPEG, PNG, WebP, or GIF. 2 MB maximum.
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                <label className="inline-flex min-h-touch cursor-pointer items-center rounded-[var(--radius-md)] bg-[var(--primary)] px-4 text-sm text-[var(--primary-foreground)] sm:h-10 sm:min-h-10">
                  {isUploading ? 'Working...' : 'Upload photo'}
                  <input
                    type="file"
                    accept="image/jpeg,image/png,image/webp,image/gif"
                    className="sr-only"
                    disabled={isUploading}
                    onChange={(event) => {
                      const file = event.target.files?.[0];
                      event.target.value = '';
                      void handlePhoto(file);
                    }}
                  />
                </label>
                {user.avatarUpdatedAt || profile.avatarUpdatedAt ? (
                  <Button
                    type="button"
                    variant="secondary"
                    disabled={isUploading}
                    onClick={() => void handleRemovePhoto()}
                  >
                    Remove photo
                  </Button>
                ) : null}
              </div>
            </div>
          </div>

          <form className="mt-6 space-y-4" onSubmit={handleSubmit}>
            <Input
              label="Name"
              name="fullName"
              value={fullName}
              onChange={(event) => setFullName(event.target.value)}
              minLength={2}
              maxLength={120}
              required
            />
            <Input
              label="Email"
              name="email"
              value={profile.email}
              disabled
              hint="This is the address you use to sign in."
            />
            <Input
              label="Role"
              name="role"
              value={roleLabel}
              disabled
            />
            <Input
              label="Phone"
              name="phone"
              value={phone}
              onChange={(event) => setPhone(event.target.value)}
              maxLength={40}
              autoComplete="tel"
            />
            <Input
              label="Designation"
              name="jobTitle"
              value={jobTitle}
              onChange={(event) => setJobTitle(event.target.value)}
              maxLength={80}
            />
            <Select
              label="Time zone"
              name="timeZone"
              value={timeZone}
              onChange={(event) => setTimeZone(event.target.value)}
              options={timeZoneOptions}
            />
            <p className="text-xs text-[var(--muted)]">
              Chat timestamps use this zone. Leave on device timezone to follow
              your computer
              {user.userType === 'external'
                ? ', or your client organization timezone when set.'
                : '.'}
            </p>
            <label className="block space-y-1.5">
              <span className="text-sm font-medium text-[var(--foreground)]">
                About
              </span>
              <textarea
                name="bio"
                value={bio}
                onChange={(event) => setBio(event.target.value)}
                maxLength={500}
                rows={4}
                className="w-full rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-sm text-[var(--foreground)] placeholder:text-[var(--muted)] focus:border-[var(--primary)] focus:outline-none focus:ring-2 focus:ring-[var(--primary-soft)]"
                placeholder="A short note about your work"
              />
            </label>

            {savedMessage ? (
              <p className="text-sm text-[var(--success)]">{savedMessage}</p>
            ) : null}
            {errorMessage ? (
              <p className="text-sm text-[var(--danger)]">{errorMessage}</p>
            ) : null}

            <div className="flex flex-wrap gap-2">
              <Button type="submit" disabled={isSaving}>
                {isSaving ? 'Saving...' : 'Save profile'}
              </Button>
              <Link
                href="/account/password"
                className="inline-flex h-10 items-center rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--surface)] px-4 text-sm text-[var(--foreground)] hover:bg-[var(--surface-muted)]"
              >
                Change password
              </Link>
            </div>
          </form>
        </Card>
      ) : null}

      {!isLoading && profile ? (
        <Card className="mt-4 space-y-3">
          <h2 className="text-sm font-semibold text-[var(--foreground)]">
            Notifications
          </h2>
          <p className="text-sm text-[var(--muted)]">
            Device alerts use your browser permission on each device separately
            (phone and laptop each need Enable once). On Windows, alerts appear
            as a bottom-right Chrome/Edge toast or in the notification center —
            not as an Android lock-screen card. Keep Colabdeck minimized when
            testing so the banner is not suppressed.
          </p>
          <div className="flex flex-wrap items-center gap-2">
            {pushStatus === 'unsupported' ? (
              <p className="text-sm text-[var(--muted)]">
                This browser does not support device alerts.
              </p>
            ) : pushStatus === 'denied' ? (
              <p className="text-sm text-[var(--muted)]">
                Notifications are blocked in browser settings. Allow them for
                this site, then refresh and try again.
              </p>
            ) : (
              <Button
                size="sm"
                variant={pushStatus === 'on' ? 'secondary' : 'primary'}
                disabled={pushBusy}
                onClick={() =>
                  void (pushStatus === 'on' ? disablePush() : enablePush())
                }
              >
                {pushBusy
                  ? 'Working…'
                  : pushStatus === 'on'
                    ? 'Turn device alerts off'
                    : 'Enable device alerts'}
              </Button>
            )}
            <Button
              size="sm"
              variant="secondary"
              onClick={() => {
                const next = !soundMuted;
                setNotificationSoundMuted(next);
                setSoundMuted(next);
              }}
            >
              {soundMuted ? 'Unmute notification sound' : 'Mute notification sound'}
            </Button>
          </div>
          {pushMessage ? (
            <p className="text-xs text-[var(--muted)]">{pushMessage}</p>
          ) : null}
        </Card>
      ) : null}
    </div>
  );
}
