'use client';

import { ReactNode, useMemo, useState } from 'react';
import { ChevronDown, Hash, Plus, Search, Users } from 'lucide-react';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
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
  onSelectChannel: (channelId: string) => void;
  onCreateChannel: () => void;
  onCreateClientChannel?: (clientOrganizationId: string) => void;
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
        className="ring-1 ring-[var(--border)]"
      />
      <span
        className={cn(
          'absolute -bottom-0.5 -right-0.5 h-2 w-2 rounded-full border border-[var(--surface)]',
          away ? 'bg-[var(--muted)]' : 'bg-[var(--success)]',
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
          'flex min-h-touch w-full items-start gap-2.5 rounded-[var(--radius-md)] px-2.5 py-2 text-left text-sm transition-colors',
          isActive
            ? 'bg-[var(--primary-soft)] text-[var(--primary)]'
            : 'text-[var(--muted-foreground)] hover:bg-[var(--surface-muted)]',
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
        ) : (
          <span
            className={cn(
              'mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-[var(--radius-md)]',
              isActive
                ? 'bg-[var(--primary)] text-[var(--primary-foreground)]'
                : 'bg-[var(--surface-muted)] text-[var(--muted)]',
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
                  ? 'font-semibold text-[var(--foreground)]'
                  : 'font-medium',
                isActive && 'text-[var(--primary)]',
              )}
            >
              {showHash ? '#' : ''}
              {label}
            </span>
            {unreadCount > 0 ? (
              <Badge variant="primary" className="shrink-0">
                {unreadCount}
              </Badge>
            ) : null}
          </span>
          {channel.clientOrganizationName && channel.type === 'client_shared' ? (
            <span className="mt-0.5 block truncate text-[11px] text-[var(--muted)]">
              {channel.clientOrganizationName}
            </span>
          ) : channel.type === 'public' || channel.type === 'private' ? (
            <span className="mt-0.5 block truncate text-[11px] capitalize text-[var(--muted)]">
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
          className="flex items-center gap-1 text-xs font-semibold uppercase tracking-wide text-[var(--muted)]"
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

type SidebarFilter = 'all' | 'channels' | 'dms' | 'unread';

export function ChannelSidebar({
  channels,
  selectedChannelId,
  pendingInvites,
  acceptingInviteId,
  canCreateChannel,
  onSelectChannel,
  onCreateChannel,
  onCreateClientChannel,
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
  const teamChannels = channels.filter(
    (channel) =>
      (channel.type === 'public' || channel.type === 'private') &&
      !unreadIds.has(channel.id) &&
      matchesSearch(channel),
  );
  const clientChannels = channels.filter(
    (channel) =>
      channel.type === 'client_shared' &&
      !unreadIds.has(channel.id) &&
      matchesSearch(channel),
  );
  const directMessages = channels.filter(
    (channel) =>
      channel.type === 'direct' &&
      !unreadIds.has(channel.id) &&
      matchesSearch(channel),
  );
  const groupMessages = channels.filter(
    (channel) =>
      channel.type === 'group' &&
      !unreadIds.has(channel.id) &&
      matchesSearch(channel),
  );

  const clientGroups = useMemo(() => {
    const groups = new Map<
      string,
      {
        orgName: string;
        clientOrganizationId: string | null;
        channels: ChatChannel[];
      }
    >();

    for (const channel of clientChannels) {
      const orgName = channel.clientOrganizationName ?? 'Client messages';
      const clientOrganizationId = channel.clientOrganizationId ?? null;
      const orgKey = clientOrganizationId ?? orgName;
      const existing = groups.get(orgKey);

      if (existing) {
        existing.channels.push(channel);
      } else {
        groups.set(orgKey, { orgName, clientOrganizationId, channels: [channel] });
      }
    }

    return Array.from(groups.values()).sort((left, right) =>
      left.orgName.localeCompare(right.orgName),
    );
  }, [clientChannels]);

  const hasVisibleResults =
    unreadChannels.length > 0 ||
    teamChannels.length > 0 ||
    clientGroups.length > 0 ||
    directMessages.length > 0 ||
    groupMessages.length > 0;

  const showChannels = filter === 'all' || filter === 'channels';
  const showDms = filter === 'all' || filter === 'dms';
  const showUnreadOnly = filter === 'unread';

  return (
    <Card
      padding="none"
      className={cn('flex h-full min-h-0 flex-col overflow-hidden', className)}
    >
      <div className="shrink-0 space-y-3 border-b border-[var(--border)] p-3">
        <Button
          type="button"
          className="w-full"
          onClick={onStartDirectMessage}
        >
          <Plus className="h-4 w-4" />
          New message
        </Button>
        <div className="flex gap-1 rounded-[var(--radius-md)] bg-[var(--surface-muted)] p-1">
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
                'inline-flex flex-1 items-center justify-center gap-1 rounded-[var(--radius-sm)] px-2 py-1.5 text-xs font-medium transition-colors',
                filter === item.id
                  ? 'bg-[var(--surface)] text-[var(--foreground)] shadow-sm'
                  : 'text-[var(--muted)] hover:text-[var(--foreground)]',
              )}
            >
              {item.label}
              {'badge' in item && item.badge > 0 ? (
                <span className="rounded-full bg-[var(--danger)] px-1.5 text-[10px] font-semibold text-white">
                  {item.badge > 99 ? '99+' : item.badge}
                </span>
              ) : null}
            </button>
          ))}
        </div>
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--muted)]" />
          <input
            type="search"
            value={searchQuery}
            onChange={(event) => setSearchQuery(event.target.value)}
            placeholder="Search channels..."
            aria-label="Search channels and direct messages"
            className="h-10 w-full rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--surface)] pl-9 pr-3 text-sm text-[var(--foreground)] placeholder:text-[var(--muted)] focus:border-[var(--primary)] focus:outline-none focus:ring-2 focus:ring-[var(--primary-soft)]"
          />
        </div>
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto overscroll-y-contain scroll-smooth px-2 py-3">
        {pendingInvites.length > 0 ? (
          <div className="mb-4 space-y-2 border-b border-[var(--border)] px-2 pb-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-[var(--muted)]">
              Pending invites
            </p>
            {pendingInvites.map((invite) => (
              <div
                key={invite.id}
                className="rounded-[var(--radius-md)] border border-[var(--border)] p-2"
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

        {!hasVisibleResults ? (
          <p className="px-3 py-4 text-sm text-[var(--muted)]">
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
              <p className="px-3 py-2 text-xs text-[var(--muted)]">
                No unread conversations.
              </p>
            ) : null}
          </SidebarSection>
        ) : null}

        {showChannels && !showUnreadOnly ? (
          <SidebarSection
            title="Internal Connections"
            collapsed={teamCollapsed}
            onToggle={() => setTeamCollapsed((current) => !current)}
            action={
              canCreateChannel ? (
                <button
                  type="button"
                  onClick={onCreateChannel}
                  className="rounded-[var(--radius-sm)] p-1 text-[var(--muted)] hover:bg-[var(--surface-muted)] hover:text-[var(--foreground)]"
                  aria-label="Create channel"
                >
                  <Plus className="h-4 w-4" />
                </button>
              ) : null
            }
          >
            {teamChannels.length === 0 ? (
              <p className="px-3 py-2 text-xs text-[var(--muted)]">
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

        {showChannels && !showUnreadOnly ? (
          <SidebarSection
            title="External Connections"
            collapsed={clientsCollapsed}
            onToggle={() => setClientsCollapsed((current) => !current)}
          >
            {clientGroups.length === 0 ? (
              <p className="px-3 py-2 text-xs text-[var(--muted)]">
                Client connections appear here.
              </p>
            ) : (
              clientGroups.map((group) => (
                <div key={group.orgName} className="space-y-1">
                  <div className="flex items-center justify-between px-3 py-1">
                    <p className="text-[11px] font-medium text-[var(--muted)]">
                      {group.orgName}
                    </p>
                    {canCreateChannel &&
                    onCreateClientChannel &&
                    group.clientOrganizationId ? (
                      <button
                        type="button"
                        onClick={() =>
                          onCreateClientChannel(
                            group.clientOrganizationId as string,
                          )
                        }
                        className="rounded-[var(--radius-sm)] p-0.5 text-[var(--muted)] hover:bg-[var(--surface-muted)] hover:text-[var(--foreground)]"
                        aria-label={`Create channel for ${group.orgName}`}
                      >
                        <Plus className="h-3.5 w-3.5" />
                      </button>
                    ) : null}
                  </div>
                  {group.channels.map((channel) => (
                    <ChannelButton
                      key={channel.id}
                      channel={channel}
                      isActive={channel.id === selectedChannelId}
                      onSelect={onSelectChannel}
                    />
                  ))}
                </div>
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
              <button
                type="button"
                onClick={onStartDirectMessage}
                className="rounded-[var(--radius-sm)] p-1 text-[var(--muted)] hover:bg-[var(--surface-muted)] hover:text-[var(--foreground)]"
                aria-label="Start direct message"
              >
                <Plus className="h-4 w-4" />
              </button>
            }
          >
            {directMessages.length === 0 ? (
              <p className="px-3 py-2 text-xs text-[var(--muted)]">
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
    </Card>
  );
}
