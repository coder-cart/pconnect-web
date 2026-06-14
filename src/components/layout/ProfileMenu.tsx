'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { Bell, LogOut, Settings, UserRound } from 'lucide-react';
import { AuthenticatedUser } from '@/lib/auth';
import { Avatar } from '@/components/ui/Avatar';
import { getRoleLabel } from '@/lib/navigation';
import { apiRequest } from '@/lib/api-client';
import { ApiResponse } from '@/lib/auth';
import {
  DropdownMenu,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from '@/components/ui/DropdownMenu';
import { cn } from '@/lib/cn';

interface ProfileMenuProps {
  user: AuthenticatedUser;
  onLogout: () => void;
}

interface UserProfileState {
  statusText?: string | null;
  statusEmoji?: string | null;
  presenceStatus?: 'active' | 'away';
  notificationsPaused?: boolean;
}

export function ProfileMenu({ user, onLogout }: ProfileMenuProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const [profile, setProfile] = useState<UserProfileState>({});
  const [statusDraft, setStatusDraft] = useState('');
  const roleLabel = getRoleLabel(user.userType, user.roleCodes);

  useEffect(() => {
    apiRequest<ApiResponse<UserProfileState>>('/users/me')
      .then((response) => {
        setProfile(response.data);
        setStatusDraft(
          [response.data.statusEmoji, response.data.statusText]
            .filter(Boolean)
            .join(' ')
            .trim(),
        );
      })
      .catch(() => undefined);
  }, []);

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

  async function saveStatus(value: string) {
    const trimmed = value.trim();
    const emojiMatch = trimmed.match(/^(\p{Extended_Pictographic})/u);
    const statusEmoji = emojiMatch?.[0] ?? undefined;
    const statusText = emojiMatch
      ? trimmed.slice(emojiMatch[0].length).trim()
      : trimmed;

    const response = await apiRequest<ApiResponse<UserProfileState>>(
      '/users/me',
      {
        method: 'PATCH',
        body: JSON.stringify({ statusEmoji, statusText }),
      },
    );
    setProfile(response.data);
  }

  async function toggleAway() {
    const next = profile.presenceStatus === 'away' ? 'active' : 'away';
    const response = await apiRequest<ApiResponse<UserProfileState>>(
      '/users/me',
      {
        method: 'PATCH',
        body: JSON.stringify({ presenceStatus: next }),
      },
    );
    setProfile(response.data);
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

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        className="hidden items-center gap-2 rounded-[var(--radius-md)] border border-[var(--border)] px-2 py-1.5 transition-colors hover:bg-[var(--surface-muted)] sm:flex"
        aria-label="Open profile menu"
        aria-expanded={open}
      >
        <div className="relative">
          <Avatar name={user.fullName} size="sm" />
          <span
            className={cn(
              'absolute bottom-0 right-0 h-2.5 w-2.5 rounded-full border-2 border-[var(--surface)]',
              profile.presenceStatus === 'away'
                ? 'bg-[var(--muted)]'
                : 'bg-[var(--success)]',
            )}
          />
        </div>
        <div className="hidden text-left md:block">
          <p className="text-xs font-medium text-[var(--foreground)]">
            {user.fullName}
          </p>
          <p className="text-[10px] text-[var(--muted)]">{roleLabel}</p>
        </div>
      </button>

      {open ? (
        <div className="absolute right-0 top-[calc(100%+8px)] z-30 w-72 rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--surface)] p-3 shadow-[var(--shadow-md)]">
          <div className="flex items-center gap-3 border-b border-[var(--border)] pb-3">
            <Avatar name={user.fullName} size="md" />
            <div>
              <p className="text-sm font-semibold text-[var(--foreground)]">
                {user.fullName}
              </p>
              <p className="text-xs capitalize text-[var(--muted)]">
                {profile.presenceStatus === 'away' ? 'Away' : 'Active'}
              </p>
            </div>
          </div>

          <div className="py-3">
            <input
              value={statusDraft}
              onChange={(event) => setStatusDraft(event.target.value)}
              onBlur={() => void saveStatus(statusDraft)}
              placeholder="Update your status"
              className="h-10 w-full rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--surface-muted)] px-3 text-sm outline-none focus:border-[var(--primary)]"
            />
          </div>

          <div className="space-y-1 border-b border-[var(--border)] pb-2">
            <button
              type="button"
              onClick={() => void toggleAway()}
              className="w-full rounded-[var(--radius-md)] px-3 py-2 text-left text-sm hover:bg-[var(--surface-muted)]"
            >
              {profile.presenceStatus === 'away'
                ? 'Set yourself as active'
                : 'Set yourself as away'}
            </button>
            <DropdownMenu
              trigger={
                <button
                  type="button"
                  className="flex w-full items-center justify-between rounded-[var(--radius-md)] px-3 py-2 text-left text-sm hover:bg-[var(--surface-muted)]"
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
            <MenuLink href="/dashboard" icon={UserRound} onNavigate={() => setOpen(false)}>
              Profile
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
