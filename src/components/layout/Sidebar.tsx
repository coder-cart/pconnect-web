'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ChevronUp, PanelLeftClose, PanelLeftOpen, Settings, X } from 'lucide-react';
import { AuthenticatedUser, userHasAnyPermission, userHasPermission } from '@/lib/auth';
import { getRoleLabel, getNavItemLabel, getVisibleNavItems, NavItem } from '@/lib/navigation';
import { UserAvatar } from '@/components/ui/UserAvatar';
import { Logo } from '@/components/ui/Logo';
import { AdminToolsMenu } from '@/components/layout/AdminToolsMenu';
import {
  UnreadConversation,
  UnreadPerson,
  useUnreadMessages,
} from '@/components/providers/UnreadMessagesProvider';
import { cn } from '@/lib/cn';

interface SidebarProps {
  user: AuthenticatedUser;
  unreadCount?: number;
  messageUnreadCount?: number;
  onNavigate?: () => void;
  mobile?: boolean;
  onClose?: () => void;
  collapsed?: boolean;
  onToggleCollapsed?: () => void;
}

function personForConversation(conversation: UnreadConversation): UnreadPerson {
  if (conversation.type === 'direct' && conversation.dmPeer) {
    return conversation.dmPeer;
  }
  if (conversation.latestMessage?.sender) {
    return conversation.latestMessage.sender;
  }
  return {
    id: conversation.channelId,
    fullName: conversation.name,
  };
}

function previewText(body: string) {
  return body.replace(/@\[([^\]]+)\]\([^)]+\)/g, '@$1');
}

function UnreadPersonHoverCard({ person }: { person: UnreadPerson }) {
  const away = person.presenceStatus === 'away';
  const statusLine = [person.statusEmoji, person.statusText]
    .filter(Boolean)
    .join(' ')
    .trim();

  return (
    <div
      className="absolute left-0 top-full z-40 mt-1 w-56 max-w-[calc(100vw-2rem)] rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--surface)] p-3 text-left shadow-[var(--shadow-md)] lg:left-full lg:top-0 lg:mt-0 lg:ml-2"
      role="tooltip"
    >
      <div className="flex items-start gap-3">
        <UserAvatar
          user={{
            id: person.id,
            fullName: person.fullName,
            avatarUpdatedAt: person.avatarUpdatedAt,
          }}
          size="md"
        />
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold text-[var(--foreground)]">
            {person.fullName}
          </p>
          {person.jobTitle ? (
            <p className="mt-0.5 truncate text-xs text-[var(--muted)]">
              {person.jobTitle}
            </p>
          ) : null}
          <p className="mt-1 text-xs font-medium text-[var(--foreground)]">
            {away ? 'Away' : 'Active'}
          </p>
          {statusLine ? (
            <p className="mt-1 truncate text-xs text-[var(--muted)]">{statusLine}</p>
          ) : null}
        </div>
      </div>
    </div>
  );
}

