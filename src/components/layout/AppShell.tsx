'use client';

import { ReactNode, useState } from 'react';
import { AuthenticatedUser } from '@/lib/auth';
import { Sidebar } from '@/components/layout/Sidebar';
import { TopBar, CreateAction } from '@/components/layout/TopBar';
import { cn } from '@/lib/cn';
import { CreateTaskModal } from '@/components/modals/CreateTaskModal';
import { CreateProjectModal } from '@/components/modals/CreateProjectModal';
import { CreateClientModal } from '@/components/modals/CreateClientModal';
import { CreateInvoiceModal } from '@/components/modals/CreateInvoiceModal';
import { CreateUserModal } from '@/components/modals/CreateUserModal';
import { WorkspaceProvider } from '@/components/providers/WorkspaceProvider';
import { RealtimeProvider } from '@/components/providers/RealtimeProvider';
import { NotificationProvider, useNotifications } from '@/components/providers/NotificationProvider';

interface AppShellProps {
  user: AuthenticatedUser;
  onLogout: () => void;
  children: ReactNode;
}

function AppShellContent({
  user,
  onLogout,
  children,
  refreshKey,
  onCreated,
}: AppShellProps & {
  refreshKey: number;
  onCreated: () => void;
}) {
  const { unreadCount } = useNotifications();
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [createAction, setCreateAction] = useState<CreateAction | null>(null);

  return (
    <div className="min-h-screen bg-[var(--background)] text-[var(--foreground)]">
      <div className="flex min-h-screen">
        <div className="hidden lg:flex">
          <Sidebar user={user} unreadCount={unreadCount} />
        </div>

        <div className="flex min-w-0 flex-1 flex-col">
          <TopBar
            user={user}
            unreadCount={unreadCount}
            onLogout={onLogout}
            onOpenMobileNav={() => setMobileNavOpen(true)}
            onCreate={setCreateAction}
          />

          <main className="flex-1 overflow-auto p-4 sm:p-6">{children}</main>
        </div>
      </div>

      {mobileNavOpen ? (
        <div className="fixed inset-0 z-40 lg:hidden">
          <button
            type="button"
            className="absolute inset-0 bg-black/40 backdrop-blur-sm"
            aria-label="Close navigation overlay"
            onClick={() => setMobileNavOpen(false)}
          />
          <div
            className={cn(
              'absolute inset-y-0 left-0 shadow-[var(--shadow-md)]',
              'animate-[fade-in_0.2s_ease-out]',
            )}
          >
            <Sidebar
              user={user}
              unreadCount={unreadCount}
              mobile
              onClose={() => setMobileNavOpen(false)}
              onNavigate={() => setMobileNavOpen(false)}
            />
          </div>
        </div>
      ) : null}

      <CreateTaskModal
        open={createAction === 'task'}
        onClose={() => setCreateAction(null)}
        onCreated={onCreated}
      />
      <CreateProjectModal
        open={createAction === 'project'}
        onClose={() => setCreateAction(null)}
        onCreated={onCreated}
      />
      <CreateClientModal
        open={createAction === 'client'}
        onClose={() => setCreateAction(null)}
        onCreated={onCreated}
      />
      <CreateInvoiceModal
        open={createAction === 'invoice'}
        onClose={() => setCreateAction(null)}
        onCreated={onCreated}
      />
      <CreateUserModal
        open={createAction === 'user'}
        onClose={() => setCreateAction(null)}
        onCreated={onCreated}
      />
    </div>
  );
}

export function AppShell({ user, onLogout, children }: AppShellProps) {
  const [refreshKey, setRefreshKey] = useState(0);

  function handleCreated() {
    setRefreshKey((value) => value + 1);
  }

  return (
    <WorkspaceProvider
      user={user}
      refreshKey={refreshKey}
      notifyRefresh={handleCreated}
    >
      <RealtimeProvider>
        <NotificationProvider>
          <AppShellContent
            user={user}
            onLogout={onLogout}
            refreshKey={refreshKey}
            onCreated={handleCreated}
          >
            {children}
          </AppShellContent>
        </NotificationProvider>
      </RealtimeProvider>
    </WorkspaceProvider>
  );
}
