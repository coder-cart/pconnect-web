'use client';

import { type ReactNode, useEffect, useMemo } from 'react';
import {
  FileText,
  Hash,
  Link2,
  MessageCircle,
  Pin,
  Plus,
  Users,
  X,
} from 'lucide-react';
import { UserAvatar } from '@/components/ui/UserAvatar';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { MessageAttachment } from '@/components/chat/ChatMessageBody';
import { ChannelMemberOption } from '@/lib/channelMembers';
import {
  ChannelContext,
  ChatMessage,
  getChannelLabel,
  isDirectOrGroupChannel,
} from '@/lib/chat-types';
import { cn } from '@/lib/cn';

const DETAILS_PANEL_ID = 'channel-details-panel';

interface ChannelDetailsPanelProps {
  channelName?: string;
  channelDisplayName?: string;
  channelType?: string;
  channelContext: ChannelContext | null;
  members: ChannelMemberOption[];
  messages: ChatMessage[];
  pins: Array<{ id: string; pinnedAt: string; message: ChatMessage }>;
  isLoadingPins: boolean;
  canInvite: boolean;
  onInvite: () => void;
  onJumpToPin: (messageId: string) => void;
  onClose: () => void;
}

function collectAttachments(messages: ChatMessage[], kind: 'file' | 'link') {
  const items: Array<MessageAttachment & { senderName: string }> = [];
  const seen = new Set<string>();

  for (const message of messages) {
    for (const attachment of message.attachments ?? []) {
      if (attachment.kind !== kind) continue;
      const key =
        attachment.id ||
        `${attachment.kind}:${attachment.url}:${attachment.fileName}`;
      if (seen.has(key)) continue;
      seen.add(key);
      items.push({
        ...attachment,
        senderName: message.sender.fullName,
      });
    }
  }

  return items;
}

