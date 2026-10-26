'use client';

import { ReactNode, useEffect, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import {
  AuthenticatedUser,
  isClientChatOnly,
  userHasPermission,
  userIsExternal,
} from '@/lib/auth';
import { canAccessPath, isEditorOnly } from '@/lib/navigation';
import { RestrictedState } from '@/components/ui/StatePanels';
import { Sidebar } from '@/components/layout/Sidebar';
import { TopBar, CreateAction } from '@/components/layout/TopBar';
import { cn } from '@/lib/cn';
import { CreateClientModal } from '@/components/modals/CreateClientModal';
import { CreateUserModal } from '@/components/modals/CreateUserModal';
import { OrderCreateModal } from '@/components/orders/OrderCreateForm';
import { WorkspaceProvider } from '@/components/providers/WorkspaceProvider';
import { RealtimeProvider } from '@/components/providers/RealtimeProvider';
import { NotificationProvider, useNotifications } from '@/components/providers/NotificationProvider';
import { UnreadMessagesProvider, useUnreadMessages } from '@/components/providers/UnreadMessagesProvider';
import { NotificationOptInPrompt } from '@/components/pwa/NotificationOptInPrompt';
import { ProductTourProvider } from '@/components/tour/ProductTourProvider';

const SIDEBAR_COLLAPSED_KEY = 'pconnect.sidebar.collapsed';

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
  const { total: messageUnreadCount } = useUnreadMessages();
  const pathname = usePathname();
  const router = useRouter();
  const allowed = canAccessPath(
    pathname,
    user.userType,
    user.permissionCodes,
    user.roleCodes,
    user.portalAccessLevel,
  );
  useEffect(() => {
    if (
      (isEditorOnly(user.roleCodes) || isClientChatOnly(user)) &&
      !allowed
    ) {
      router.replace('/chat');
    }
  }, [allowed, router, user]);

  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [createAction, setCreateAction] = useState<CreateAction | null>(null);
  const canManageOrders = userHasPermission(user, 'orders.manage');
  const isExternal = userIsExternal(user);

  useEffect(() => {
    try {
      setSidebarCollapsed(window.localStorage.getItem(SIDEBAR_COLLAPSED_KEY) === '1');
    } catch {
      setSidebarCollapsed(false);
    }
  }, []);

  function toggleSidebarCollapsed() {
    setSidebarCollapsed((current) => {
      const next = !current;
      try {
        window.localStorage.setItem(SIDEBAR_COLLAPSED_KEY, next ? '1' : '0');
      } catch {
        // ignore storage failures
      }
      return next;
    });
  }

  useEffect(() => {
    setMobileNavOpen(false);
  }, [pathname]);

  return (
    <div className="app-root min-h-screen bg-[var(--background)] text-[var(--foreground)]">
      <div className="flex min-h-screen">
        <div
          className={cn(
            'hidden shrink-0 transition-[width] duration-200 lg:block',
            sidebarCollapsed ? 'w-[var(--sidebar-width-collapsed)]' : 'w-[var(--sidebar-width)]',
          )}
          aria-hidden
        />
        <div className="hidden lg:block">
          <Sidebar
            user={user}
            unreadCount={unreadCount}
            messageUnreadCount={messageUnreadCount}
            collapsed={sidebarCollapsed}
            onToggleCollapsed={toggleSidebarCollapsed}
          />
        </div>

        <div className="flex min-w-0 flex-1 flex-col">
          <TopBar
            user={user}
            unreadCount={unreadCount}
            onLogout={onLogout}
            onOpenMobileNav={() => setMobileNavOpen(true)}
            onCreate={setCreateAction}
          />

          <main className="page-pad flex-1 overflow-auto">
            {allowed ? (
              children
            ) : (
              <RestrictedState
                title="You do not have access"
                description="This section is hidden for your role. Ask an admin to grant the permission if you need it."
              />
            )}
          </main>
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
              'absolute inset-y-0 left-0 w-[min(100vw,20rem)] shadow-[var(--shadow-md)]',
              'animate-[fade-in_0.2s_ease-out]',
            )}
            style={{ paddingLeft: 'var(--safe-left)' }}
          >
            <Sidebar
              user={user}
              unreadCount={unreadCount}
              messageUnreadCount={messageUnreadCount}
              mobile
              onClose={() => setMobileNavOpen(false)}
              onNavigate={() => setMobileNavOpen(false)}
            />
          </div>
        </div>
      ) : null}

      <NotificationOptInPrompt />

      <OrderCreateModal
        open={createAction === 'order'}
        canManage={canManageOrders}
        isExternal={isExternal}
        onClose={() => setCreateAction(null)}
        onCreated={onCreated}
      />
      <CreateClientModal
        open={createAction === 'client'}
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

export function AppShell({
  user,
  onLogout,
  refreshUser,
  children,
}: AppShellProps & {
  refreshUser: () => Promise<void>;
}) {
  const [refreshKey, setRefreshKey] = useState(0);

  function handleCreated() {
    setRefreshKey((value) => value + 1);
  }

  return (
    <WorkspaceProvider
      user={user}
      refreshKey={refreshKey}
      notifyRefresh={handleCreated}
      refreshUser={refreshUser}
    >
      <RealtimeProvider>
        <NotificationProvider>
          <UnreadMessagesProvider>
            <ProductTourProvider user={user}>
              <AppShellContent
                user={user}
                onLogout={onLogout}
                refreshKey={refreshKey}
                onCreated={handleCreated}
              >
                {children}
              </AppShellContent>
            </ProductTourProvider>
          </UnreadMessagesProvider>
        </NotificationProvider>
      </RealtimeProvider>
    </WorkspaceProvider>
  );
}
