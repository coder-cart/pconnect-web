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
  PendingChannelInvite,
} from '@/lib/chat-types';
import { cn } from '@/lib/cn';

interface ChannelSidebarProps {
  channels: ChatChannel[];
  selectedChannelId: string | null;
  pendingInvites: PendingChannelInvite[];
  acceptingInviteId: string | null;
  canCreateChannel: boolean;
  onSelectChannel: (channelId: string) => void;
  onCreateChannel: () => void;
  onCreateExternalConnection?: () => void;
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
          'absolute -bottom-0.5 -right-0.5 h-2 w-2 rounded-full border border-[var(--shell-brand)]',
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
      className="relative"
      onMouseEnter={() => {
        if (window.matchMedia('(hover: hover)').matches) setHovering(true);
      }}
      onMouseLeave={() => setHovering(false)}
    >
      <button
        type="button"
        onClick={() => onSelect(channel.id)}
        className={cn(
          'flex min-h-touch w-full items-start gap-2.5 rounded-[var(--radius-md)] px-2.5 py-2 text-left text-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--shell-focus-ring)]',
          isActive
            ? 'bg-[var(--shell-active)] text-[var(--shell-text)] shadow-[inset_3px_0_0_0_rgba(255,255,255,0.55)]'
            : 'text-[var(--shell-muted)] hover:bg-[var(--shell-hover)] hover:text-[var(--shell-text)]',
        )}
        title={label}
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
          {channel.clientOrganizationName && channel.type === 'client_shared' ? (
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
  action,
  collapsed,
  onToggle,
  children,
}: {
  title: string;
  action?: ReactNode;
  collapsed: boolean;
  onToggle: () => void;
  children: ReactNode;
}) {
  return (
    <div className="mb-4">
      <div className="mb-2 flex items-center justify-between px-2">
        <button
          type="button"
          onClick={onToggle}
          className="flex items-center gap-1 text-xs font-semibold uppercase tracking-wide text-[var(--shell-muted)] transition-colors hover:text-[var(--shell-text)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--shell-focus-ring)]"
        >
          <ChevronDown
            className={cn('h-3.5 w-3.5 transition-transform', collapsed && '-rotate-90')}
          />
          {title}
        </button>
        {action}
      </div>
      {!collapsed ? <div className="space-y-1">{children}</div> : null}
    </div>
  );
}

function SectionAddButton({
  label,
  onClick,
}: {
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="rounded-[var(--radius-sm)] p-1 text-[var(--shell-muted)] hover:bg-[var(--shell-hover)] hover:text-[var(--shell-text)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--shell-focus-ring)]"
      aria-label={label}
      title={label}
    >
      <Plus className="h-4 w-4" />
    </button>
  );
}

function sortByLabel(left: ChatChannel, right: ChatChannel) {
  return getChannelLabel(left).localeCompare(getChannelLabel(right));
}

type SidebarFilter = 'all' | 'channels' | 'dms' | 'unread';

export function ChannelSidebar({
  channels,
  selectedChannelId,
  pendingInvites,
  acceptingInviteId,
  canCreateChannel,
  onSelectChannel,
  onCreateChannel,
  onCreateExternalConnection,
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

  const unreadChannels = channels.filter(
    (channel) => (channel.unreadCount ?? 0) > 0 && matchesSearch(channel),
  );
  const unreadIds = new Set(unreadChannels.map((channel) => channel.id));

  const externalChannels = channels
    .filter(
      (channel) =>
        channel.type === 'client_shared' &&
        !unreadIds.has(channel.id) &&
        matchesSearch(channel),
    )
    .sort(sortByLabel);

  const internalChannels = channels
    .filter(
      (channel) =>
        (channel.type === 'public' || channel.type === 'private') &&
        !unreadIds.has(channel.id) &&
        matchesSearch(channel),
    )
    .sort(sortByLabel);

  const directMessages = channels
    .filter(
      (channel) =>
        channel.type === 'direct' &&
        !unreadIds.has(channel.id) &&
        matchesSearch(channel),
    )
    .sort(sortByLabel);

  const groupMessages = channels
    .filter(
      (channel) =>
        channel.type === 'group' &&
        !unreadIds.has(channel.id) &&
        matchesSearch(channel),
    )
    .sort(sortByLabel);

  const hasVisibleResults =
    unreadChannels.length > 0 ||
    externalChannels.length > 0 ||
    internalChannels.length > 0 ||
    directMessages.length > 0 ||
    groupMessages.length > 0;

  const showChannels = filter === 'all' || filter === 'channels';
  const showDms = filter === 'all' || filter === 'dms';
  const showUnreadOnly = filter === 'unread';

  return (
    <div
      className={cn(
        'shell-chrome flex h-full min-h-0 flex-col overflow-hidden rounded-[var(--radius-lg)] border border-[var(--shell-border)] bg-[#1d2353] text-[var(--shell-text)]',
        className,
      )}
    >
      <div className="shrink-0 space-y-3 border-b border-[var(--shell-border)] p-3">
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
            className="shell-chrome-input h-10 w-full rounded-[var(--radius-md)] border pl-9 pr-3 text-sm"
          />
        </div>
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto overscroll-y-contain scroll-smooth px-2 py-3">
        {pendingInvites.length > 0 ? (
          <div className="mb-4 space-y-2 border-b border-[var(--shell-border)] px-2 pb-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-[var(--shell-muted)]">
              Pending invites
            </p>
            {pendingInvites.map((invite) => (
              <div
                key={invite.id}
                className="rounded-[var(--radius-md)] border border-[var(--shell-border)] bg-[var(--shell-hover)] p-2"
              >
                <p className="truncate text-sm font-medium text-[var(--shell-text)]">
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

        {!hasVisibleResults ? (
          <p className="px-3 py-4 text-sm text-[var(--shell-muted)]">
            {normalizedQuery
              ? 'No channels or direct messages match your search.'
              : 'No conversations yet.'}
          </p>
        ) : null}

        {(showUnreadOnly || unreadChannels.length > 0) &&
        (showUnreadOnly || filter === 'all') ? (
          <SidebarSection
            title={showUnreadOnly ? 'Unread' : 'Pinned'}
            collapsed={false}
            onToggle={() => undefined}
          >
            {(showUnreadOnly ? unreadChannels : unreadChannels.slice(0, 4)).map(
              (channel) => (
                <ChannelButton
                  key={channel.id}
                  channel={channel}
                  isActive={channel.id === selectedChannelId}
                  emphasize
                  onSelect={onSelectChannel}
                />
              ),
            )}
            {showUnreadOnly && unreadChannels.length === 0 ? (
              <p className="px-3 py-2 text-xs text-[var(--shell-muted)]">
                No unread conversations.
              </p>
            ) : null}
          </SidebarSection>
        ) : null}

        {showChannels && !showUnreadOnly ? (
          <SidebarSection
            title="External Connections"
            collapsed={clientsCollapsed}
            onToggle={() => setClientsCollapsed((current) => !current)}
            action={
              canCreateChannel && onCreateExternalConnection ? (
                <SectionAddButton
                  label="Create external connection"
                  onClick={onCreateExternalConnection}
                />
              ) : null
            }
          >
            {externalChannels.length === 0 ? (
              <p className="px-3 py-2 text-xs text-[var(--shell-muted)]">
                Client connections appear here.
              </p>
            ) : (
              externalChannels.map((channel) => (
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

        {showChannels && !showUnreadOnly ? (
          <SidebarSection
            title="Internal Connections"
            collapsed={teamCollapsed}
            onToggle={() => setTeamCollapsed((current) => !current)}
            action={
              canCreateChannel ? (
                <SectionAddButton
                  label="Create internal connection"
                  onClick={onCreateChannel}
                />
              ) : null
            }
          >
            {internalChannels.length === 0 ? (
              <p className="px-3 py-2 text-xs text-[var(--shell-muted)]">
                No internal connections yet.
              </p>
            ) : (
              internalChannels.map((channel) => (
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

        {showDms && !showUnreadOnly ? (
          <SidebarSection
            title="Direct messages"
            collapsed={dmsCollapsed}
            onToggle={() => setDmsCollapsed((current) => !current)}
            action={
              <SectionAddButton
                label="Start direct message"
                onClick={onStartDirectMessage}
              />
            }
          >
            {directMessages.length === 0 ? (
              <p className="px-3 py-2 text-xs text-[var(--shell-muted)]">
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

        {showDms && !showUnreadOnly && groupMessages.length > 0 ? (
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
    </div>
  );
}