export function ChannelDetailsPanel({
  channelName,
  channelDisplayName,
  channelType,
  channelContext,
  members,
  messages,
  pins,
  isLoadingPins,
  canInvite,
  onInvite,
  onJumpToPin,
  onClose,
}: ChannelDetailsPanelProps) {
  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        onClose();
      }
    }

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  const label = channelName
    ? getChannelLabel({
        name: channelName,
        type: channelType ?? 'public',
        displayName: channelDisplayName,
      })
    : 'Channel';

  const showHashPrefix =
    Boolean(channelType) &&
    !isDirectOrGroupChannel(channelType!) &&
    channelType !== 'client_shared';

  const ChannelIcon =
    channelType === 'direct' || channelType === 'client_shared'
      ? MessageCircle
      : channelType === 'group'
        ? Users
        : Hash;

  const files = useMemo(
    () => collectAttachments(messages, 'file'),
    [messages],
  );
  const links = useMemo(
    () => collectAttachments(messages, 'link'),
    [messages],
  );

  const description = [
    channelContext?.clientOrganizationName
      ? `Shared workspace for ${channelContext.clientOrganizationName}.`
      : null,
    channelContext?.projectName
      ? `Linked to project ${channelContext.projectName}.`
      : null,
    !channelContext?.clientOrganizationName && !channelContext?.projectName
      ? channelType === 'direct'
        ? 'Direct message conversation.'
        : channelType === 'group'
          ? 'Group message with selected teammates.'
          : 'Channel conversation for your workspace.'
      : 'Discuss work, share files, and keep progress in one place.',
  ]
    .filter(Boolean)
    .join(' ');

  const handle = showHashPrefix
    ? `#${label}`.toLowerCase().replace(/\s+/g, '-')
    : label.toLowerCase().replace(/\s+/g, '-');

  const previewMembers = members.slice(0, 4);
  const previewFiles = files.slice(0, 4);
  const previewPins = pins.slice(0, 3);

  return (
    <Card
      id={DETAILS_PANEL_ID}
      padding="none"
      className={cn(
        'fixed inset-0 z-40 flex min-h-0 flex-col overflow-hidden rounded-none',
        'lg:relative lg:inset-auto lg:z-auto lg:sticky lg:top-0 lg:h-full lg:rounded-[var(--radius-lg)]',
        'transition-[opacity,transform] duration-200 ease-out',
      )}
    >
      <div className="flex shrink-0 items-start justify-between gap-3 border-b border-[var(--border)] px-4 py-4 safe-pt">
        <div className="flex min-w-0 items-start gap-3">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-[var(--radius-md)] bg-[var(--primary-soft)] text-[var(--primary)]">
            <ChannelIcon className="h-5 w-5" />
          </div>
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-[var(--foreground)]">
              {showHashPrefix ? '#' : ''}
              {label}
            </p>
            <p className="mt-0.5 truncate text-xs text-[var(--muted)]">
              {handle}
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="inline-flex min-h-touch min-w-touch items-center justify-center rounded-[var(--radius-sm)] text-[var(--muted)] hover:bg-[var(--surface-muted)]"
          aria-label="Close details"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      <div className="min-h-0 flex-1 space-y-5 overflow-y-auto overscroll-contain px-4 py-4">
        <section>
          <p className="text-xs leading-relaxed text-[var(--muted)]">
            {description}
          </p>
        </section>

        <section className="grid grid-cols-2 gap-2">
          <StatCard
            icon={<Users className="h-3.5 w-3.5" />}
            label="Members"
            value={members.length}
          />
          <StatCard
            icon={<FileText className="h-3.5 w-3.5" />}
            label="Files"
            value={files.length}
          />
          <StatCard
            icon={<Pin className="h-3.5 w-3.5" />}
            label="Pins"
            value={pins.length}
          />
          <StatCard
            icon={<Link2 className="h-3.5 w-3.5" />}
            label="Links"
            value={links.length}
          />
        </section>

        <section className="space-y-2.5">
          <div className="flex items-center justify-between gap-2">
            <p className="text-xs font-semibold uppercase tracking-wide text-[var(--muted)]">
              Members
            </p>
            {members.length > previewMembers.length ? (
              <span className="text-xs text-[var(--muted)]">
                {members.length} total
              </span>
            ) : null}
          </div>
          <MemberList members={previewMembers} />
          {canInvite ? (
            <Button
              type="button"
              size="sm"
              variant="secondary"
              className="w-full"
              onClick={onInvite}
            >
              <Plus className="h-4 w-4" />
              Add people
            </Button>
          ) : null}
        </section>

        <section className="space-y-2.5">
          <p className="text-xs font-semibold uppercase tracking-wide text-[var(--muted)]">
            Shared files
          </p>
          {previewFiles.length === 0 ? (
            <p className="text-sm text-[var(--muted)]">
              No shared files in loaded messages yet.
            </p>
          ) : (
            <ul className="space-y-2">
              {previewFiles.map((file) => {
                const title =
                  file.fileName ?? file.file?.fileName ?? file.title ?? 'File';
                return (
                  <li key={file.id}>
                    {file.url ? (
                      <a
                        href={file.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-2.5 rounded-[var(--radius-md)] border border-[var(--border)] px-2.5 py-2 hover:bg-[var(--surface-muted)]"
                      >
                        <FileIconBadge name={title} />
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-sm font-medium text-[var(--foreground)]">
                            {title}
                          </span>
                          <span className="block truncate text-xs text-[var(--muted)]">
                            {file.senderName}
                          </span>
                        </span>
                      </a>
                    ) : (
                      <div className="flex items-center gap-2.5 rounded-[var(--radius-md)] border border-[var(--border)] px-2.5 py-2">
                        <FileIconBadge name={title} />
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-sm font-medium text-[var(--foreground)]">
                            {title}
                          </span>
                          <span className="block truncate text-xs text-[var(--muted)]">
                            {file.senderName}
                          </span>
                        </span>
                      </div>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
        </section>

        <section className="space-y-2.5">
          <p className="text-xs font-semibold uppercase tracking-wide text-[var(--muted)]">
            Pinned messages
          </p>
          {isLoadingPins ? (
            <p className="text-sm text-[var(--muted)]">Loading pins…</p>
          ) : previewPins.length === 0 ? (
            <p className="text-sm text-[var(--muted)]">No pinned messages yet.</p>
          ) : (
            <ul className="space-y-2">
              {previewPins.map((pin) => (
                <li key={pin.id}>
                  <button
                    type="button"
                    onClick={() => onJumpToPin(pin.message.id)}
                    className="w-full rounded-[var(--radius-md)] border border-[var(--border)] px-3 py-2.5 text-left hover:bg-[var(--surface-muted)]"
                  >
                    <div className="flex items-center gap-2 text-xs text-[var(--muted)]">
                      <Pin className="h-3.5 w-3.5 text-[var(--danger)]" />
                      <UserAvatar
                        user={{
                          id: pin.message.sender.id,
                          fullName: pin.message.sender.fullName,
                          avatarUpdatedAt: pin.message.sender.avatarUpdatedAt,
                        }}
                        size="xs"
                      />
                      <span className="truncate">
                        {pin.message.sender.fullName}
                      </span>
                    </div>
                    <p className="mt-1.5 line-clamp-2 text-sm text-[var(--foreground)]">
                      {pin.message.body || 'Pinned attachment'}
                    </p>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </Card>
  );
}

export { DETAILS_PANEL_ID };

function StatCard({
  icon,
  label,
  value,
}: {
  icon: ReactNode;
  label: string;
  value: number;
}) {
  return (
    <div className="rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--surface-muted)]/70 px-3 py-2.5">
      <div className="flex items-center gap-1.5 text-[var(--muted)]">
        {icon}
        <span className="text-[11px] font-medium uppercase tracking-wide">
          {label}
        </span>
      </div>
      <p className="mt-1 text-lg font-semibold tabular-nums text-[var(--foreground)]">
        {value}
      </p>
    </div>
  );
}

function MemberList({ members }: { members: ChannelMemberOption[] }) {
  if (members.length === 0) {
    return <p className="text-sm text-[var(--muted)]">No members to show.</p>;
  }

  return (
    <ul className="space-y-1">
      {members.map((member) => (
        <li
          key={member.id}
          className="flex items-center gap-2.5 rounded-[var(--radius-md)] px-1 py-1.5"
        >
          <UserAvatar
            user={{
              id: member.id,
              fullName: member.fullName,
              avatarUpdatedAt: member.avatarUpdatedAt,
            }}
            size="sm"
          />
          <div className="min-w-0">
            <p className="truncate text-sm font-medium text-[var(--foreground)]">
              {member.fullName}
            </p>
            <p className="truncate text-xs capitalize text-[var(--muted)]">
              {member.userType === 'external' ? 'Client' : 'Team member'}
            </p>
          </div>
        </li>
      ))}
    </ul>
  );
}

function FileIconBadge({ name }: { name: string }) {
  const extension = name.includes('.')
    ? name.split('.').pop()?.toUpperCase().slice(0, 4)
    : 'FILE';

  return (
    <span className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-[var(--radius-sm)] bg-[var(--primary-soft)] text-[9px] font-bold tracking-wide text-[var(--primary)]">
      {extension || 'FILE'}
    </span>
  );
}
