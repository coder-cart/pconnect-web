'use client';

import { ReactNode, useState } from 'react';
import {
  ChevronDown,
  Hash,
  Lock,
  Mail,
  MailOpen,
  MoreHorizontal,
  Plus,
  Search,
  Trash2,
  Users,
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import {
  ContextMenu,
  ContextMenuItem,
  ContextMenuSeparator,
} from '@/components/ui/ContextMenu';
import { UserAvatar } from '@/components/ui/UserAvatar';
import {
  ChatChannel,
  ChatDmPeer,
  getChannelLabel,
  isDirectOrGroupChannel,
  PendingChannelInvite,
} from '@/lib/chat-types';
import { cn } from '@/lib/cn';
import { isAway, presenceSubtitle } from '@/lib/user-presence';

interface ChannelSidebarProps {
  channels: ChatChannel[];
  selectedChannelId: string | null;
  pendingInvites: PendingChannelInvite[];
  acceptingInviteId: string | null;
  canCreateChannel: boolean;
  canAddConnection: boolean;
  showInternalSections: boolean;
  internalEmptyText?: string;
  onSelectChannel: (channelId: string) => void;
  onCreateChannel: () => void;
  onAddConnection: () => void;
  onStartDirectMessage: () => void;
  onAcceptInvite: (invite: PendingChannelInvite) => void;
  onHideDm?: (channelId: string) => void;
  onMarkDmRead?: (channelId: string) => void;
  onMarkDmUnread?: (channelId: string) => void;
  className?: string;
}

function ChannelIcon({ type }: { type: string }) {
  const className = 'h-[15px] w-[15px] shrink-0';
  switch (type) {
    case 'private':
    case 'client_shared':
      return <Lock className={className} aria-hidden />;
    case 'group':
      return <Users className={className} aria-hidden />;
    case 'public':
    default:
      return <Hash className={className} aria-hidden />;
  }
}

function DmPeerAvatar({ peer }: { peer: ChatDmPeer }) {
  const away = isAway(peer.presenceStatus);
  return (
    <span className="relative shrink-0" title={away ? 'Away' : 'Active'}>
      <UserAvatar
        user={{
          id: peer.id,
          fullName: peer.fullName,
          avatarUpdatedAt: peer.avatarUpdatedAt,
        }}
        size="xs"
        className="ring-1 ring-[var(--shell-border)]"
      />
      {/* Slack-style: filled green = Active, hollow outline = Away */}
      <span
        className={cn(
          'absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full border-2 border-[var(--chat-sidebar-bg)]',
          away ? 'bg-transparent' : 'bg-[var(--success)]',
        )}
        style={
          away
            ? { boxShadow: 'inset 0 0 0 1.5px var(--shell-muted)' }
            : undefined
        }
        aria-label={away ? 'Away' : 'Active'}
      />
    </span>
  );
}

function DmHoverCard({ peer }: { peer: ChatDmPeer }) {
  return (
    <div
      className="pointer-events-none absolute left-0 top-full z-40 mt-1 w-56 max-w-[calc(100vw-2rem)] rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--surface)] p-3 shadow-[var(--shadow-md)] lg:left-full lg:top-0 lg:mt-0 lg:ml-2"
      role="tooltip"
    >
      <div className="flex items-start gap-3">
        <UserAvatar
          user={{
            id: peer.id,
            fullName: peer.fullName,
            avatarUpdatedAt: peer.avatarUpdatedAt,
          }}
          size="md"
        />
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold text-[var(--foreground)]">
            {peer.fullName}
          </p>
          {peer.jobTitle ? (
            <p className="mt-0.5 truncate text-xs text-[var(--muted)]">
              {peer.jobTitle}
            </p>
          ) : null}
          <p className="mt-1 text-xs font-medium text-[var(--foreground)]">
            {presenceSubtitle(peer)}
          </p>
        </div>
      </div>
    </div>
  );
}

function ChannelButton({
  channel,
  isActive,
  emphasize = false,
  onSelect,
  onHideDm,
  onMarkDmRead,
  onMarkDmUnread,
}: {
  channel: ChatChannel;
  isActive: boolean;
  emphasize?: boolean;
  onSelect: (channelId: string) => void;
  onHideDm?: (channelId: string) => void;
  onMarkDmRead?: (channelId: string) => void;
  onMarkDmUnread?: (channelId: string) => void;
}) {
  const [hovering, setHovering] = useState(false);
  const [menuSignal, setMenuSignal] = useState<{
    x: number;
    y: number;
    key: number;
  } | null>(null);
  const unreadCount = channel.unreadCount ?? 0;
  const label = getChannelLabel(channel);
  const isDirect = channel.type === 'direct';
  const peer = channel.dmPeer ?? null;
  const showTypeIcon = !isDirect;
  const showDmMenu = isDirect && Boolean(onHideDm || onMarkDmRead || onMarkDmUnread);

  const row = (
    <div
      className="relative min-w-0"
      onMouseEnter={() => {
        if (window.matchMedia('(hover: hover)').matches) setHovering(true);
      }}
      onMouseLeave={() => setHovering(false)}
    >
      <div
        className={cn(
          'group flex min-h-[2.125rem] w-full min-w-0 items-center gap-0.5 rounded-[var(--radius-md)] transition-colors',
          isActive
            ? 'bg-[var(--shell-active)] text-[var(--shell-text)] shadow-[inset_3px_0_0_0_rgba(255,255,255,0.55)]'
            : 'text-[var(--shell-muted)] hover:bg-[var(--shell-hover)] hover:text-[var(--shell-text)]',
        )}
      >
        <button
          type="button"
          onClick={() => onSelect(channel.id)}
          className="flex min-h-[2.125rem] min-w-0 flex-1 items-center gap-2.5 rounded-[var(--radius-md)] px-2.5 py-1.5 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--shell-focus-ring)]"
        >
          {isDirect && peer ? (
            <DmPeerAvatar peer={peer} />
          ) : isDirect ? (
            <UserAvatar
              user={{
                id: channel.dmPeerUserId ?? channel.id,
                fullName: label,
              }}
              size="xs"
              className="shrink-0"
            />
          ) : showTypeIcon ? (
            <span
              className={cn(
                'flex h-[1.125rem] w-[1.125rem] shrink-0 items-center justify-center',
                isActive || unreadCount > 0
                  ? 'text-[var(--shell-text)]'
                  : 'text-[var(--shell-muted)] group-hover:text-[var(--shell-text)]',
              )}
              aria-hidden
            >
              <ChannelIcon type={channel.type} />
            </span>
          ) : null}
          <span className="min-w-0 flex-1">
            <span className="flex min-w-0 items-center gap-2">
              <span
                className={cn(
                  'block min-w-0 flex-1 truncate text-[13px] leading-snug sm:text-sm',
                  emphasize || isActive || unreadCount > 0
                    ? 'font-semibold text-[var(--shell-text)]'
                    : 'font-medium text-[var(--shell-muted)] group-hover:text-[var(--shell-text)]',
                )}
              >
                {label}
                {peer?.statusEmoji ? (
                  <span className="ml-1 font-normal" aria-hidden>
                    {peer.statusEmoji}
                  </span>
                ) : null}
              </span>
              {unreadCount > 0 ? (
                <span className="shrink-0 rounded-full bg-[var(--shell-badge)] px-1.5 py-0.5 text-[10px] font-semibold leading-none text-[var(--shell-badge-text)]">
                  {unreadCount}
                </span>
              ) : null}
            </span>
          </span>
        </button>
        {showDmMenu ? (
          <button
            type="button"
            className={cn(
              'mr-1 inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-[var(--radius-sm)] text-[var(--shell-muted)] hover:bg-black/10 hover:text-[var(--shell-text)]',
              'opacity-100 [@media(pointer:fine)]:opacity-0 [@media(pointer:fine)]:group-hover:opacity-100 [@media(pointer:fine)]:focus-visible:opacity-100',
            )}
            aria-label={`Actions for ${label}`}
            onClick={(event) => {
              event.preventDefault();
              event.stopPropagation();
              setMenuSignal({
                x: event.clientX,
                y: event.clientY,
                key: Date.now(),
              });
            }}
          >
            <MoreHorizontal className="h-4 w-4" />
          </button>
        ) : null}
      </div>
      {hovering && isDirect && peer ? <DmHoverCard peer={peer} /> : null}
    </div>
  );

  if (!showDmMenu) {
    return row;
  }

  const menu = (
    <>
      {unreadCount > 0 && onMarkDmRead ? (
        <ContextMenuItem onClick={() => onMarkDmRead(channel.id)}>
          <MailOpen className="h-4 w-4" />
          Mark as read
        </ContextMenuItem>
      ) : null}
      {unreadCount === 0 && onMarkDmUnread ? (
        <ContextMenuItem onClick={() => onMarkDmUnread(channel.id)}>
          <Mail className="h-4 w-4" />
          Mark as unread
        </ContextMenuItem>
      ) : null}
      {(onMarkDmRead || onMarkDmUnread) && onHideDm ? (
        <ContextMenuSeparator />
      ) : null}
      {onHideDm ? (
        <ContextMenuItem
          destructive
          onClick={() => onHideDm(channel.id)}
        >
          <Trash2 className="h-4 w-4" />
          Delete conversation
        </ContextMenuItem>
      ) : null}
    </>
  );

  return (
    <ContextMenu menu={menu} openSignal={menuSignal} className="min-w-0">
      {row}
    </ContextMenu>
  );
}

function SidebarSection({
  title,
  unreadCount = 0,
  action,
  collapsed,
  onToggle,
  children,
}: {
  title: string;
  unreadCount?: number;
  action?: ReactNode;
  collapsed: boolean;
  onToggle: () => void;
  children: ReactNode;
}) {
  return (
    <div className="mb-4">
      <div className="mb-2 flex items-center justify-between gap-1 px-2">
        <button
          type="button"
          onClick={onToggle}
          className="flex min-w-0 items-center gap-1.5 text-[13px] font-bold leading-snug tracking-tight text-[var(--shell-text)] transition-colors hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--shell-focus-ring)]"
        >
          <ChevronDown
            className={cn(
              'h-3.5 w-3.5 shrink-0 text-[var(--shell-muted)] transition-transform',
              collapsed && '-rotate-90',
            )}
          />
          <span className="truncate">{title}</span>
          {unreadCount > 0 ? (
            <span className="shrink-0 rounded-full bg-[var(--shell-badge)] px-1.5 py-0.5 text-[10px] font-semibold leading-none text-[var(--shell-badge-text)]">
              {unreadCount > 99 ? '99+' : unreadCount}
            </span>
          ) : null}
        </button>
        {action}
      </div>
      {!collapsed ? <div className="space-y-1">{children}</div> : null}
    </div>
  );
}

type SidebarFilter = 'all' | 'channels' | 'dms' | 'unread';

function uniqueChannels(channels: ChatChannel[]) {
  const seen = new Set<string>();
  return channels.filter((channel) => {
    if (seen.has(channel.id)) return false;
    seen.add(channel.id);
    return true;
  });
}

function unreadTotal(channels: ChatChannel[]) {
  return channels.reduce((sum, channel) => sum + (channel.unreadCount ?? 0), 0);
}

function sortConversations(channels: ChatChannel[]) {
  return [...channels].sort((left, right) => {
    const leftUnread = (left.unreadCount ?? 0) > 0 ? 1 : 0;
    const rightUnread = (right.unreadCount ?? 0) > 0 ? 1 : 0;
    if (leftUnread !== rightUnread) return rightUnread - leftUnread;

    const leftTime = left.latestMessage?.createdAt ?? '';
    const rightTime = right.latestMessage?.createdAt ?? '';
    if (leftTime !== rightTime) return rightTime.localeCompare(leftTime);

    return getChannelLabel(left).localeCompare(getChannelLabel(right));
  });
}

export function ChannelSidebar({
  channels,
  selectedChannelId,
  pendingInvites,
  acceptingInviteId,
  canCreateChannel,
  canAddConnection,
  showInternalSections,
  internalEmptyText = 'No internal connections yet.',
  onSelectChannel,
  onCreateChannel,
  onAddConnection,
  onStartDirectMessage,
  onAcceptInvite,
  onHideDm,
  onMarkDmRead,
  onMarkDmUnread,
  className,
}: ChannelSidebarProps) {
  const [teamCollapsed, setTeamCollapsed] = useState(false);
  const [clientsCollapsed, setClientsCollapsed] = useState(false);
  const [dmsCollapsed, setDmsCollapsed] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [filter, setFilter] = useState<SidebarFilter>('all');

  const normalizedQuery = searchQuery.trim().toLowerCase();
  const totalUnread = channels.reduce(
    (sum, channel) => sum + (channel.unreadCount ?? 0),
    0,
  );

  const matchesSearch = (channel: ChatChannel) => {
    if (!normalizedQuery) return true;

    const label = getChannelLabel(channel).toLowerCase();
    const orgName = channel.clientOrganizationName?.toLowerCase() ?? '';

    return (
      label.includes(normalizedQuery) ||
      channel.name.toLowerCase().includes(normalizedQuery) ||
      orgName.includes(normalizedQuery)
    );
  };

  const visibleChannels = uniqueChannels(channels).filter(matchesSearch);
  const includeUnread = (channel: ChatChannel) =>
    filter !== 'unread' || (channel.unreadCount ?? 0) > 0;

  const clientChannels = sortConversations(
    visibleChannels.filter(
      (channel) => channel.type === 'client_shared' && includeUnread(channel),
    ),
  );
  const teamChannels = sortConversations(
    visibleChannels.filter(
      (channel) =>
        showInternalSections &&
        (channel.type === 'public' || channel.type === 'private') &&
        includeUnread(channel),
    ),
  );
  const directMessages = sortConversations(
    visibleChannels.filter(
      (channel) => channel.type === 'direct' && includeUnread(channel),
    ),
  );
  const groupMessages = sortConversations(
    visibleChannels.filter(
      (channel) => channel.type === 'group' && includeUnread(channel),
    ),
  );

  const hasVisibleResults =
    clientChannels.length > 0 ||
    teamChannels.length > 0 ||
    directMessages.length > 0 ||
    groupMessages.length > 0;

  const showChannels =
    filter === 'all' || filter === 'channels' || filter === 'unread';
  const showDms = filter === 'all' || filter === 'dms' || filter === 'unread';
  const showSection = (count: number) =>
    filter === 'unread' || Boolean(normalizedQuery) ? count > 0 : true;

  return (
    <aside
      className={cn(
        'chat-sidebar flex h-full min-h-0 flex-col overflow-hidden border-r border-[var(--shell-border)] bg-[var(--chat-sidebar-bg)] text-[var(--shell-text)]',
        className,
      )}
    >
      <div className="chat-inset shrink-0 space-y-3 border-b border-[var(--shell-border)]">
        <Button
          type="button"
          className="w-full"
          onClick={onStartDirectMessage}
        >
          <Plus className="h-4 w-4" />
          New message
        </Button>
        <div className="flex gap-1 rounded-[var(--radius-md)] bg-[var(--shell-hover)] p-1">
          {(
            [
              { id: 'all', label: 'All' },
              { id: 'channels', label: 'Channels' },
              { id: 'dms', label: 'DMs' },
              { id: 'unread', label: 'Unread', badge: totalUnread },
            ] as const
          ).map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => setFilter(item.id)}
              className={cn(
                'inline-flex flex-1 items-center justify-center gap-1 rounded-[var(--radius-sm)] px-2 py-1.5 text-[13px] font-semibold leading-none transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--shell-focus-ring)]',
                filter === item.id
                  ? 'bg-[var(--shell-active)] text-[var(--shell-text)] shadow-sm'
                  : 'text-[var(--shell-muted)] hover:bg-black/10 hover:text-[var(--shell-text)]',
              )}
            >
              {item.label}
              {'badge' in item && item.badge > 0 ? (
                <span className="rounded-full bg-[var(--shell-badge)] px-1.5 py-0.5 text-[10px] font-semibold leading-none text-[var(--shell-badge-text)]">
                  {item.badge > 99 ? '99+' : item.badge}
                </span>
              ) : null}
            </button>
          ))}
        </div>
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--shell-muted)]" />
          <input
            type="search"
            value={searchQuery}
            onChange={(event) => setSearchQuery(event.target.value)}
            placeholder="Search conversations..."
            aria-label="Search channels and direct messages"
            className="shell-chrome-input h-9 w-full rounded-[var(--radius-md)] border pl-9 pr-3 text-[13px] sm:text-sm"
          />
        </div>
      </div>
      <div className="shell-scroll min-h-0 flex-1 overflow-y-auto overscroll-y-contain px-2 py-3 sm:px-2.5 sm:py-3.5">
        {pendingInvites.length > 0 ? (
          <div className="mb-4 space-y-2 border-b border-[var(--shell-border)] px-2 pb-4">
            <p className="text-[13px] font-bold tracking-tight text-[var(--shell-text)]">
              Pending invites
            </p>
            {pendingInvites.map((invite) => (
              <div
                key={invite.id}
                className="rounded-[var(--radius-md)] border border-[var(--shell-border)] bg-[var(--shell-hover)] p-2"
              >
                <p className="text-sm font-medium">
                  {invite.channel.name.replace(/^#/, '')}
                </p>
                <Button
                  size="sm"
                  className="mt-2 w-full"
                  disabled={acceptingInviteId === invite.id}
                  onClick={() => onAcceptInvite(invite)}
                >
                  Accept invite
                </Button>
              </div>
            ))}
          </div>
        ) : null}

        {!hasVisibleResults && (filter === 'unread' || Boolean(normalizedQuery)) ? (
          <p className="px-2.5 py-3 text-[13px] leading-snug text-[var(--shell-muted)] sm:text-sm">
            {normalizedQuery
              ? 'No channels or direct messages match your search.'
              : filter === 'unread'
                ? 'No unread conversations.'
                : 'No conversations yet.'}
          </p>
        ) : null}

        {showChannels && showSection(clientChannels.length) ? (
          <SidebarSection
            title="External Connections"
            unreadCount={unreadTotal(clientChannels)}
            collapsed={clientsCollapsed}
            onToggle={() => setClientsCollapsed((current) => !current)}
            action={
              canAddConnection ? (
                <button
                  type="button"
                  onClick={onAddConnection}
                  className="rounded-[var(--radius-sm)] p-1 text-[var(--shell-muted)] hover:bg-[var(--shell-hover)] hover:text-[var(--shell-text)]"
                  aria-label="Add external connection"
                >
                  <Plus className="h-4 w-4" />
                </button>
              ) : null
            }
          >
            {clientChannels.length === 0 ? (
              <p className="px-2.5 py-1.5 text-[13px] leading-snug text-[var(--shell-muted)]">
                Client connections appear here.
              </p>
            ) : (
              clientChannels.map((channel) => (
                <ChannelButton
                  key={channel.id}
                  channel={channel}
                  isActive={channel.id === selectedChannelId}
                  onSelect={onSelectChannel}
                />
              ))
            )}
          </SidebarSection>
        ) : null}

        {showInternalSections &&
        showChannels &&
        showSection(teamChannels.length) ? (
          <SidebarSection
            title="Internal Connections"
            unreadCount={unreadTotal(teamChannels)}
            collapsed={teamCollapsed}
            onToggle={() => setTeamCollapsed((current) => !current)}
            action={
              canCreateChannel ? (
                <button
                  type="button"
                  onClick={onCreateChannel}
                  className="rounded-[var(--radius-sm)] p-1 text-[var(--shell-muted)] hover:bg-[var(--shell-hover)] hover:text-[var(--shell-text)]"
                  aria-label="Create channel"
                >
                  <Plus className="h-4 w-4" />
                </button>
              ) : null
            }
          >
            {teamChannels.length === 0 ? (
              <p className="px-2.5 py-1.5 text-[13px] leading-snug text-[var(--shell-muted)]">
                {internalEmptyText}
              </p>
            ) : (
              teamChannels.map((channel) => (
                <ChannelButton
                  key={channel.id}
                  channel={channel}
                  isActive={channel.id === selectedChannelId}
                  onSelect={onSelectChannel}
                />
              ))
            )}
          </SidebarSection>
        ) : null}

        {showDms && showSection(directMessages.length) ? (
          <SidebarSection
            title="Direct Messages"
            unreadCount={unreadTotal(directMessages)}
            collapsed={dmsCollapsed}
            onToggle={() => setDmsCollapsed((current) => !current)}
            action={
              <button
                type="button"
                onClick={onStartDirectMessage}
                className="rounded-[var(--radius-sm)] p-1 text-[var(--shell-muted)] hover:bg-[var(--shell-hover)] hover:text-[var(--shell-text)]"
                aria-label="Start direct message"
              >
                <Plus className="h-4 w-4" />
              </button>
            }
          >
            {directMessages.length === 0 ? (
              <p className="px-2.5 py-1.5 text-[13px] leading-snug text-[var(--shell-muted)]">
                No direct messages yet.
              </p>
            ) : (
              directMessages.map((channel) => (
                <ChannelButton
                  key={channel.id}
                  channel={channel}
                  isActive={channel.id === selectedChannelId}
                  onSelect={onSelectChannel}
                  onHideDm={onHideDm}
                  onMarkDmRead={onMarkDmRead}
                  onMarkDmUnread={onMarkDmUnread}
                />
              ))
            )}
          </SidebarSection>
        ) : null}

        {showDms && groupMessages.length > 0 ? (
          <SidebarSection
            title="Group Messages"
            collapsed={false}
            onToggle={() => undefined}
          >
            {groupMessages.map((channel) => (
              <ChannelButton
                key={channel.id}
                channel={channel}
                isActive={channel.id === selectedChannelId}
                onSelect={onSelectChannel}
              />
            ))}
          </SidebarSection>
        ) : null}
      </div>
    </aside>
  );
}
