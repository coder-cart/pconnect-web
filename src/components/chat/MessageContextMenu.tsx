'use client';

import { useState } from 'react';
import {
  BellOff,
  Clock,
  Copy,
  Link2,
  Pin,
  Pencil,
  Square,
  Trash2,
} from 'lucide-react';
import {
  ContextMenu,
  ContextMenuItem,
  ContextMenuSeparator,
} from '@/components/ui/ContextMenu';
import {
  DropdownMenu,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from '@/components/ui/DropdownMenu';
import { Button } from '@/components/ui/Button';
import { ChatMessage } from '@/lib/chat-types';

interface MessageContextMenuProps {
  message: ChatMessage;
  channelId: string;
  currentUserId: string;
  canManageChannel: boolean;
  onEdit: (messageId: string, body: string) => Promise<void>;
  onDelete: (messageId: string) => Promise<void>;
  onPin: (messageId: string) => Promise<void>;
  onCopyMessage: (body: string) => void;
  onCopyLink: (channelId: string, messageId: string) => void;
  onMarkUnread: (messageId: string) => Promise<void>;
  trigger?: React.ReactNode;
  mode?: 'context' | 'dropdown';
}

export function MessageContextMenu({
  message,
  channelId,
  currentUserId,
  canManageChannel,
  onEdit,
  onDelete,
  onPin,
  onCopyMessage,
  onCopyLink,
  onMarkUnread,
  trigger,
  mode = 'context',
}: MessageContextMenuProps) {
  const [editing, setEditing] = useState(false);
  const [editBody, setEditBody] = useState(message.body);
  const [saving, setSaving] = useState(false);
  const isOwnMessage = message.sender.id === currentUserId;
  const canEdit = isOwnMessage && !message.deletedAt;
  const canDelete = (isOwnMessage || canManageChannel) && !message.deletedAt;

  const menuItems = (
    <>
      {canEdit ? (
        <MenuItemWrapper
          mode={mode}
          onClick={() => setEditing(true)}
          shortcut="E"
        >
          <Pencil className="h-4 w-4" />
          Edit message
        </MenuItemWrapper>
      ) : null}
      <MenuItemWrapper
        mode={mode}
        onClick={() => void onMarkUnread(message.id)}
        shortcut="U"
      >
        <Square className="h-4 w-4" />
        Mark unread
      </MenuItemWrapper>
      <MenuItemWrapper mode={mode} disabled shortcut="">
        <Clock className="h-4 w-4" />
        Remind me
      </MenuItemWrapper>
      <MenuItemWrapper mode={mode} disabled>
        <BellOff className="h-4 w-4" />
        Turn off notifications for replies
      </MenuItemWrapper>
      <MenuSeparator mode={mode} />
      <MenuItemWrapper
        mode={mode}
        onClick={() => onCopyLink(channelId, message.id)}
        shortcut="L"
      >
        <Link2 className="h-4 w-4" />
        Copy link
      </MenuItemWrapper>
      <MenuItemWrapper
        mode={mode}
        onClick={() => onCopyMessage(message.body)}
        shortcut="Ctrl+C"
      >
        <Copy className="h-4 w-4" />
        Copy message
      </MenuItemWrapper>
      <MenuSeparator mode={mode} />
      {canManageChannel ? (
        <MenuItemWrapper
          mode={mode}
          onClick={() => void onPin(message.id)}
          shortcut="P"
        >
          <Pin className="h-4 w-4" />
          Pin to channel
        </MenuItemWrapper>
      ) : null}
      {canDelete ? (
        <>
          <MenuSeparator mode={mode} />
          <MenuItemWrapper
            mode={mode}
            destructive
            onClick={() => void onDelete(message.id)}
            shortcut="delete"
          >
            <Trash2 className="h-4 w-4" />
            Delete message...
          </MenuItemWrapper>
        </>
      ) : null}
    </>
  );

  async function handleSaveEdit() {
    if (!editBody.trim()) return;
    setSaving(true);
    try {
      await onEdit(message.id, editBody.trim());
      setEditing(false);
    } finally {
      setSaving(false);
    }
  }

  if (editing) {
    return (
      <div className="mt-2 space-y-2">
        <textarea
          value={editBody}
          onChange={(event) => setEditBody(event.target.value)}
          className="min-h-[80px] w-full rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-sm outline-none focus:border-[var(--primary)]"
        />
        <div className="flex gap-2">
          <Button size="sm" disabled={saving} onClick={() => void handleSaveEdit()}>
            Save
          </Button>
          <Button size="sm" variant="ghost" onClick={() => setEditing(false)}>
            Cancel
          </Button>
        </div>
      </div>
    );
  }

  if (mode === 'dropdown' && trigger) {
    return (
      <DropdownMenu trigger={trigger} align="right">
        {menuItems}
      </DropdownMenu>
    );
  }

  return <ContextMenu menu={menuItems}>{null}</ContextMenu>;
}

function MenuItemWrapper({
  mode,
  children,
  onClick,
  disabled,
  destructive,
  shortcut,
}: {
  mode: 'context' | 'dropdown';
  children: React.ReactNode;
  onClick?: () => void;
  disabled?: boolean;
  destructive?: boolean;
  shortcut?: string;
}) {
  if (mode === 'dropdown') {
    return (
      <DropdownMenuItem
        onClick={onClick}
        disabled={disabled}
        destructive={destructive}
      >
        {children}
      </DropdownMenuItem>
    );
  }

  return (
    <ContextMenuItem
      onClick={onClick}
      disabled={disabled}
      destructive={destructive}
      shortcut={shortcut}
    >
      {children}
    </ContextMenuItem>
  );
}

function MenuSeparator({ mode }: { mode: 'context' | 'dropdown' }) {
  return mode === 'dropdown' ? (
    <DropdownMenuSeparator />
  ) : (
    <ContextMenuSeparator />
  );
}

export function MessageContextMenuDropdown(props: MessageContextMenuProps) {
  return (
    <MessageContextMenu
      {...props}
      mode="dropdown"
      trigger={
        props.trigger ?? (
          <button
            type="button"
            className="rounded-[var(--radius-sm)] p-1.5 text-[var(--muted-foreground)] hover:bg-[var(--surface-muted)]"
            aria-label="Message actions"
          >
            ⋯
          </button>
        )
      }
    />
  );
}

export function MessageContextMenuWrapper({
  children,
  ...props
}: MessageContextMenuProps & { children: React.ReactNode }) {
  const [editing, setEditing] = useState(false);
  const [editBody, setEditBody] = useState(props.message.body);
  const [saving, setSaving] = useState(false);
  const isOwnMessage = props.message.sender.id === props.currentUserId;
  const canEdit = isOwnMessage && !props.message.deletedAt;
  const canDelete =
    (isOwnMessage || props.canManageChannel) && !props.message.deletedAt;

  async function handleSaveEdit() {
    if (!editBody.trim()) return;
    setSaving(true);
    try {
      await props.onEdit(props.message.id, editBody.trim());
      setEditing(false);
    } finally {
      setSaving(false);
    }
  }

  const menu = (
    <>
      {canEdit ? (
        <ContextMenuItem shortcut="E" onClick={() => setEditing(true)}>
          <Pencil className="h-4 w-4" />
          Edit message
        </ContextMenuItem>
      ) : null}
      <ContextMenuItem
        shortcut="U"
        onClick={() => void props.onMarkUnread(props.message.id)}
      >
        <Square className="h-4 w-4" />
        Mark unread
      </ContextMenuItem>
      <ContextMenuItem disabled shortcut="">
        <Clock className="h-4 w-4" />
        Remind me
      </ContextMenuItem>
      <ContextMenuItem disabled>
        <BellOff className="h-4 w-4" />
        Turn off notifications for replies
      </ContextMenuItem>
      <ContextMenuSeparator />
      <ContextMenuItem
        shortcut="L"
        onClick={() => props.onCopyLink(props.channelId, props.message.id)}
      >
        <Link2 className="h-4 w-4" />
        Copy link
      </ContextMenuItem>
      <ContextMenuItem
        shortcut="Ctrl+C"
        onClick={() => props.onCopyMessage(props.message.body)}
      >
        <Copy className="h-4 w-4" />
        Copy message
      </ContextMenuItem>
      <ContextMenuSeparator />
      {props.canManageChannel ? (
        <ContextMenuItem
          shortcut="P"
          onClick={() => void props.onPin(props.message.id)}
        >
          <Pin className="h-4 w-4" />
          Pin to channel
        </ContextMenuItem>
      ) : null}
      {canDelete ? (
        <>
          <ContextMenuSeparator />
          <ContextMenuItem
            destructive
            shortcut="delete"
            onClick={() => void props.onDelete(props.message.id)}
          >
            <Trash2 className="h-4 w-4" />
            Delete message...
          </ContextMenuItem>
        </>
      ) : null}
    </>
  );

  if (editing) {
    return (
      <div>
        {children}
        <div className="mt-2 space-y-2">
          <textarea
            value={editBody}
            onChange={(event) => setEditBody(event.target.value)}
            className="min-h-[80px] w-full rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-sm outline-none focus:border-[var(--primary)]"
          />
          <div className="flex gap-2">
            <Button
              size="sm"
              disabled={saving}
              onClick={() => void handleSaveEdit()}
            >
              Save
            </Button>
            <Button size="sm" variant="ghost" onClick={() => setEditing(false)}>
              Cancel
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return <ContextMenu menu={menu}>{children}</ContextMenu>;
}
