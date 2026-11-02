'use client';

import { ReactNode, useState } from 'react';
import { ChevronDown, Hash, Plus, Search, Users } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { ClientOrgLogo } from '@/components/ui/ClientOrgLogo';
import { UserAvatar } from '@/components/ui/UserAvatar';
import {
  ChatChannel,
  ChatDmPeer,
  getChannelLabel,
  isDirectOrGroupChannel,
  PendingChannelInvite,
} from '@/lib/chat-types';
import { cn } from '@/lib/cn';

interface ChannelSidebarProps {
  channels: ChatChannel[];
  selectedChannelId: string | null;
  pendingInvites: PendingChannelInvite[];
  acceptingInviteId: string | null;
  canCreateChannel: boolean;
  canAddConnection: boolean;
  showInternalSections: boolean;
  onSelectChannel: (channelId: string) => void;
  onCreateChannel: () => void;
  onAddConnection: () => void;
  onStartDirectMessage: () => void;
  onAcceptInvite: (invite: PendingChannelInvite) => void;
  className?: string;
}

function ChannelIcon({ type }: { type: string }) {
  if (type === 'group') {
    return <Users className="h-4 w-4 shrink-0" />;
  }

  return <Hash className="h-4 w-4 shrink-0" />;
}

function DmPeerAvatar({ peer }: { peer: ChatDmPeer }) {
  const away = peer.presenceStatus === 'away';
  return (
    <span className="relative shrink-0">
      <UserAvatar
        user={{
          id: peer.id,
          fullName: peer.fullName,
          avatarUpdatedAt: peer.avatarUpdatedAt,
        }}
        size="xs"
        className="ring-1 ring-[var(--shell-border)]"
      />
      <span
        className={cn(
          'absolute -bottom-0.5 -right-0.5 h-2 w-2 rounded-full border border-[var(--chat-sidebar-bg)]',
          away ? 'bg-[var(--shell-muted)]' : 'bg-[var(--success)]',
        )}
        aria-hidden
      />
    </span>
  );
}

