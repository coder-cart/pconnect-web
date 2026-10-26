'use client';

import { ReactNode, useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Bell,
  BellRing,
  Building2,
  Volume2,
  VolumeX,
  ClipboardList,
  HelpCircle,
  Menu,
  Moon,
  Plus,
  Sun,
  UserPlus,
} from 'lucide-react';
import { AuthenticatedUser } from '@/lib/auth';
import { Button } from '@/components/ui/Button';
import {
  StatusToast,
  StatusToastMessage,
  StatusToastTone,
} from '@/components/ui/StatusToast';
import { useTheme } from '@/components/providers/ThemeProvider';
import { GlobalSearch } from '@/components/layout/GlobalSearch';
import { NotificationPopover } from '@/components/notifications/NotificationPopover';
import { useNotifications } from '@/components/providers/NotificationProvider';
import { ProfileMenu } from '@/components/layout/ProfileMenu';
import {
  isNotificationSoundMuted,
  playNotificationSound,
  setNotificationSoundMuted,
  unlockNotificationSound,
} from '@/lib/notification-sound';

export type CreateAction = 'order' | 'client' | 'user';

interface TopBarProps {
  user: AuthenticatedUser;
  unreadCount: number;
  onOpenMobileNav: () => void;
  onLogout: () => void;
  onCreate: (action: CreateAction) => void;
}

