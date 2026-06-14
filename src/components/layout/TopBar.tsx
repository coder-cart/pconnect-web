'use client';

import { ReactNode, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Bell,
  Briefcase,
  Building2,
  CheckSquare,
  CreditCard,
  HelpCircle,
  Menu,
  Moon,
  Plus,
  Sun,
  UserPlus,
} from 'lucide-react';
import { AuthenticatedUser } from '@/lib/auth';
import { Avatar } from '@/components/ui/Avatar';
import { Button } from '@/components/ui/Button';
import { useTheme } from '@/components/providers/ThemeProvider';
import { GlobalSearch } from '@/components/layout/GlobalSearch';
import { NotificationPopover } from '@/components/notifications/NotificationPopover';
import { ProfileMenu } from '@/components/layout/ProfileMenu';

export type CreateAction =
  | 'task'
  | 'project'
  | 'client'
  | 'invoice'
  | 'user';

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

  const createItems = [
    { action: 'task' as const, label: 'New Task', icon: <CheckSquare className="h-4 w-4" />, show: true },
    {
      action: 'project' as const,
      label: 'New Project',
      icon: <Briefcase className="h-4 w-4" />,
      show: user.permissionCodes.includes('projects.create'),
    },
    {
      action: 'client' as const,
      label: 'New Client',
      icon: <Building2 className="h-4 w-4" />,
      show: user.permissionCodes.includes('clients.manage'),
    },
    {
      action: 'invoice' as const,
      label: 'New Invoice',
      icon: <CreditCard className="h-4 w-4" />,
      show: user.permissionCodes.includes('finance.invoices.create'),
    },
    {
      action: 'user' as const,
      label: 'Invite User',
      icon: <UserPlus className="h-4 w-4" />,
      show: user.permissionCodes.includes('users.manage'),
    },
  ].filter((item) => item.show);

  return (
    <header className="sticky top-0 z-20 border-b border-[var(--border)] bg-[var(--surface)]/95 backdrop-blur">
      <div className="flex flex-col gap-3 px-4 py-3 lg:flex-row lg:items-center lg:justify-between lg:px-6">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onOpenMobileNav}
            className="inline-flex rounded-[var(--radius-md)] p-2 text-[var(--muted-foreground)] transition-colors hover:bg-[var(--surface-muted)] hover:text-[var(--foreground)] lg:hidden"
            aria-label="Open navigation menu"
          >
            <Menu className="h-5 w-5" />
          </button>

          <div className="hidden lg:block">
            <p className="text-sm font-medium text-[var(--foreground)]">Workspace</p>
            <p className="text-xs text-[var(--muted)]">Demo workspace</p>
          </div>
        </div>

        <div className="w-full max-w-xl flex-1 lg:mx-6">
          <GlobalSearch />
        </div>

        <div className="flex items-center justify-between gap-2 lg:justify-end">
          {createItems.length > 0 ? (
            <div className="relative hidden sm:block">
              <Button
                variant="primary"
                size="sm"
                aria-label="Create new item"
                onClick={() => setCreateOpen((value) => !value)}
              >
                <Plus className="h-4 w-4" />
                Create
              </Button>
              {createOpen ? (
                <>
                  <button
                    type="button"
                    className="fixed inset-0 z-10"
                    aria-label="Close create menu"
                    onClick={() => setCreateOpen(false)}
                  />
                  <div className="absolute right-0 top-[calc(100%+8px)] z-20 min-w-44 rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--surface)] p-2 shadow-[var(--shadow-md)]">
                    {createItems.map((item) => (
                      <button
                        key={item.action}
                        type="button"
                        onClick={() => {
                          setCreateOpen(false);
                          onCreate(item.action);
                        }}
                        className="flex w-full items-center gap-2 rounded-[var(--radius-md)] px-3 py-2 text-sm text-[var(--foreground)] hover:bg-[var(--surface-muted)]"
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

          <div className="flex items-center gap-1 sm:gap-2">
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

            <div className="relative">
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
                      Visit Inbox for updates or contact your workspace admin.
                    </p>
                    <Button
                      size="sm"
                      variant="secondary"
                      className="mt-3 w-full"
                      onClick={() => {
                        setHelpOpen(false);
                        router.push('/inbox');
                      }}
                    >
                      Open Inbox
                    </Button>
                  </div>
                </>
              ) : null}
            </div>

            <ProfileMenu user={user} onLogout={onLogout} />

            <button
              type="button"
              onClick={onLogout}
              className="flex items-center rounded-[var(--radius-md)] border border-[var(--border)] p-1.5 sm:hidden"
              aria-label="Log out"
            >
              <Avatar name={user.fullName} size="sm" />
            </button>
          </div>
        </div>
      </div>
    </header>
  );
}

function IconButton({
  children,
  label,
  onClick,
  badge,
}: {
  children: ReactNode;
  label: string;
  onClick?: () => void;
  badge?: number;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      className="relative rounded-[var(--radius-md)] p-2 text-[var(--muted-foreground)] transition-colors hover:bg-[var(--surface-muted)] hover:text-[var(--foreground)]"
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
