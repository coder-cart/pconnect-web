'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ChevronUp, X } from 'lucide-react';
import { AuthenticatedUser, userHasPermission } from '@/lib/auth';
import { getRoleLabel, getNavItemLabel, getVisibleNavItems, NavItem } from '@/lib/navigation';
import { Avatar } from '@/components/ui/Avatar';
import { Logo } from '@/components/ui/Logo';
import { AdminToolsMenu } from '@/components/layout/AdminToolsMenu';
import { cn } from '@/lib/cn';

interface SidebarProps {
  user: AuthenticatedUser;
  unreadCount?: number;
  onNavigate?: () => void;
  mobile?: boolean;
  onClose?: () => void;
}

export function Sidebar({
  user,
  unreadCount = 0,
  onNavigate,
  mobile = false,
  onClose,
}: SidebarProps) {
  const pathname = usePathname();
  const visibleItems = getVisibleNavItems(user.userType, user.permissionCodes).map(
    (item) =>
      item.href === '/inbox' && unreadCount > 0
        ? { ...item, badge: unreadCount }
        : item,
  );
  const roleLabel = getRoleLabel(user.userType, user.roleCodes);
  const showAdminTools = userHasPermission(user, 'users.manage');

  return (
    <aside
      className={cn(
        'flex h-full flex-col border-r border-[var(--border)] bg-[var(--surface)]',
        mobile ? 'w-full max-w-sm' : 'w-64 shrink-0',
      )}
      aria-label="Main navigation"
    >
      <div className="flex items-center justify-between border-b border-[var(--border)] px-4 py-4">
        <Logo />
        {mobile && onClose ? (
          <button
            type="button"
            onClick={onClose}
            className="rounded-[var(--radius-md)] p-2 text-[var(--muted)] transition-colors hover:bg-[var(--surface-muted)] hover:text-[var(--foreground)]"
            aria-label="Close navigation menu"
          >
            <X className="h-5 w-5" />
          </button>
        ) : null}
      </div>

      <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-4">
        {visibleItems.map((item) => (
          <SidebarLink
            key={item.href}
            item={item}
            pathname={pathname}
            onNavigate={onNavigate}
            userType={user.userType}
          />
        ))}
      </nav>

      <div className="border-t border-[var(--border)] p-4 space-y-2">
        {showAdminTools ? <AdminToolsMenu /> : null}
        <div className="flex items-center gap-3 rounded-[var(--radius-lg)] bg-[var(--surface-muted)] p-3">
          <Avatar name={user.fullName} size="md" />
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium text-[var(--foreground)]">
              {user.fullName}
            </p>
            <p className="truncate text-xs text-[var(--muted)]">{roleLabel}</p>
          </div>
          <ChevronUp className="h-4 w-4 shrink-0 text-[var(--muted)]" aria-hidden />
        </div>
      </div>
    </aside>
  );
}

function SidebarLink({
  item,
  pathname,
  onNavigate,
  userType,
}: {
  item: NavItem;
  pathname: string;
  onNavigate?: () => void;
  userType: 'internal' | 'external';
}) {
  const isActive =
    pathname === item.href || pathname.startsWith(`${item.href}/`);
  const Icon = item.icon;

  return (
    <Link
      href={item.href}
      onClick={onNavigate}
      className={cn(
        'group flex items-center gap-3 rounded-[var(--radius-md)] px-3 py-2.5 text-sm font-medium transition-all duration-200',
        isActive
          ? 'bg-[var(--primary)] text-white shadow-sm'
          : 'text-[var(--muted-foreground)] hover:bg-[var(--surface-muted)] hover:text-[var(--foreground)]',
      )}
      aria-current={isActive ? 'page' : undefined}
    >
      <Icon className="h-4 w-4 shrink-0" aria-hidden />
      <span className="flex-1">{getNavItemLabel(item, userType)}</span>
      {item.badge ? (
        <span
          className={cn(
            'rounded-full px-2 py-0.5 text-[10px] font-semibold',
            isActive
              ? 'bg-white/20 text-white'
              : 'bg-[var(--primary-soft)] text-[var(--primary)]',
          )}
        >
          {item.badge}
        </span>
      ) : null}
    </Link>
  );
}
