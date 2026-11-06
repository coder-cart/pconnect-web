'use client';

import type { ReactNode } from 'react';
import {
  Copy,
  Hash,
  Headphones,
  Info,
  MessageCircle,
  MessagesSquare,
  PanelLeftClose,
  PanelLeftOpen,
  UserPlus,
  Users,
} from 'lucide-react';
import { ClientOrgLogo } from '@/components/ui/ClientOrgLogo';
import { UserAvatar } from '@/components/ui/UserAvatar';
import { ChannelNotificationMenu } from '@/components/chat/ChannelNotificationMenu';
import { DETAILS_PANEL_ID } from '@/components/chat/ChannelDetailsPanel';
import { Tabs } from '@/components/ui/Tabs';
import {
  ChannelMemberOption,
  ChannelNotificationPreference,
} from '@/lib/channelMembers';
import {
  ChannelContext,
  ChatDmPeer,
  getChannelLabel,
  isDirectOrGroupChannel,
} from '@/lib/chat-types';
import { cn } from '@/lib/cn';
import { CHAT_HUDDLE_ENABLED } from '@/lib/chat-release';
import {
  isAway,
  presenceSubtitle,
} from '@/lib/user-presence';

type ChannelTab = 'messages' | 'canvas' | 'pins';

interface ChannelHeaderProps {
  channelName?: string;
  channelDisplayName?: string;
  channelType?: string;
  clientOrganizationId?: string | null;
  clientOrganizationLogoUpdatedAt?: string | null;
  channelContext: ChannelContext | null;
  dmPeer?: ChatDmPeer | null;
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
  clientOrganizationId,
  clientOrganizationLogoUpdatedAt,
  channelContext,
  dmPeer = null,
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
  const showClientLogo =
    channelType === 'client_shared' && Boolean(clientOrganizationId);

  const breadcrumb = [
    channelType === 'client_shared' ? 'Client shared' : null,
    channelContext?.clientOrganizationName ?? null,
    channelContext?.projectName ?? null,
  ].filter(Boolean);

  const channelMembers = members.filter((member) => member.inChannel !== false);
  const previewMembers = channelMembers.slice(0, 4);
  const extraMembers = Math.max(0, channelMembers.length - previewMembers.length);
  const dmSubtitle =
    channelType === 'direct' && dmPeer ? presenceSubtitle(dmPeer) : null;

  return (
    <div className="shrink-0 border-b border-[var(--border)]">
      <div className="chat-inset flex flex-wrap items-center justify-between gap-2 sm:gap-3">
        <div className="flex min-w-0 items-center gap-2.5">
          {onBack ? (
            <button
              type="button"
              onClick={onBack}
              className="inline-flex min-h-touch shrink-0 items-center gap-1.5 rounded-[var(--radius-md)] px-2 text-[var(--muted)] hover:bg-[var(--surface-muted)] hover:text-[var(--foreground)] lg:hidden"
              aria-label="Chats"
            >
              <MessagesSquare className="h-4 w-4 shrink-0" />
              <span className="text-sm font-medium">Chats</span>
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
          {showClientLogo && clientOrganizationId ? (
            <ClientOrgLogo
              clientId={clientOrganizationId}
              name={
                channelContext?.clientOrganizationName ??
                channelDisplayName ??
                label ??
                'Client'
              }
              logoUpdatedAt={clientOrganizationLogoUpdatedAt}
              className="h-9 w-9"
            />
          ) : channelType === 'direct' && dmPeer ? (
            <span className="relative shrink-0">
              <UserAvatar
                user={{
                  id: dmPeer.id,
                  fullName: dmPeer.fullName,
                  avatarUpdatedAt: dmPeer.avatarUpdatedAt,
                }}
                size="sm"
              />
              <span
                className={cn(
                  'absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full border-2 border-[var(--surface)]',
                  isAway(dmPeer.presenceStatus)
                    ? 'bg-[var(--muted)]'
                    : 'bg-[var(--success)]',
                )}
                aria-hidden
              />
            </span>
          ) : (
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[var(--radius-md)] bg-[var(--primary-soft)] text-[var(--primary)]">
              <ChannelIcon className="h-4 w-4" />
            </div>
          )}
          <div className="min-w-0">
            <h2 className="truncate text-sm font-semibold text-[var(--foreground)] sm:text-base">
              {showHashPrefix ? '#' : ''}
              {label}
            </h2>
            {dmSubtitle ? (
              <p className="mt-0.5 truncate text-xs text-[var(--muted)]">
                {dmSubtitle}
              </p>
            ) : breadcrumb.length > 0 ? (
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
            <div className="hidden items-center lg:flex">
              {previewMembers.map((member, index) => {
                const title = `${member.fullName} · ${presenceSubtitle(member)}`;
                return (
                  <span
                    key={member.id}
                    className={cn(
                      'relative inline-flex rounded-full ring-2 ring-[var(--surface)]',
                      index > 0 && '-ml-2',
                    )}
                    title={title}
                  >
                    <UserAvatar
                      user={{
                        id: member.id,
                        fullName: member.fullName,
                        avatarUpdatedAt: member.avatarUpdatedAt,
                      }}
                      size="xs"
                    />
                    <span
                      className={cn(
                        'absolute -bottom-0.5 -right-0.5 h-2 w-2 rounded-full border border-[var(--surface)]',
                        isAway(member.presenceStatus)
                          ? 'bg-[var(--muted)]'
                          : 'bg-[var(--success)]',
                      )}
                      aria-hidden
                    />
                  </span>
                );
              })}
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

          {CHAT_HUDDLE_ENABLED ? (
            <>
              <HeaderIconButton label="Start huddle" onClick={onStartHuddle}>
                <Headphones className="h-4 w-4" />
              </HeaderIconButton>
              <HeaderIconButton
                label="Copy huddle link"
                onClick={onCopyHuddleLink}
              >
                <Copy className="h-4 w-4" />
              </HeaderIconButton>
            </>
          ) : null}

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
        className="chat-inset-x"
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
      className="group relative inline-flex h-11 w-11 items-center justify-center rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--surface)] text-[var(--muted)] transition-colors hover:bg-[var(--surface-muted)] hover:text-[var(--foreground)] lg:h-8 lg:w-8"
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
    <div className="chat-inset border-b border-[var(--border)]">
      <div className="flex items-center gap-2.5">
        <div className="flex h-9 w-9 items-center justify-center rounded-[var(--radius-md)] bg-[var(--primary-soft)] text-[var(--primary)]">
          <Hash className="h-4 w-4" />
        </div>
        <div>
          <h2 className="text-sm font-semibold text-[var(--foreground)] sm:text-base">
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