function UnreadConversationLink({
  conversation,
  onNavigate,
  collapsed,
}: {
  conversation: UnreadConversation;
  onNavigate?: () => void;
  collapsed?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const person = personForConversation(conversation);
  const away = person.presenceStatus === 'away';
  const preview = conversation.latestMessage?.body
    ? previewText(conversation.latestMessage.body)
    : conversation.name;

  return (
    <div
      className="relative"
      onMouseEnter={() => {
        if (window.matchMedia('(hover: hover)').matches) setOpen(true);
      }}
      onMouseLeave={() => setOpen(false)}
    >
      <Link
        href={`/chat?channel=${conversation.channelId}`}
        onClick={(event) => {
          if (!window.matchMedia('(hover: hover)').matches) {
            if (!open && !collapsed) {
              event.preventDefault();
              setOpen(true);
              return;
            }
          }
          onNavigate?.();
        }}
        title={collapsed ? person.fullName : undefined}
        className={cn(
          'flex items-center gap-2.5 rounded-[var(--radius-md)] px-2.5 py-2 text-left transition-colors hover:bg-[var(--surface-muted)]',
          collapsed && 'justify-center px-2',
        )}
      >
        <span className="relative shrink-0">
          <UserAvatar
            user={{
              id: person.id,
              fullName: person.fullName,
              avatarUpdatedAt: person.avatarUpdatedAt,
            }}
            size="xs"
          />
          <span
            className={cn(
              'absolute -bottom-0.5 -right-0.5 h-2 w-2 rounded-full border border-[var(--surface)]',
              away ? 'bg-[var(--muted)]' : 'bg-[var(--success)]',
            )}
            aria-hidden
          />
        </span>
        {!collapsed ? (
          <>
            <span className="min-w-0 flex-1">
              <span className="block truncate text-sm font-semibold text-[var(--foreground)]">
                {person.fullName}
              </span>
              <span className="block truncate text-[11px] text-[var(--muted)]">
                {preview}
              </span>
            </span>
            <span className="shrink-0 rounded-full bg-[var(--primary-soft)] px-1.5 py-0.5 text-[10px] font-semibold text-[var(--primary)]">
              {conversation.unreadCount}
            </span>
          </>
        ) : conversation.unreadCount > 0 ? (
          <span className="absolute right-1 top-1 h-2 w-2 rounded-full bg-[var(--primary)]" />
        ) : null}
      </Link>
      {open && !collapsed ? <UnreadPersonHoverCard person={person} /> : null}
    </div>
  );
}

export function Sidebar({
  user,
  unreadCount = 0,
  messageUnreadCount = 0,
  onNavigate,
  mobile = false,
  onClose,
  collapsed = false,
  onToggleCollapsed,
}: SidebarProps) {
  const pathname = usePathname();
  const { conversations } = useUnreadMessages();
  const visibleItems = getVisibleNavItems(
    user.userType,
    user.permissionCodes,
    user.roleCodes,
  ).map((item) => {
    if (item.href === '/chat' && messageUnreadCount > 0) {
      return { ...item, badge: messageUnreadCount };
    }
    if (item.href === '/inbox' && unreadCount > 0) {
      return { ...item, badge: unreadCount };
    }
    return item;
  });
  const roleLabel = getRoleLabel(user.userType, user.roleCodes);
  const showSettings = userHasAnyPermission(user, [
    'users.manage',
    'roles.manage',
    'master_data.manage',
    'audit.view',
  ]);
  const showStaff = userHasPermission(user, 'users.manage');
  const homeItem = visibleItems.find((item) => item.href === '/dashboard');
  const otherItems = visibleItems.filter((item) => item.href !== '/dashboard');
  const isCollapsed = !mobile && collapsed;

  function renderUnreadGroup() {
    if (conversations.length === 0) {
      return null;
    }
    return (
      <div className="py-2">
        {!isCollapsed ? (
          <p className="mb-1 px-2.5 text-[11px] font-semibold uppercase tracking-wide text-[var(--muted)]">
            Unread
          </p>
        ) : null}
        <div className="space-y-0.5">
          {conversations.map((conversation) => (
            <UnreadConversationLink
              key={conversation.channelId}
              conversation={conversation}
              onNavigate={onNavigate}
              collapsed={isCollapsed}
            />
          ))}
        </div>
      </div>
    );
  }

  return (
    <aside
      className={cn(
        'flex flex-col border-r border-[var(--border)] bg-[var(--surface)] transition-[width] duration-200',
        mobile
          ? 'h-full w-full max-w-sm'
          : cn(
              'fixed inset-y-0 left-0 z-30 h-screen',
              isCollapsed ? 'w-[var(--sidebar-width-collapsed)]' : 'w-[var(--sidebar-width)]',
            ),
      )}
      aria-label="Main navigation"
    >
      <div
        className={cn(
          'flex shrink-0 items-center border-b border-[var(--border)] px-3 py-3',
          isCollapsed ? 'justify-center' : 'justify-between px-4 py-4',
        )}
      >
        {!isCollapsed ? <Logo /> : null}
        <div className="flex items-center gap-1">
          {!mobile && onToggleCollapsed ? (
            <button
              type="button"
              onClick={onToggleCollapsed}
              className="inline-flex min-h-touch min-w-touch items-center justify-center rounded-[var(--radius-md)] text-[var(--muted)] transition-colors hover:bg-[var(--surface-muted)] hover:text-[var(--foreground)]"
              aria-label={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            >
              {isCollapsed ? (
                <PanelLeftOpen className="h-5 w-5" />
              ) : (
                <PanelLeftClose className="h-5 w-5" />
              )}
            </button>
          ) : null}
          {mobile && onClose ? (
            <button
              type="button"
              onClick={onClose}
              className="inline-flex min-h-touch min-w-touch items-center justify-center rounded-[var(--radius-md)] text-[var(--muted)] transition-colors hover:bg-[var(--surface-muted)] hover:text-[var(--foreground)]"
              aria-label="Close navigation menu"
            >
              <X className="h-5 w-5" />
            </button>
          ) : null}
        </div>
      </div>

      <nav className="min-h-0 flex-1 space-y-1 overflow-y-auto px-2 py-3 sm:px-3 sm:py-4">
        {homeItem ? (
          <SidebarLink
            item={homeItem}
            pathname={pathname}
            onNavigate={onNavigate}
            userType={user.userType}
            collapsed={isCollapsed}
          />
        ) : null}

        {renderUnreadGroup()}

        {otherItems.map((item) => (
          <SidebarLink
            key={item.href}
            item={item}
            pathname={pathname}
            onNavigate={onNavigate}
            userType={user.userType}
            collapsed={isCollapsed}
          />
        ))}
      </nav>

      <div className={cn('shrink-0 space-y-2 border-t border-[var(--border)] p-3', isCollapsed && 'px-2')}>
        {showSettings || showStaff ? (
          isCollapsed ? (
            <Link
              href={showSettings ? '/admin' : '/staff'}
              className="inline-flex w-full min-h-touch items-center justify-center rounded-[var(--radius-md)] text-[var(--muted)] hover:bg-[var(--surface-muted)]"
              title="Admin tools"
              onClick={onNavigate}
            >
              <Settings className="h-4 w-4" />
            </Link>
          ) : (
            <AdminToolsMenu showSettings={showSettings} showStaff={showStaff} />
          )
        ) : null}
        <Link
          href="/account"
          onClick={onNavigate}
          className={cn(
            'flex items-center gap-3 rounded-[var(--radius-lg)] bg-[var(--surface-muted)] p-2.5 transition-colors hover:bg-[var(--border)]/40',
            isCollapsed && 'justify-center p-2',
          )}
          title={isCollapsed ? user.fullName : undefined}
        >
          <UserAvatar user={user} size={isCollapsed ? 'sm' : 'md'} />
          {!isCollapsed ? (
            <>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-[var(--foreground)]">
                  {user.fullName}
                </p>
                <p className="truncate text-xs text-[var(--muted)]">{roleLabel}</p>
              </div>
              <ChevronUp className="h-4 w-4 shrink-0 text-[var(--muted)]" aria-hidden />
            </>
          ) : null}
        </Link>
      </div>
    </aside>
  );
}

function SidebarLink({
  item,
  pathname,
  onNavigate,
  userType,
  collapsed,
}: {
  item: NavItem;
  pathname: string;
  onNavigate?: () => void;
  userType: 'internal' | 'external';
  collapsed?: boolean;
}) {
  const isActive =
    pathname === item.href || pathname.startsWith(`${item.href}/`);
  const Icon = item.icon;
  const label = getNavItemLabel(item, userType);

  return (
    <Link
      href={item.href}
      onClick={onNavigate}
      title={collapsed ? label : undefined}
      className={cn(
        'group relative flex items-center gap-3 rounded-[var(--radius-md)] px-3 py-2.5 text-sm font-medium transition-all duration-200',
        collapsed && 'justify-center px-2',
        isActive
          ? 'bg-[var(--primary)] text-white shadow-sm'
          : 'text-[var(--muted-foreground)] hover:bg-[var(--surface-muted)] hover:text-[var(--foreground)]',
      )}
      aria-current={isActive ? 'page' : undefined}
    >
      <Icon className="h-4 w-4 shrink-0" aria-hidden />
      {!collapsed ? (
        <>
          <span className="flex-1 truncate">{label}</span>
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
        </>
      ) : item.badge ? (
        <span className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-[var(--primary)]" />
      ) : null}
    </Link>
  );
}
