'use client';

import { Hash, MessageCircle, Plus, Users } from 'lucide-react';
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
      <span className="truncate font-medium">{label}</span>
      {unreadCount > 0 ? (
        <Badge variant="primary" className="ml-auto shrink-0">
          {unreadCount}
        </Badge>
      ) : null}
    </button>
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
  const regularChannels = channels.filter((channel) => !isDirectOrGroupChannel(channel.type));
  const directMessages = channels.filter((channel) => channel.type === 'direct');
  const groupMessages = channels.filter((channel) => channel.type === 'group');

  return (
    <Card padding="sm" className="flex h-full min-h-0 flex-col overflow-hidden">
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
                <p className="text-sm font-medium">#{invite.channel.name}</p>
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

        <div className="mb-3 flex shrink-0 items-center justify-between px-2">
          <p className="text-xs font-semibold uppercase tracking-wide text-[var(--muted)]">
            Channels
          </p>
          {canCreateChannel ? (
            <button
              type="button"
              onClick={onCreateChannel}
              className="rounded-[var(--radius-sm)] p-1 text-[var(--muted)] hover:bg-[var(--surface-muted)] hover:text-[var(--foreground)]"
              aria-label="Create channel"
            >
              <Plus className="h-4 w-4" />
            </button>
          ) : null}
        </div>

        <div className="space-y-1 px-0">
          {regularChannels.map((channel) => (
            <ChannelButton
              key={channel.id}
              channel={channel}
              isActive={channel.id === selectedChannelId}
              onSelect={onSelectChannel}
            />
          ))}
        </div>

        <div className="mb-3 mt-5 flex shrink-0 items-center justify-between px-2">
          <p className="text-xs font-semibold uppercase tracking-wide text-[var(--muted)]">
            Direct messages
          </p>
          <button
            type="button"
            onClick={onStartDirectMessage}
            className="rounded-[var(--radius-sm)] p-1 text-[var(--muted)] hover:bg-[var(--surface-muted)] hover:text-[var(--foreground)]"
            aria-label="Start direct message"
          >
            <Plus className="h-4 w-4" />
          </button>
        </div>

        <div className="space-y-1">
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
        </div>

        {groupMessages.length > 0 ? (
          <>
            <div className="mb-3 mt-5 px-2">
              <p className="text-xs font-semibold uppercase tracking-wide text-[var(--muted)]">
                Group messages
              </p>
            </div>
            <div className="space-y-1">
              {groupMessages.map((channel) => (
                <ChannelButton
                  key={channel.id}
                  channel={channel}
                  isActive={channel.id === selectedChannelId}
                  onSelect={onSelectChannel}
                />
              ))}
            </div>
          </>
        ) : null}
      </div>
    </Card>
  );
}
