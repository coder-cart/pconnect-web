'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { Settings, X } from 'lucide-react';
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
import {
  formatCustomStatus,
  isAway,
  presenceSubtitle,
} from '@/lib/user-presence';
import { formatMentionPlainText } from '@/lib/chatMarkdown';
import { navigateToChatConversation } from '@/lib/chat-navigation';

interface SidebarProps {
  user: AuthenticatedUser;
  unreadCount?: number;
  messageUnreadCount?: number;
  onNavigate?: () => void;
  mobile?: boolean;
  onClose?: () => void;
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

function UnreadPersonHoverCard({ person }: { person: UnreadPerson }) {
  return (
    <div
      className="absolute left-0 top-full z-40 mt-1 w-56 max-w-[calc(100vw-2rem)] rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--surface)] p-3 text-left shadow-[var(--shadow-md)] md:left-full md:top-0 md:mt-0 md:ml-2"
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
            {presenceSubtitle(person)}
          </p>
        </div>
      </div>
    </div>
  );
}

function UnreadConversationLink({
  conversation,
  onNavigate,
  compact,
}: {
  conversation: UnreadConversation;
  onNavigate?: () => void;
  compact?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();
  const router = useRouter();
  const person = personForConversation(conversation);
  const away = isAway(person.presenceStatus);
  const statusLine = formatCustomStatus(person);
  const preview = conversation.latestMessage?.body
    ? formatMentionPlainText(conversation.latestMessage.body)
    : conversation.name;
  const chatHref = `/chat?channel=${conversation.channelId}`;

  return (
    <div
      className="relative"
      onMouseEnter={() => {
        if (window.matchMedia('(hover: hover)').matches) setOpen(true);
      }}
      onMouseLeave={() => setOpen(false)}
    >
      <Link
        href={chatHref}
        onClick={(event) => {
          if (!window.matchMedia('(hover: hover)').matches) {
            if (!open && !compact) {
              event.preventDefault();
              setOpen(true);
              return;
            }
          }
          event.preventDefault();
          const alreadyInConversation =
            pathname === '/chat' &&
            new URLSearchParams(window.location.search).has('channel');
          navigateToChatConversation(router, {
            channelId: conversation.channelId,
            pathname,
            alreadyInConversation,
          });
          onNavigate?.();
        }}
        title={compact ? person.fullName : undefined}
        className={cn(
          'flex items-center gap-2.5 rounded-[var(--radius-md)] px-2.5 py-2 text-left transition-colors hover:bg-[var(--shell-hover)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--shell-focus-ring)]',
          compact && 'justify-center px-1.5 py-1.5',
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
              'absolute -bottom-0.5 -right-0.5 h-2 w-2 rounded-full border border-[var(--shell-brand)]',
              away ? 'bg-[var(--shell-muted)]' : 'bg-[var(--success)]',
            )}
            aria-hidden
          />
        </span>
        {!compact ? (
          <>
            <span className="min-w-0 flex-1">
              <span className="block truncate text-sm font-semibold text-[var(--shell-text)]">
                {person.fullName}
                {person.statusEmoji ? (
                  <span className="ml-1 font-normal" aria-hidden>
                    {person.statusEmoji}
                  </span>
                ) : null}
              </span>
              <span className="block truncate text-[11px] text-[var(--shell-muted)]">
                {statusLine || preview}
              </span>
            </span>
            <span className="shrink-0 rounded-full bg-[var(--shell-badge)] px-1.5 py-0.5 text-[10px] font-semibold text-[var(--shell-badge-text)]">
              {conversation.unreadCount}
            </span>
          </>
        ) : conversation.unreadCount > 0 ? (
          <span className="absolute right-0.5 top-0.5 h-2 w-2 rounded-full bg-[var(--shell-badge)]" />
        ) : null}
      </Link>
      {open && !compact ? <UnreadPersonHoverCard person={person} /> : null}
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
}: SidebarProps) {
  const pathname = usePathname();
  const { conversations } = useUnreadMessages();
  const visibleItems = getVisibleNavItems(
    user.userType,
    user.permissionCodes,
    user.roleCodes,
    user.portalAccessLevel,
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

  function renderUnreadGroup(compactMode: boolean) {
    if (conversations.length === 0) {
      return null;
    }
    return (
      <div className={cn(compactMode ? 'w-full' : 'py-2')}>
        {!compactMode ? (
          <p className="mb-1 px-2.5 text-[11px] font-semibold uppercase tracking-wide text-[var(--shell-muted)]">
            Unread
          </p>
        ) : null}
        <div
          className={cn(
            compactMode
              ? 'mx-auto flex max-h-24 w-full flex-col items-center gap-0.5 overflow-y-auto'
              : 'space-y-0.5',
          )}
        >
          {conversations.map((conversation) => (
            <UnreadConversationLink
              key={conversation.channelId}
              conversation={conversation}
              onNavigate={onNavigate}
              compact={compactMode}
            />
          ))}
        </div>
      </div>
    );
  }

  if (mobile) {
    return (
      <aside
        className="shell-chrome flex h-full w-full max-w-sm flex-col border-r border-[var(--shell-border)] bg-[var(--shell-brand)] text-[var(--shell-text)]"
        aria-label="Main navigation"
      >
        <div className="flex h-16 shrink-0 items-center justify-between gap-2 border-b border-[var(--shell-border)] px-3">
          <Logo className="min-w-0 flex-1" />
          {onClose ? (
            <button
              type="button"
              onClick={onClose}
              className="inline-flex h-9 w-9 items-center justify-center rounded-lg text-[var(--shell-muted)] transition-colors hover:bg-[var(--shell-hover)] hover:text-[var(--shell-text)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--shell-focus-ring)]"
              aria-label="Close navigation menu"
            >
              <X className="h-5 w-5 stroke-[1.75]" />
            </button>
          ) : null}
        </div>

        <nav className="shell-scroll min-h-0 flex-1 space-y-[var(--nav-item-gap)] overflow-y-auto px-2.5 py-3">
          {homeItem ? (
            <SidebarLink
              item={homeItem}
              pathname={pathname}
              onNavigate={onNavigate}
              userType={user.userType}
              compact={false}
            />
          ) : null}
          {renderUnreadGroup(false)}
          {otherItems.map((item) => (
            <SidebarLink
              key={item.href}
              item={item}
              pathname={pathname}
              onNavigate={onNavigate}
              userType={user.userType}
              compact={false}
            />
          ))}
        </nav>

        <div className="shrink-0 space-y-2 border-t border-[var(--shell-border)] p-3">
          {showSettings || showStaff ? (
            <AdminToolsMenu
              showSettings={showSettings}
              showStaff={showStaff}
              onNavigate={onNavigate}
            />
          ) : null}
          <Link
            href="/account"
            onClick={onNavigate}
            className="flex items-center gap-3 rounded-[var(--radius-lg)] bg-[var(--shell-hover)] p-2.5 transition-colors hover:bg-[var(--shell-active)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--shell-focus-ring)]"
          >
            <UserAvatar user={user} size="md" />
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium text-[var(--shell-text)]">
                {user.fullName}
              </p>
              <p className="truncate text-xs text-[var(--shell-muted)]">{roleLabel}</p>
            </div>
          </Link>
        </div>
      </aside>
    );
  }

  return (
    <aside
      className="shell-chrome fixed inset-y-0 left-0 z-30 flex h-screen w-[var(--sidebar-width)] flex-col border-r border-[var(--shell-border)] bg-[var(--shell-brand)] text-[var(--shell-text)]"
      aria-label="Main navigation"
    >
      <div className="flex shrink-0 flex-col items-center border-b border-[var(--shell-border)] px-1.5 py-3">
        <Logo compact className="h-11 w-11" />
      </div>

      <div className="flex min-h-0 flex-1 flex-col items-center">
        <nav
          className="flex h-[75%] w-full flex-col items-center justify-evenly px-1 pt-1"
          aria-label="Primary"
        >
          {homeItem ? (
            <SidebarLink
              item={homeItem}
              pathname={pathname}
              onNavigate={onNavigate}
              userType={user.userType}
              compact
            />
          ) : null}

          {renderUnreadGroup(true)}

          {otherItems.map((item) => (
            <SidebarLink
              key={item.href}
              item={item}
              pathname={pathname}
              onNavigate={onNavigate}
              userType={user.userType}
              compact
            />
          ))}

          {showSettings || showStaff ? (
            <Link
              href={showSettings ? '/admin' : '/staff'}
              className="mx-auto flex w-full flex-col items-center gap-0.5 rounded-lg px-1 py-1.5 text-[var(--shell-muted)] hover:bg-[var(--shell-hover)] hover:text-[var(--shell-text)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--shell-focus-ring)]"
              title="Admin tools"
              onClick={onNavigate}
            >
              <Settings
                className="h-[var(--sidebar-icon)] w-[var(--sidebar-icon)] stroke-[1.5]"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              <span className="w-full truncate text-center text-[9px] font-medium leading-tight">
                Admin
              </span>
            </Link>
          ) : null}
        </nav>
      </div>

      <div className="flex shrink-0 justify-center border-t border-[var(--shell-border)] px-2 py-3">
        <Link
          href="/account"
          onClick={onNavigate}
          className="inline-flex items-center justify-center rounded-[var(--radius-lg)] bg-[var(--shell-hover)] p-1.5 transition-colors hover:bg-[var(--shell-active)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--shell-focus-ring)]"
          title={user.fullName}
        >
          <UserAvatar user={user} size="sm" />
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
  compact,
}: {
  item: NavItem;
  pathname: string;
  onNavigate?: () => void;
  userType: 'internal' | 'external';
  compact?: boolean;
}) {
  const isActive =
    pathname === item.href || pathname.startsWith(`${item.href}/`);
  const Icon = item.icon;
  const label = getNavItemLabel(item, userType);

  const tourId =
    item.href === '/dashboard'
      ? 'nav-home'
      : item.href === '/chat'
        ? 'nav-chat'
        : item.href === '/orders'
          ? 'nav-orders'
          : item.href === '/clients'
            ? 'nav-clients'
            : item.href === '/team'
              ? 'nav-team'
              : undefined;

  const shortLabel =
    item.href === '/orders'
      ? 'Orders'
      : item.href === '/dashboard'
        ? 'Home'
        : label.split(' ')[0] ?? label;

  return (
    <Link
      href={item.href}
      onClick={onNavigate}
      title={compact ? label : undefined}
      data-tour={tourId}
      className={cn(
        'group relative font-medium transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--shell-focus-ring)]',
        compact
          ? 'mx-auto flex w-full flex-col items-center gap-0.5 rounded-lg px-1 py-1'
          : 'flex min-h-10 items-center gap-3 rounded-lg px-3 py-2',
        isActive
          ? 'bg-[var(--shell-active)] text-[var(--shell-text)]'
          : 'text-[var(--shell-muted)] hover:bg-[var(--shell-hover)] hover:text-[var(--shell-text)]',
        isActive &&
          !compact &&
          'shadow-[inset_3px_0_0_0_rgba(255,255,255,0.65)]',
      )}
      aria-current={isActive ? 'page' : undefined}
    >
      <span
        className={cn(
          'relative inline-flex shrink-0 items-center justify-center',
          compact
            ? 'h-[var(--sidebar-icon)] w-[var(--sidebar-icon)]'
            : 'h-5 w-5',
          isActive ? 'text-white' : 'text-current',
        )}
      >
        <Icon
          className={cn(
            compact
              ? 'h-[var(--sidebar-icon)] w-[var(--sidebar-icon)]'
              : 'h-5 w-5',
            isActive
              ? 'fill-white stroke-white stroke-[1.5]'
              : 'fill-none stroke-current stroke-[1.5]',
          )}
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden
        />
        {compact && item.badge ? (
          <span className="absolute -right-1.5 -top-1.5 flex h-3.5 min-w-3.5 items-center justify-center rounded-full bg-[var(--shell-badge)] px-0.5 text-[8px] font-semibold leading-none text-[var(--shell-badge-text)] ring-2 ring-[var(--shell-brand)]">
            {item.badge > 9 ? '9+' : item.badge}
          </span>
        ) : null}
      </span>
      {compact ? (
        <span className="w-full truncate text-center text-[9px] font-medium leading-tight">
          {shortLabel}
        </span>
      ) : (
        <>
          <span className="min-w-0 flex-1 truncate text-[length:var(--text-nav)] font-medium leading-[var(--leading-tight)]">
            {label}
          </span>
          {item.badge ? (
            <span
              className={cn(
                'shrink-0 rounded-full px-1.5 py-0.5 text-[10px] font-semibold leading-none',
                isActive
                  ? 'bg-white/20 text-white'
                  : 'bg-[var(--shell-badge)] text-[var(--shell-badge-text)]',
              )}
            >
              {item.badge > 99 ? '99+' : item.badge}
            </span>
          ) : null}
        </>
      )}
    </Link>
  );
}