function DmHoverCard({ peer }: { peer: ChatDmPeer }) {
  const away = peer.presenceStatus === 'away';
  const statusLine = [peer.statusEmoji, peer.statusText]
    .filter(Boolean)
    .join(' ')
    .trim();

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

function ChannelButton({
  channel,
  isActive,
  emphasize = false,
  onSelect,
}: {
  channel: ChatChannel;
  isActive: boolean;
  emphasize?: boolean;
  onSelect: (channelId: string) => void;
}) {
  const [hovering, setHovering] = useState(false);
  const unreadCount = channel.unreadCount ?? 0;
  const label = getChannelLabel(channel);
  const isDirect = channel.type === 'direct';
  const peer = channel.dmPeer ?? null;
  const showHash =
    channel.type !== 'direct' &&
    channel.type !== 'group' &&
    channel.type !== 'client_shared';

  return (
    <div
      className="relative min-w-0"
      onMouseEnter={() => {
        if (window.matchMedia('(hover: hover)').matches) setHovering(true);
      }}
      onMouseLeave={() => setHovering(false)}
    >
      <button
        type="button"
        onClick={() => onSelect(channel.id)}
        className={cn(
          'flex min-h-10 w-full min-w-0 items-start gap-2 rounded-[var(--radius-md)] px-2 py-1.5 text-left text-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--shell-focus-ring)] sm:min-h-9',
          isActive
            ? 'bg-[var(--shell-active)] text-[var(--shell-text)] shadow-[inset_3px_0_0_0_rgba(255,255,255,0.45)]'
            : 'text-[var(--shell-muted)] hover:bg-[var(--shell-hover)] hover:text-[var(--shell-text)]',
        )}
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
            className="mt-0.5 shrink-0"
          />
        ) : channel.type === 'client_shared' && channel.clientOrganizationId ? (
          <ClientOrgLogo
            clientId={channel.clientOrganizationId}
            name={channel.clientOrganizationName ?? label}
            logoUpdatedAt={channel.clientOrganizationLogoUpdatedAt}
            className="mt-0.5 h-8 w-8"
          />
        ) : (
          <span
            className={cn(
              'mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-[var(--radius-md)]',
              isActive
                ? 'bg-white/15 text-[var(--shell-text)]'
                : 'bg-[var(--shell-hover)] text-[var(--shell-muted)]',
            )}
          >
            <ChannelIcon type={channel.type} />
          </span>
        )}
        <span className="min-w-0 flex-1 pt-0.5">
          <span className="flex items-center gap-2">
            <span
              className={cn(
                'block min-w-0 flex-1 truncate',
                emphasize || isActive || unreadCount > 0
                  ? 'font-semibold text-[var(--shell-text)]'
                  : 'font-medium text-[var(--shell-muted)]',
              )}
            >
              {showHash ? '#' : ''}
              {label}
            </span>
            {unreadCount > 0 ? (
              <span className="shrink-0 rounded-full bg-[var(--shell-badge)] px-1.5 py-0.5 text-[10px] font-semibold text-[var(--shell-badge-text)]">
                {unreadCount}
              </span>
            ) : null}
          </span>
          {isDirect && channel.latestMessage?.body ? (
            <span className="mt-0.5 block truncate text-[11px] text-[var(--shell-muted)]">
              {channel.latestMessage.body}
            </span>
          ) : channel.clientOrganizationName &&
            channel.type === 'client_shared' &&
            channel.clientOrganizationName !== label ? (
            <span className="mt-0.5 block truncate text-[11px] text-[var(--shell-muted)]">
              {channel.clientOrganizationName}
            </span>
          ) : channel.type === 'public' || channel.type === 'private' ? (
            <span className="mt-0.5 block truncate text-[11px] capitalize text-[var(--shell-muted)]">
              {channel.type} channel
            </span>
          ) : null}
        </span>
      </button>
      {hovering && isDirect && peer ? <DmHoverCard peer={peer} /> : null}
    </div>
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
    <div className="mb-3">
      <div className="mb-1.5 flex items-center justify-between px-1.5">
        <button
          type="button"
          onClick={onToggle}
          className="flex min-w-0 items-center gap-1 text-[11px] font-semibold uppercase tracking-wide text-[var(--shell-muted)] transition-colors hover:text-[var(--shell-text)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--shell-focus-ring)]"
        >
          <ChevronDown
            className={cn('h-3.5 w-3.5 shrink-0 transition-transform', collapsed && '-rotate-90')}
          />
          <span className="truncate">{title}</span>
          {unreadCount > 0 ? (
            <span className="shrink-0 rounded-full bg-[var(--shell-badge)] px-1.5 text-[10px] font-semibold normal-case tracking-normal text-[var(--shell-badge-text)]">
              {unreadCount > 99 ? '99+' : unreadCount}
            </span>
          ) : null}
        </button>
        {action}
      </div>
      {!collapsed ? <div className="space-y-0.5">{children}</div> : null}
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
  onSelectChannel,
  onCreateChannel,
  onAddConnection,
  onStartDirectMessage,
  onAcceptInvite,
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
      <div className="chat-inset shrink-0 space-y-2.5 border-b border-[var(--shell-border)]">
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
                'inline-flex flex-1 items-center justify-center gap-1 rounded-[var(--radius-sm)] px-2 py-1.5 text-xs font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--shell-focus-ring)]',
                filter === item.id
                  ? 'bg-[var(--shell-active)] text-[var(--shell-text)] shadow-sm'
                  : 'text-[var(--shell-muted)] hover:text-[var(--shell-text)]',
              )}
            >
              {item.label}
              {'badge' in item && item.badge > 0 ? (
                <span className="rounded-full bg-[var(--shell-badge)] px-1.5 text-[10px] font-semibold text-[var(--shell-badge-text)]">
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
            placeholder="Search channels..."
            aria-label="Search channels and direct messages"
            className="shell-chrome-input h-9 w-full rounded-[var(--radius-md)] border pl-9 pr-3 text-sm"
          />
        </div>
      </div>
      <div className="shell-scroll min-h-0 flex-1 overflow-y-auto overscroll-y-contain px-1.5 py-2 sm:px-2 sm:py-2.5">
        {pendingInvites.length > 0 ? (
          <div className="mb-3 space-y-1.5 border-b border-[var(--shell-border)] px-1.5 pb-3">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-[var(--shell-muted)]">
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
          <p className="px-2 py-3 text-sm text-[var(--shell-muted)]">
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
          >
            {clientChannels.length === 0 ? (
              <p className="px-2 py-1.5 text-xs text-[var(--shell-muted)]">
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
              canAddConnection ? (
                <button
                  type="button"
                  onClick={onAddConnection}
                  className="rounded-[var(--radius-sm)] p-1 text-[var(--shell-muted)] hover:bg-[var(--shell-hover)] hover:text-[var(--shell-text)]"
                  aria-label="Add connection"
                >
                  <Plus className="h-4 w-4" />
                </button>
              ) : canCreateChannel ? (
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
              <p className="px-2 py-1.5 text-xs text-[var(--shell-muted)]">
                No internal connections yet.
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
            title="Direct messages"
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
              <p className="px-2 py-1.5 text-xs text-[var(--shell-muted)]">
                No direct messages yet.
              </p>
            ) : (
              directMessages.map((channel) => (
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

        {showDms && groupMessages.length > 0 ? (
          <SidebarSection
            title="Group messages"
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
