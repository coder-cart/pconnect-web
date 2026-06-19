'use client';

import { ReactNode, useMemo, useState } from 'react';
import { ChevronDown, Hash, MessageCircle, Plus, Search, Users } from 'lucide-react';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import {
  ChatChannel,
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
  onStartDirectMessage: () => void;
  onAcceptInvite: (invite: PendingChannelInvite) => void;
}

function ChannelIcon({ type }: { type: string }) {
  if (type === 'direct') {
    return <MessageCircle className="h-4 w-4 shrink-0" />;
  }

  if (type === 'group') {
    return <Users className="h-4 w-4 shrink-0" />;
  }

  return <Hash className="h-4 w-4 shrink-0" />;
}

function ChannelButton({
  channel,
  isActive,
  onSelect,
}: {
  channel: ChatChannel;
  isActive: boolean;
  onSelect: (channelId: string) => void;
}) {
  const unreadCount = channel.unreadCount ?? 0;
  const label = getChannelLabel(channel);
  const showHash = channel.type !== 'direct' && channel.type !== 'group' && channel.type !== 'client_shared';

  return (
    <button
      type="button"
      onClick={() => onSelect(channel.id)}
      className={cn(
        'flex w-full items-center gap-3 rounded-[var(--radius-md)] px-3 py-2.5 text-left text-sm transition-colors',
        isActive
          ? 'bg-[var(--primary-soft)] text-[var(--primary)]'
          : 'text-[var(--muted-foreground)] hover:bg-[var(--surface-muted)]',
      )}
    >
      <ChannelIcon type={channel.type} />
      <span className="truncate font-medium">
        {showHash ? '#' : ''}
        {label}
      </span>
      {unreadCount > 0 ? (
        <Badge variant="primary" className="ml-auto shrink-0">
          {unreadCount}
        </Badge>
      ) : null}
    </button>
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

export function ChannelSidebar({
  channels,
  selectedChannelId,
  pendingInvites,
  acceptingInviteId,
  canCreateChannel,
  onSelectChannel,
  onCreateChannel,
  onStartDirectMessage,
  onAcceptInvite,
}: ChannelSidebarProps) {
  const [teamCollapsed, setTeamCollapsed] = useState(false);
  const [clientsCollapsed, setClientsCollapsed] = useState(false);
  const [dmsCollapsed, setDmsCollapsed] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const normalizedQuery = searchQuery.trim().toLowerCase();

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

  const teamChannels = channels.filter(
    (channel) =>
      (channel.type === 'public' || channel.type === 'private') &&
      matchesSearch(channel),
  );
  const clientChannels = channels.filter(
    (channel) => channel.type === 'client_shared' && matchesSearch(channel),
  );
  const directMessages = channels.filter(
    (channel) => channel.type === 'direct' && matchesSearch(channel),
  );
  const groupMessages = channels.filter(
    (channel) => channel.type === 'group' && matchesSearch(channel),
  );

  const clientGroups = useMemo(() => {
    const groups = new Map<string, { orgName: string; channels: ChatChannel[] }>();

    for (const channel of clientChannels) {
      const orgName = channel.clientOrganizationName ?? 'Client messages';
      const orgKey = channel.clientOrganizationId ?? orgName;
      const existing = groups.get(orgKey);

      if (existing) {
        existing.channels.push(channel);
      } else {
        groups.set(orgKey, { orgName, channels: [channel] });
      }
    }

    return Array.from(groups.values()).sort((left, right) =>
      left.orgName.localeCompare(right.orgName),
    );
  }, [clientChannels]);

  const hasVisibleResults =
    teamChannels.length > 0 ||
    clientGroups.length > 0 ||
    directMessages.length > 0 ||
    groupMessages.length > 0;

  return (
    <Card padding="sm" className="flex h-full min-h-0 flex-col overflow-hidden">
      <div className="mb-3 shrink-0 px-2">
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--muted)]" />
          <input
            type="search"
            value={searchQuery}
            onChange={(event) => setSearchQuery(event.target.value)}
            placeholder="Search channels and DMs"
            aria-label="Search channels and direct messages"
            className="h-9 w-full rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--surface-muted)] pl-9 pr-3 text-sm text-[var(--foreground)] placeholder:text-[var(--muted)] focus:border-[var(--primary)] focus:bg-[var(--surface)] focus:outline-none focus:ring-2 focus:ring-[var(--primary-soft)]"
          />
        </div>
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto overscroll-y-contain scroll-smooth">
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

        <SidebarSection
          title="Team"
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
            <p className="px-3 py-2 text-xs text-[var(--muted)]">No team channels yet.</p>
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

        <SidebarSection
          title="Clients"
          collapsed={clientsCollapsed}
          onToggle={() => setClientsCollapsed((current) => !current)}
        >
          {clientGroups.length === 0 ? (
            <p className="px-3 py-2 text-xs text-[var(--muted)]">
              Client message hubs appear here.
            </p>
          ) : (
            clientGroups.map((group) => (
              <div key={group.orgName} className="space-y-1">
                <p className="px-3 py-1 text-[11px] font-medium text-[var(--muted)]">
                  {group.orgName}
                </p>
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
            <p className="px-3 py-2 text-xs text-[var(--muted)]">No direct messages yet.</p>
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

        {groupMessages.length > 0 ? (
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