export function TopBar({
  user,
  unreadCount,
  onOpenMobileNav,
  onLogout,
  onCreate,
}: TopBarProps) {
  const router = useRouter();
  const { theme, toggleTheme } = useTheme();
  const [createOpen, setCreateOpen] = useState(false);
  const [helpOpen, setHelpOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [soundMuted, setSoundMuted] = useState(false);
  const [toast, setToast] = useState<StatusToastMessage | null>(null);
  const { pushStatus, pushBusy, enablePush, disablePush, pushMessage } =
    useNotifications();

  useEffect(() => {
    setSoundMuted(isNotificationSoundMuted());
  }, []);

  const showToast = useCallback((text: string, tone: StatusToastTone = 'success') => {
    setToast({ id: Date.now(), text, tone });
  }, []);

  const dismissToast = useCallback(() => setToast(null), []);

  useEffect(() => {
    if (!pushMessage) return;
    const tone: StatusToastTone =
      /could not|blocked|denied|failed|unable/i.test(pushMessage)
        ? 'error'
        : /install|check site/i.test(pushMessage)
          ? 'info'
          : 'success';
    showToast(pushMessage, tone);
  }, [pushMessage, showToast]);

  const createItems = [
    {
      action: 'order' as const,
      label: 'New Order',
      icon: <ClipboardList className="h-4 w-4" />,
      show:
        user.permissionCodes.includes('orders.create') ||
        user.permissionCodes.includes('orders.manage'),
    },
    {
      action: 'client' as const,
      label: 'New Client',
      icon: <Building2 className="h-4 w-4" />,
      show:
        user.userType === 'internal' &&
        user.permissionCodes.includes('clients.manage'),
    },
    {
      action: 'user' as const,
      label: 'Invite staff',
      icon: <UserPlus className="h-4 w-4" />,
      show: user.permissionCodes.includes('users.manage'),
    },
  ].filter((item) => item.show);

  async function handlePushToggle() {
    if (pushBusy || pushStatus === 'denied') {
      if (pushStatus === 'denied') {
        showToast(
          'The browser blocked device alerts. Check site permissions.',
          'error',
        );
      }
      return;
    }
    if (pushStatus === 'on') {
      await disablePush();
      return;
    }
    await enablePush();
  }

  function handleSoundToggle() {
    const next = !soundMuted;
    setSoundMuted(next);
    setNotificationSoundMuted(next);
    if (!next) {
      unlockNotificationSound();
      playNotificationSound();
    }
    showToast(
      next
        ? 'Notification sound is muted.'
        : 'Notification sound is on.',
      'success',
    );
  }

  return (
    <header
      className="sticky top-0 z-20 border-b border-[var(--border)] bg-[var(--surface)]/95 backdrop-blur"
      style={{ paddingTop: 'var(--safe-top)' }}
    >
      <div className="flex w-full items-center gap-2 px-3 py-2 sm:gap-3 sm:px-4 sm:py-3 lg:px-6">
        <div className="flex shrink-0 items-center gap-2 sm:gap-3">
          <button
            type="button"
            onClick={onOpenMobileNav}
            className="inline-flex min-h-touch min-w-touch shrink-0 items-center justify-center rounded-[var(--radius-md)] text-[var(--muted-foreground)] transition-colors hover:bg-[var(--surface-muted)] hover:text-[var(--foreground)] lg:hidden"
            aria-label="Open navigation menu"
          >
            <Menu className="h-5 w-5" />
          </button>

          <div className="hidden shrink-0 lg:block">
            <p className="text-sm font-medium text-[var(--foreground)]">Workspace</p>
            <p className="text-xs text-[var(--muted)]">Demo workspace</p>
          </div>
        </div>

        <div className="mx-1 min-w-0 flex-1 sm:mx-3 lg:mx-6 lg:max-w-xl">
          <GlobalSearch />
        </div>

        <div className="ml-auto flex shrink-0 items-center gap-0.5 sm:gap-1">
          {createItems.length > 0 ? (
            <div className="relative" data-tour="topbar-create">
              <Button
                variant="primary"
                size="sm"
                aria-label="Create new item"
                className="hidden sm:inline-flex"
                onClick={() => setCreateOpen((value) => !value)}
              >
                <Plus className="h-4 w-4" />
                Create
              </Button>
              <IconButton
                className="sm:hidden"
                label="Create new item"
                onClick={() => setCreateOpen((value) => !value)}
              >
                <Plus className="h-4 w-4" />
              </IconButton>
              {createOpen ? (
                <>
                  <button
                    type="button"
                    className="fixed inset-0 z-10"
                    aria-label="Close create menu"
                    onClick={() => setCreateOpen(false)}
                  />
                  <div className="fixed inset-x-2 top-[3.75rem] z-20 rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--surface)] p-2 shadow-[var(--shadow-md)] sm:absolute sm:inset-x-auto sm:right-0 sm:top-[calc(100%+8px)] sm:min-w-44">
                    {createItems.map((item) => (
                      <button
                        key={item.action}
                        type="button"
                        onClick={() => {
                          setCreateOpen(false);
                          onCreate(item.action);
                        }}
                        className="flex min-h-touch w-full items-center gap-2 rounded-[var(--radius-md)] px-3 py-2 text-sm text-[var(--foreground)] hover:bg-[var(--surface-muted)]"
                      >
                        {item.icon}
                        {item.label}
                      </button>
                    ))}
                  </div>
                </>
              ) : null}
            </div>
          ) : null}

          {pushStatus === 'unsupported' ? null : (
            <IconButton
              label={
                pushBusy
                  ? 'Updating device alerts…'
                  : pushStatus === 'on'
                    ? 'Turn off device alerts'
                    : pushStatus === 'denied'
                      ? 'The browser blocked device alerts'
                      : pushStatus === 'needs-install'
                        ? 'Install Colabdeck to the home screen, then turn device alerts on'
                        : 'Turn on device alerts'
              }
              active={pushStatus === 'on'}
              busy={pushBusy}
              onClick={() => void handlePushToggle()}
            >
              <BellRing
                className={`h-4 w-4 ${pushStatus === 'on' ? 'text-[var(--primary)]' : ''}`}
              />
            </IconButton>
          )}
          <IconButton
            label={soundMuted ? 'Unmute notification sound' : 'Mute notification sound'}
            active={!soundMuted}
            onClick={handleSoundToggle}
          >
            {soundMuted ? (
              <VolumeX className="h-4 w-4" />
            ) : (
              <Volume2 className="h-4 w-4 text-[var(--primary)]" />
            )}
          </IconButton>
          <IconButton label="Toggle theme" onClick={toggleTheme}>
            {theme === 'light' ? (
              <Moon className="h-4 w-4" />
            ) : (
              <Sun className="h-4 w-4" />
            )}
          </IconButton>

          <div className="relative">
            <IconButton
              label="Notifications"
              onClick={() => setNotificationsOpen((value) => !value)}
              badge={unreadCount > 0 ? unreadCount : undefined}
            >
              <Bell className="h-4 w-4" />
            </IconButton>
            {notificationsOpen ? (
              <>
                <button
                  type="button"
                  className="fixed inset-0 z-20"
                  aria-label="Close notifications menu"
                  onClick={() => setNotificationsOpen(false)}
                />
                <NotificationPopover onClose={() => setNotificationsOpen(false)} />
              </>
            ) : null}
          </div>

          <div className="relative hidden sm:block">
            <IconButton label="Help and support" onClick={() => setHelpOpen((v) => !v)}>
              <HelpCircle className="h-4 w-4" />
            </IconButton>
            {helpOpen ? (
              <>
                <button
                  type="button"
                  className="fixed inset-0 z-10"
                  aria-label="Close help menu"
                  onClick={() => setHelpOpen(false)}
                />
                <div className="absolute right-0 top-[calc(100%+8px)] z-20 w-56 rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--surface)] p-3 shadow-[var(--shadow-md)]">
                  <p className="text-sm font-medium text-[var(--foreground)]">Need help?</p>
                  <p className="mt-1 text-xs text-[var(--muted)]">
                    Open Messages for updates or contact your workspace admin.
                  </p>
                  <Button
                    size="sm"
                    variant="secondary"
                    className="mt-3 w-full"
                    onClick={() => {
                      setHelpOpen(false);
                      router.push('/chat');
                    }}
                  >
                    Open Messages
                  </Button>
                </div>
              </>
            ) : null}
          </div>

          <ProfileMenu user={user} onLogout={onLogout} />
        </div>
      </div>

      <StatusToast message={toast} onDismiss={dismissToast} />
    </header>
  );
}

function IconButton({
  children,
  label,
  onClick,
  badge,
  title,
  className,
  active,
  busy,
}: {
  children: ReactNode;
  label: string;
  onClick?: () => void;
  badge?: number;
  title?: string;
  className?: string;
  active?: boolean;
  busy?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      title={title ?? label}
      aria-pressed={active === undefined ? undefined : active}
      disabled={busy}
      className={`relative inline-flex min-h-touch min-w-touch items-center justify-center rounded-[var(--radius-md)] text-[var(--muted-foreground)] transition-colors hover:bg-[var(--surface-muted)] hover:text-[var(--foreground)] disabled:cursor-wait disabled:opacity-60 ${
        active ? 'bg-[var(--primary-soft)] text-[var(--primary)]' : ''
      } ${className ?? ''}`}
    >
      {children}
      {badge ? (
        <span className="absolute right-1 top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-[var(--primary)] px-1 text-[10px] font-semibold text-white">
          {badge > 9 ? '9+' : badge}
        </span>
      ) : null}
    </button>
  );
}
