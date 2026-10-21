'use client';

import type { ReactNode } from 'react';
import {
  ArrowLeft,
  Copy,
  Hash,
  Headphones,
  Info,
  MessageCircle,
  MoreVertical,
  PanelLeftClose,
  PanelLeftOpen,
  UserPlus,
  Users,
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import {
  DropdownMenu,
  DropdownMenuItem,
} from '@/components/ui/DropdownMenu';
import { Avatar } from '@/components/ui/Avatar';
import { ChannelNotificationMenu } from '@/components/chat/ChannelNotificationMenu';
import { DETAILS_PANEL_ID } from '@/components/chat/ChannelDetailsPanel';
import { Tabs } from '@/components/ui/Tabs';
import {
  ChannelMemberOption,
  ChannelNotificationPreference,
} from '@/lib/channelMembers';
import { ChannelContext, getChannelLabel, isDirectOrGroupChannel } from '@/lib/chat-types';
import { cn } from '@/lib/cn';

type ChannelTab = 'messages' | 'canvas' | 'pins';

interface ChannelHeaderProps {
  channelName?: string;
  channelDisplayName?: string;
  channelType?: string;
  channelContext: ChannelContext | null;
  members?: ChannelMemberOption[];
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
  detailsOpen?: boolean;
  onToggleDetails?: () => void;
  sidebarOpen?: boolean;
  onToggleSidebar?: () => void;
  onBack?: () => void;
}

export function ChannelHeader({
  channelName,
  channelDisplayName,
  channelType,
  channelContext,
  members = [],
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
  detailsOpen = false,
  onToggleDetails,
  sidebarOpen = true,
  onToggleSidebar,
  onBack,
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

  const breadcrumb = [
    channelType === 'client_shared' ? 'Client shared' : null,
    channelContext?.clientOrganizationName ?? null,
    channelContext?.projectName ?? null,
  ].filter(Boolean);

  const previewMembers = members.slice(0, 4);
  const extraMembers = Math.max(0, members.length - previewMembers.length);

  return (
    <div className="shrink-0 border-b border-[var(--border)]">
      <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 sm:px-5 sm:py-3.5">
        <div className="flex min-w-0 items-center gap-3">
          {onBack ? (
            <button
              type="button"
              onClick={onBack}
              className="inline-flex min-h-touch min-w-touch shrink-0 items-center justify-center rounded-[var(--radius-md)] text-[var(--muted)] hover:bg-[var(--surface-muted)] hover:text-[var(--foreground)] lg:hidden"
              aria-label="Back to conversations"
            >
              <ArrowLeft className="h-5 w-5" />
            </button>
          ) : null}
          {onToggleSidebar ? (
            <button
              type="button"
              onClick={onToggleSidebar}
              className="hidden min-h-touch min-w-touch shrink-0 items-center justify-center rounded-[var(--radius-md)] text-[var(--muted)] hover:bg-[var(--surface-muted)] hover:text-[var(--foreground)] lg:inline-flex"
              aria-label={sidebarOpen ? 'Hide conversations' : 'Show conversations'}
              aria-pressed={sidebarOpen}
              title={sidebarOpen ? 'Hide conversations' : 'Show conversations'}
            >
              {sidebarOpen ? (
                <PanelLeftClose className="h-5 w-5" />
              ) : (
                <PanelLeftOpen className="h-5 w-5" />
              )}
            </button>
          ) : null}
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[var(--radius-md)] bg-[var(--primary-soft)] text-[var(--primary)]">
            <ChannelIcon className="h-4 w-4" />
          </div>
          <div className="min-w-0">
            <h2 className="truncate text-base font-semibold text-[var(--foreground)]">
              {showHashPrefix ? '#' : ''}
              {label}
            </h2>
            {breadcrumb.length > 0 ? (
              <p className="mt-0.5 truncate text-xs text-[var(--muted)]">
                {breadcrumb.join(' › ')}
              </p>
            ) : (
              <p className="mt-0.5 truncate text-xs capitalize text-[var(--muted)]">
                {channelType?.replaceAll('_', ' ')}
              </p>
            )}
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {previewMembers.length > 0 ? (
            <div className="hidden items-center sm:flex">
              {previewMembers.map((member, index) => (
                <span
                  key={member.id}
                  className={cn(
                    'relative inline-flex rounded-full ring-2 ring-[var(--surface)]',
                    index > 0 && '-ml-2',
                  )}
                  title={member.fullName}
                >
                  <Avatar name={member.fullName} size="xs" />
                </span>
              ))}
              {extraMembers > 0 ? (
                <span className="-ml-2 inline-flex h-6 min-w-6 items-center justify-center rounded-full bg-[var(--surface-muted)] px-1.5 text-[10px] font-semibold text-[var(--muted)] ring-2 ring-[var(--surface)]">
                  +{extraMembers}
                </span>
              ) : null}
            </div>
          ) : null}

          {canInvite ? (
            <HeaderIconButton
              label={
                channelType === 'client_shared'
                  ? 'Add team members'
                  : 'Invite teammates'
              }
              onClick={onInvite}
            >
              <UserPlus className="h-4 w-4" />
            </HeaderIconButton>
          ) : null}

          {onToggleDetails ? (
            <HeaderIconButton
              label="View details"
              onClick={onToggleDetails}
              aria-expanded={detailsOpen}
              aria-controls={DETAILS_PANEL_ID}
            >
              <Info className="h-4 w-4" />
            </HeaderIconButton>
          ) : null}

          <DropdownMenu
            trigger={
              <Button type="button" variant="ghost" size="sm" aria-label="More actions">
                <MoreVertical className="h-4 w-4" />
              </Button>
            }
          >
            <DropdownMenuItem onClick={onStartHuddle}>
              <Headphones className="h-4 w-4" />
              Start huddle
            </DropdownMenuItem>
            <DropdownMenuItem onClick={onCopyHuddleLink} disabled={!huddleLink}>
              <Copy className="h-4 w-4" />
              Copy huddle link
            </DropdownMenuItem>
            {onNotificationChange ? (
              <div className="border-t border-[var(--border)] px-2 py-1">
                <ChannelNotificationMenu
                  preference={notificationPreference}
                  isUpdating={isUpdatingNotification}
                  onChange={onNotificationChange}
                />
              </div>
            ) : null}
          </DropdownMenu>
        </div>
      </div>

      <Tabs
        activeId={activeTab}
        onChange={(id) => onTabChange(id as ChannelTab)}
        className="px-4 sm:px-5"
        items={[
          { id: 'messages', label: 'Messages' },
          { id: 'pins', label: 'Pins' },
          { id: 'canvas', label: 'Canvas' },
        ]}
      />
    </div>
  );
}

function HeaderIconButton({
  label,
  onClick,
  children,
  ...props
}: {
  label: string;
  onClick: () => void;
  children: ReactNode;
  'aria-expanded'?: boolean;
  'aria-controls'?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      title={label}
      className="group relative inline-flex h-8 w-8 items-center justify-center rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--surface)] text-[var(--muted)] transition-colors hover:bg-[var(--surface-muted)] hover:text-[var(--foreground)]"
      {...props}
    >
      {children}
      <span
        role="tooltip"
        className="pointer-events-none absolute top-full left-1/2 z-20 mt-1.5 -translate-x-1/2 whitespace-nowrap rounded-[var(--radius-sm)] bg-[var(--foreground)] px-2 py-1 text-[11px] font-medium text-[var(--surface)] opacity-0 shadow-sm transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100"
      >
        {label}
      </span>
    </button>
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
            {channelContext?.clientOrganizationName
              ? ` · ${channelContext.clientOrganizationName}`
              : ''}
          </p>
        </div>
      </div>
    </div>
  );
}
