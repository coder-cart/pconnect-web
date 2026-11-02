'use client';

import { FormEvent, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import {
  Bell,
  Compass,
  KeyRound,
  LogOut,
  Moon,
  Settings,
  Sun,
  UserRound,
  Volume2,
  VolumeX,
  X,
} from 'lucide-react';
import { AuthenticatedUser } from '@/lib/auth';
import { UserAvatar } from '@/components/ui/UserAvatar';
import { getRoleLabel } from '@/lib/navigation';
import { apiRequest } from '@/lib/api-client';
import { ApiResponse } from '@/lib/auth';
import {
  DropdownMenu,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from '@/components/ui/DropdownMenu';
import { Button } from '@/components/ui/Button';
import { cn } from '@/lib/cn';
import { useProductTour } from '@/components/tour/ProductTourProvider';
import { useTheme } from '@/components/providers/ThemeProvider';
import {
  isNotificationSoundMuted,
  playNotificationSound,
  setNotificationSoundMuted,
  unlockNotificationSound,
} from '@/lib/notification-sound';
import { useRealtime } from '@/components/providers/RealtimeProvider';
import {
  applyPresenceUpdate,
  CUSTOM_STATUS_PRESETS,
  formatCustomStatus,
} from '@/lib/user-presence';

interface ProfileMenuProps {
  user: AuthenticatedUser;
  onLogout: () => void;
  tone?: 'default' | 'shell';
}

interface UserProfileState {
  statusText?: string | null;
  statusEmoji?: string | null;
  presenceStatus?: 'active' | 'away';
  notificationsPaused?: boolean;
}

function formatStatusDraft(profile: UserProfileState) {
  return formatCustomStatus(profile);
}

function parseStatusInput(value: string): {
  statusEmoji: string | null;
  statusText: string | null;
} {
  const trimmed = value.trim();
  if (!trimmed) {
    return { statusEmoji: null, statusText: null };
  }

  const emojiMatch = trimmed.match(/^(\p{Extended_Pictographic}(?:\uFE0F|\u200D\p{Extended_Pictographic})*)/u);
  if (!emojiMatch?.[0]) {
    return { statusEmoji: null, statusText: trimmed };
  }

  const statusEmoji = emojiMatch[0];
  const statusText = trimmed.slice(statusEmoji.length).trim() || null;
  return { statusEmoji, statusText };
}

export function ProfileMenu({ user, onLogout, tone = 'default' }: ProfileMenuProps) {
  const isShell = tone === 'shell';
  const containerRef = useRef<HTMLDivElement>(null);
  const { startTour } = useProductTour();
  const { theme, toggleTheme } = useTheme();
  const { subscribePresenceUpdated } = useRealtime();
  const [open, setOpen] = useState(false);
  const [soundMuted, setSoundMuted] = useState(false);
  const [profile, setProfile] = useState<UserProfileState>({});
  const [statusDraft, setStatusDraft] = useState('');
  const [statusBusy, setStatusBusy] = useState(false);
  const [statusError, setStatusError] = useState<string | null>(null);
  const roleLabel = getRoleLabel(user.userType, user.roleCodes);

  useEffect(() => {
    setSoundMuted(isNotificationSoundMuted());
  }, [open]);

  useEffect(() => {
    apiRequest<ApiResponse<UserProfileState>>('/users/me')
      .then((response) => {
        setProfile(response.data);
        setStatusDraft(formatStatusDraft(response.data));
      })
      .catch(() => undefined);
  }, []);

  useEffect(() => {
    return subscribePresenceUpdated((payload) => {
      if (payload.userId !== user.id) {
        return;
      }
      setProfile((current) => applyPresenceUpdate(current, payload));
      setStatusDraft(
        formatStatusDraft({
          statusEmoji: payload.statusEmoji,
          statusText: payload.statusText,
        }),
      );
    });
  }, [subscribePresenceUpdated, user.id]);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        setOpen(false);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  async function patchProfile(body: Record<string, unknown>) {
    setStatusBusy(true);
    setStatusError(null);
    try {
      const response = await apiRequest<ApiResponse<UserProfileState>>(
        '/users/me',
        {
          method: 'PATCH',
          body: JSON.stringify(body),
        },
      );
      setProfile(response.data);
      setStatusDraft(formatStatusDraft(response.data));
      return response.data;
    } catch (error) {
      setStatusError(
        error instanceof Error ? error.message : 'Unable to update status',
      );
      throw error;
    } finally {
      setStatusBusy(false);
    }
  }

  async function saveCustomStatus(event?: FormEvent) {
    event?.preventDefault();
    const { statusEmoji, statusText } = parseStatusInput(statusDraft);
    try {
      await patchProfile({ statusEmoji, statusText });
    } catch {
      // error already set
    }
  }

  async function applyPreset(preset: { emoji: string; text: string }) {
    try {
      await patchProfile({
        statusEmoji: preset.emoji,
        statusText: preset.text,
      });
    } catch {
      // error already set
    }
  }

  async function clearStatus() {
    try {
      await patchProfile({ statusEmoji: null, statusText: null });
    } catch {
      // error already set
    }
  }

  async function toggleAway() {
    const next = profile.presenceStatus === 'away' ? 'active' : 'away';
    try {
      await patchProfile({ presenceStatus: next });
    } catch {
      // error already set
    }
  }

  function toggleSound() {
    const next = !soundMuted;
    setSoundMuted(next);
    setNotificationSoundMuted(next);
    if (!next) {
      unlockNotificationSound();
      playNotificationSound();
    }
  }

  async function toggleNotificationsPaused() {
    const response = await apiRequest<ApiResponse<UserProfileState>>(
      '/users/me',
      {
        method: 'PATCH',
        body: JSON.stringify({
          notificationsPaused: !profile.notificationsPaused,
        }),
      },
    );
    setProfile(response.data);
  }

  const hasStatus = Boolean(profile.statusEmoji || profile.statusText);
  const currentStatusLabel = formatStatusDraft(profile) || 'No status set';

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        data-tour="profile-menu"
        onClick={() => setOpen((value) => !value)}
        className={cn(
          'inline-flex min-h-touch min-w-touch max-w-full items-center gap-2 rounded-[var(--radius-md)] border px-1.5 py-1.5 transition-colors focus-visible:outline-none focus-visible:ring-2 lg:min-h-0 lg:min-w-0 lg:px-2',
          isShell
            ? 'border-[var(--shell-border)] hover:bg-[var(--shell-hover)] focus-visible:ring-[var(--shell-focus-ring)]'
            : 'border-[var(--border)] hover:bg-[var(--surface-muted)] focus-visible:ring-[var(--primary-soft)]',
        )}
        aria-label="Open profile menu"
        aria-expanded={open}
      >
        <div className="relative shrink-0">
          <UserAvatar user={user} size="sm" />
          <span
            className={cn(
              'absolute bottom-0 right-0 h-2.5 w-2.5 rounded-full border-2',
              isShell ? 'border-[var(--shell-brand)]' : 'border-[var(--surface)]',
              profile.presenceStatus === 'away'
                ? isShell
                  ? 'bg-[var(--shell-muted)]'
                  : 'bg-[var(--muted)]'
                : 'bg-[var(--success)]',
            )}
          />
        </div>
        <div className="hidden min-w-0 max-w-[9rem] text-left lg:block xl:max-w-[18rem]">
          <p
            className={cn(
              'truncate text-xs font-medium leading-tight',
              isShell ? 'text-white' : 'text-[var(--foreground)]',
            )}
            title={user.fullName}
          >
            {user.fullName}
          </p>
          <p
            className={cn(
              'truncate text-[11px] leading-tight',
              isShell ? 'text-[#e7e9ff]' : 'text-[var(--muted)]',
            )}
            title={hasStatus ? currentStatusLabel : roleLabel}
          >
            {hasStatus ? currentStatusLabel : roleLabel}
          </p>
        </div>
      </button>

      {open ? (
        <div className="shell-overlay-panel shell-menu w-auto overflow-y-auto rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--surface)] p-3 text-[var(--foreground)] shadow-[var(--shadow-md)] lg:w-80">
          <div className="flex items-center gap-3 border-b border-[var(--border)] pb-3">
            <div className="relative shrink-0">
              <UserAvatar user={user} size="md" />
              <span
                className={cn(
                  'absolute bottom-0 right-0 h-2.5 w-2.5 rounded-full border-2 border-[var(--surface)]',
                  profile.presenceStatus === 'away'
                    ? 'bg-[var(--muted)]'
                    : 'bg-[var(--success)]',
                )}
              />
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold text-[var(--foreground)]">
                {user.fullName}
              </p>
              <p className="truncate text-xs capitalize text-[var(--muted)]">
                {profile.presenceStatus === 'away' ? 'Away' : 'Active'}
                {hasStatus ? ` · ${currentStatusLabel}` : ''}
              </p>
            </div>
          </div>

          <div className="space-y-3 border-b border-[var(--border)] py-3">
            <div className="flex items-center justify-between gap-2">
              <p className="text-xs font-semibold uppercase tracking-wide text-[var(--muted)]">
                Status
              </p>
              {hasStatus ? (
                <button
                  type="button"
                  disabled={statusBusy}
                  onClick={() => void clearStatus()}
                  className="inline-flex items-center gap-1 text-xs text-[var(--muted)] hover:text-[var(--foreground)] disabled:opacity-60"
                >
                  <X className="h-3.5 w-3.5" />
                  Clear
                </button>
              ) : null}
            </div>

            <div className="flex flex-wrap gap-1.5">
              {CUSTOM_STATUS_PRESETS.map((preset) => {
                const isActive =
                  profile.statusEmoji === preset.emoji &&
                  profile.statusText === preset.text;
                return (
                  <button
                    key={`${preset.emoji}-${preset.text}`}
                    type="button"
                    disabled={statusBusy}
                    onClick={() => void applyPreset(preset)}
                    className={cn(
                      'max-w-full rounded-full border px-2.5 py-1 text-left text-xs transition-colors disabled:opacity-60',
                      isActive
                        ? 'border-[var(--primary)] bg-[var(--primary-soft)] text-[var(--primary)]'
                        : 'border-[var(--border)] text-[var(--foreground)] hover:bg-[var(--surface-muted)]',
                    )}
                  >
                    <span aria-hidden>{preset.emoji}</span>{' '}
                    <span className="whitespace-normal">{preset.text}</span>
                  </button>
                );
              })}
            </div>

            <form
              className="flex min-w-0 gap-2"
              onSubmit={(event) => void saveCustomStatus(event)}
            >
              <input
                value={statusDraft}
                onChange={(event) => setStatusDraft(event.target.value)}
                placeholder="Custom status…"
                disabled={statusBusy}
                className="h-9 min-w-0 flex-1 rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--surface-muted)] px-3 text-sm text-[var(--foreground)] outline-none placeholder:text-[var(--muted)] focus:border-[var(--primary)] disabled:opacity-60"
              />
              <Button
                type="submit"
                size="sm"
                disabled={statusBusy}
                className="shrink-0"
              >
                Update
              </Button>
            </form>

            {statusError ? (
              <p className="text-xs text-[var(--danger)]">{statusError}</p>
            ) : null}
          </div>

          <div className="space-y-1 border-b border-[var(--border)] py-2 lg:hidden">
            <button
              type="button"
              onClick={toggleTheme}
              className="flex min-h-touch w-full items-center gap-2 rounded-[var(--radius-md)] px-3 py-2 text-left text-sm text-[var(--foreground)] hover:bg-[var(--surface-muted)]"
            >
              {theme === 'light' ? (
                <Moon className="h-4 w-4" />
              ) : (
                <Sun className="h-4 w-4" />
              )}
              {theme === 'light' ? 'Dark theme' : 'Light theme'}
            </button>
            <button
              type="button"
              onClick={toggleSound}
              className="flex min-h-touch w-full items-center gap-2 rounded-[var(--radius-md)] px-3 py-2 text-left text-sm text-[var(--foreground)] hover:bg-[var(--surface-muted)]"
            >
              {soundMuted ? (
                <VolumeX className="h-4 w-4" />
              ) : (
                <Volume2 className="h-4 w-4" />
              )}
              {soundMuted ? 'Unmute notification sound' : 'Mute notification sound'}
            </button>
          </div>

          <div className="space-y-1 border-b border-[var(--border)] py-2">
            <button
              type="button"
              disabled={statusBusy}
              onClick={() => void toggleAway()}
              className="w-full rounded-[var(--radius-md)] px-3 py-2 text-left text-sm text-[var(--foreground)] hover:bg-[var(--surface-muted)] disabled:opacity-60"
            >
              {profile.presenceStatus === 'away'
                ? 'Set yourself as active'
                : 'Set yourself as away'}
            </button>
            <DropdownMenu
              menuClassName="shell-overlay-panel text-[var(--foreground)]"
              trigger={
                <button
                  type="button"
                  className="flex w-full items-center justify-between gap-2 rounded-[var(--radius-md)] px-3 py-2 text-left text-sm text-[var(--foreground)] hover:bg-[var(--surface-muted)]"
                >
                  <span className="inline-flex items-center gap-2">
                    <Bell className="h-4 w-4" />
                    Notifications
                  </span>
                  <span className="text-xs text-[var(--muted)]">
                    {profile.notificationsPaused ? 'Paused' : 'On'}
                  </span>
                </button>
              }
            >
              <DropdownMenuItem onClick={() => void toggleNotificationsPaused()}>
                {profile.notificationsPaused
                  ? 'Resume notifications'
                  : 'Pause notifications'}
              </DropdownMenuItem>
              <DropdownMenuItem>
                <Link href="/inbox">Open inbox</Link>
              </DropdownMenuItem>
            </DropdownMenu>
          </div>

          <div className="space-y-1 py-2">
            <button
              type="button"
              onClick={() => {
                setOpen(false);
                startTour();
              }}
              className="flex w-full items-center gap-2 rounded-[var(--radius-md)] px-3 py-2 text-sm text-[var(--foreground)] hover:bg-[var(--surface-muted)]"
            >
              <Compass className="h-4 w-4" />
              Get started
            </button>
            <MenuLink href="/account" icon={UserRound} onNavigate={() => setOpen(false)}>
              Profile
            </MenuLink>
            <MenuLink
              href="/account/password"
              icon={KeyRound}
              onNavigate={() => setOpen(false)}
            >
              Change password
            </MenuLink>
            {user.permissionCodes.includes('users.manage') ? (
              <MenuLink href="/admin" icon={Settings} onNavigate={() => setOpen(false)}>
                Preferences
              </MenuLink>
            ) : null}
          </div>

          <DropdownMenuSeparator />

          <button
            type="button"
            onClick={() => {
              setOpen(false);
              onLogout();
            }}
            className="mt-2 flex w-full items-center gap-2 rounded-[var(--radius-md)] px-3 py-2 text-sm text-[var(--danger)] hover:bg-[var(--danger-soft)]"
          >
            <LogOut className="h-4 w-4" />
            Sign out
          </button>
        </div>
      ) : null}
    </div>
  );
}

function MenuLink({
  href,
  icon: Icon,
  children,
  onNavigate,
}: {
  href: string;
  icon: typeof UserRound;
  children: React.ReactNode;
  onNavigate: () => void;
}) {
  return (
    <Link
      href={href}
      onClick={onNavigate}
      className="flex items-center gap-2 rounded-[var(--radius-md)] px-3 py-2 text-sm text-[var(--foreground)] hover:bg-[var(--surface-muted)]"
    >
      <Icon className="h-4 w-4" />
      {children}
    </Link>
  );
}
