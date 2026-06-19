'use client';

import { Copy, Hash, Headphones, MessageCircle, UserPlus, Users } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import {
  DropdownMenu,
  DropdownMenuItem,
} from '@/components/ui/DropdownMenu';
import { ChannelNotificationMenu } from '@/components/chat/ChannelNotificationMenu';
import { Tabs } from '@/components/ui/Tabs';
import { ChannelNotificationPreference } from '@/lib/channelMembers';
import { ChannelContext, getChannelLabel, isDirectOrGroupChannel } from '@/lib/chat-types';
import { cn } from '@/lib/cn';

type ChannelTab = 'messages' | 'canvas' | 'pins';

interface ChannelHeaderProps {
  channelName?: string;
  channelDisplayName?: string;
  channelType?: string;
  channelContext: ChannelContext | null;
  activeTab: ChannelTab;
  onTabChange: (tab: ChannelTab) => void;
  canInvite: boolean;
  onInvite: () => void;
  onStartHuddle: () => void;
  onCopyHuddleLink: () => void;
  huddleLink?: string | null;
  notificationPreference?: ChannelNotificationPreference | null;
  isUpdatingNotification?: boolean;
  onNotificationChange?: (payload: {
    notificationLevel?: ChannelNotificationPreference['notificationLevel'];
    mutedUntil?: string | null;
  }) => Promise<void>;
}

export function ChannelHeader({
  channelName,
  channelDisplayName,
  channelType,
  channelContext,
  activeTab,
  onTabChange,
  canInvite,
  onInvite,
  onStartHuddle,
  onCopyHuddleLink,
  huddleLink,
  notificationPreference = null,
  isUpdatingNotification = false,
  onNotificationChange,
}: ChannelHeaderProps) {
  const label = channelName
    ? getChannelLabel({
        name: channelName,
        type: channelType ?? 'public',
        displayName: channelDisplayName,
      })
    : undefined;
  const showHashPrefix =
    channelType &&
    !isDirectOrGroupChannel(channelType) &&
    channelType !== 'client_shared';
  const ChannelIcon =
    channelType === 'direct'
      ? MessageCircle
      : channelType === 'group'
        ? Users
        : channelType === 'client_shared'
          ? MessageCircle
          : Hash;

  return (
    <div className="shrink-0 border-b border-[var(--border)]">
      <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-4 sm:px-6">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-[var(--radius-md)] bg-[var(--primary-soft)] text-[var(--primary)]">
            <ChannelIcon className="h-4 w-4" />
          </div>
          <div>
            <h2 className="text-base font-semibold text-[var(--foreground)]">
              {showHashPrefix ? '#' : ''}
              {label}
            </h2>
            <p className="text-xs capitalize text-[var(--muted)]">
              {channelType?.replaceAll('_', ' ')}
              {channelContext?.clientOrganizationName
                ? ` · ${channelContext.clientOrganizationName}`
                : ''}
              {channelContext?.projectName ? ` · ${channelContext.projectName}` : ''}
            </p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {canInvite ? (
            <Button type="button" variant="secondary" size="sm" onClick={onInvite}>
              <UserPlus className="h-4 w-4" />
              {channelType === 'client_shared' ? 'Add people' : 'Invite teammates'}
            </Button>
          ) : null}
          <DropdownMenu
            trigger={
              <Button type="button" variant="ghost" size="sm" aria-label="Huddle options">
                <Headphones className="h-4 w-4" />
              </Button>
            }
          >
            <DropdownMenuItem onClick={onStartHuddle}>
              Start huddle
            </DropdownMenuItem>
            <DropdownMenuItem onClick={onCopyHuddleLink} disabled={!huddleLink}>
              <Copy className="h-4 w-4" />
              Copy huddle link
            </DropdownMenuItem>
          </DropdownMenu>
          {onNotificationChange ? (
            <ChannelNotificationMenu
              preference={notificationPreference}
              isUpdating={isUpdatingNotification}
              onChange={onNotificationChange}
            />
          ) : null}
        </div>
      </div>
      <Tabs
        activeId={activeTab}
        onChange={(id) => onTabChange(id as ChannelTab)}
        items={[
          { id: 'messages', label: 'Messages' },
          { id: 'pins', label: 'Pinned' },
          { id: 'canvas', label: 'Canvas' },
        ]}
      />
    </div>
  );
}

export function ChannelHeaderSimple({
  channelName,
  channelType,
  channelContext,
}: {
  channelName?: string;
  channelType?: string;
  channelContext: ChannelContext | null;
}) {
  return (
    <div className="border-b border-[var(--border)] px-4 py-4 sm:px-6">
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-[var(--radius-md)] bg-[var(--primary-soft)] text-[var(--primary)]">
          <Hash className="h-4 w-4" />
        </div>
        <div>
          <h2 className="text-base font-semibold text-[var(--foreground)]">
            #{channelName}
          </h2>
          <p className={cn('text-xs capitalize text-[var(--muted)]')}>
            {channelType?.replaceAll('_', ' ')}
          </p>
        </div>
      </div>
    </div>
  );
}
