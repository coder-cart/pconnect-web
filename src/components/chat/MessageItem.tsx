'use client';

import { useEffect, useState } from 'react';
import {
  Copy,
  Link2,
  MoreHorizontal,
  Pencil,
  Pin,
  Square,
  Trash2,
} from 'lucide-react';
import { UserAvatar } from '@/components/ui/UserAvatar';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { ChatMessageBody } from '@/components/chat/ChatMessageBody';
import { MessageHoverToolbar } from '@/components/chat/MessageHoverToolbar';
import { ReactionBar } from '@/components/chat/ReactionBar';
import {
  ContextMenu,
  ContextMenuItem,
  ContextMenuSeparator,
} from '@/components/ui/ContextMenu';
import { ChatMessage } from '@/lib/chat-types';
import { formatMessageTime } from '@/lib/formatMessageDate';
import { useViewerTimeZone } from '@/hooks/useViewerTimeZone';
import { cn } from '@/lib/cn';

interface MessageItemProps {
  message: ChatMessage;
  channelId: string;
  currentUserId: string;
  canManageChannel: boolean;
  isActive?: boolean;
  unread?: boolean;
  highlighted?: boolean;
  onReply: (messageId: string) => void;
  onReact: (messageId: string, emoji: string) => Promise<void>;
  onEdit: (messageId: string, body: string) => Promise<void>;
  onDelete: (messageId: string) => Promise<void>;
  onPin: (messageId: string) => Promise<void>;
  onCopyMessage: (body: string) => void;
  onCopyLink: (channelId: string, messageId: string) => void;
  onMarkUnread: (messageId: string) => Promise<void>;
}

export function MessageItem({
  message,
  channelId,
  currentUserId,
  canManageChannel,
  isActive,
  unread = false,
  highlighted,
  onReply,
  onReact,
  onEdit,
  onDelete,
  onPin,
  onCopyMessage,
  onCopyLink,
  onMarkUnread,
}: MessageItemProps) {
  const [hovered, setHovered] = useState(false);
  const [toolbarLocked, setToolbarLocked] = useState(false);
  const [touchActive, setTouchActive] = useState(false);
  const [editing, setEditing] = useState(false);
  const [editBody, setEditBody] = useState(message.body);
  const [saving, setSaving] = useState(false);
  const [menuSignal, setMenuSignal] = useState<{
    x: number;
    y: number;
    key: number;
  } | null>(null);
  const timeZone = useViewerTimeZone();

  const isOwnMessage = message.sender.id === currentUserId;
  const canEdit = isOwnMessage && !message.deletedAt;
  const canDelete =
    (isOwnMessage || canManageChannel) && !message.deletedAt;
  const showToolbar =
    !editing && (hovered || toolbarLocked || touchActive);

  useEffect(() => {
    setEditBody(message.body);
  }, [message.body]);

  useEffect(() => {
    if (!touchActive) return;
    function handlePointerDown(event: PointerEvent) {
      const target = event.target as HTMLElement | null;
      if (target?.closest(`#message-${message.id}`)) return;
      setTouchActive(false);
    }
    document.addEventListener('pointerdown', handlePointerDown);
    return () => document.removeEventListener('pointerdown', handlePointerDown);
  }, [touchActive, message.id]);

  async function handleSaveEdit() {
    if (!editBody.trim()) return;
    setSaving(true);
    try {
      await onEdit(message.id, editBody.trimEnd());
      setEditing(false);
    } finally {
      setSaving(false);
    }
  }

  function startEditing() {
    setEditBody(message.body);
    setEditing(true);
    setTouchActive(false);
    setHovered(false);
  }

  function cancelEditing() {
    setEditBody(message.body);
    setEditing(false);
  }

  function openActionsAt(x: number, y: number) {
    setMenuSignal({ x, y, key: Date.now() });
  }

  if (message.deletedAt) {
    return (
      <div
        id={`message-${message.id}`}
        className={cn(
          'chat-message-row rounded-[var(--radius-md)] text-sm italic text-[var(--muted)]',
          highlighted && 'ring-2 ring-[var(--primary)] ring-offset-2',
        )}
      >
        This message was deleted.
      </div>
    );
  }

  const menu = (
    <>
      {canEdit ? (
        <ContextMenuItem shortcut="E" onClick={startEditing}>
          <Pencil className="h-4 w-4" />
          Edit message
        </ContextMenuItem>
      ) : null}
      <ContextMenuItem
        shortcut="U"
        onClick={() => void onMarkUnread(message.id)}
      >
        <Square className="h-4 w-4" />
        Mark unread
      </ContextMenuItem>
      <ContextMenuSeparator />
      <ContextMenuItem
        shortcut="L"
        onClick={() => onCopyLink(channelId, message.id)}
      >
        <Link2 className="h-4 w-4" />
        Copy link
      </ContextMenuItem>
      <ContextMenuItem
        shortcut="Ctrl+C"
        onClick={() => onCopyMessage(message.body)}
      >
        <Copy className="h-4 w-4" />
        Copy message
      </ContextMenuItem>
      {canManageChannel ? (
        <>
          <ContextMenuSeparator />
          <ContextMenuItem
            shortcut="P"
            onClick={() => void onPin(message.id)}
          >
            <Pin className="h-4 w-4" />
            Pin to channel
          </ContextMenuItem>
        </>
      ) : null}
      {canDelete ? (
        <>
          <ContextMenuSeparator />
          <ContextMenuItem
            destructive
            shortcut="delete"
            onClick={() => void onDelete(message.id)}
          >
            <Trash2 className="h-4 w-4" />
            Delete message...
          </ContextMenuItem>
        </>
      ) : null}
    </>
  );

  return (
    <ContextMenu menu={menu} openSignal={menuSignal}>
      <div
        id={`message-${message.id}`}
        className={cn(
          'chat-message-row group relative flex gap-2.5 rounded-[var(--radius-md)] transition-colors [-webkit-touch-callout:none] hover:bg-[var(--surface-muted)]',
          isActive && 'bg-[var(--surface-muted)]',
          highlighted && 'ring-2 ring-[var(--primary)] ring-offset-2',
          editing && 'bg-[var(--primary-soft)]/40 ring-1 ring-[var(--primary)]/40',
          touchActive && !editing && 'bg-[var(--surface-muted)]',
        )}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => {
          if (!toolbarLocked) {
            setHovered(false);
          }
        }}
        onPointerUp={(event) => {
          if (event.pointerType === 'touch' || event.pointerType === 'pen') {
            setTouchActive(true);
          }
        }}
      >
        {showToolbar ? (
          <MessageHoverToolbar
            canEdit={canEdit}
            onReply={() => onReply(message.id)}
            onReact={(emoji) => void onReact(message.id, emoji)}
            onEdit={startEditing}
            onOpenChange={setToolbarLocked}
            onOpenActions={({ x, y }) => openActionsAt(x, y)}
          />
        ) : null}

        {/* Persistent ⋯ when toolbar is hidden (coarse pointers). Hidden once
            the toolbar is open so actions are not duplicated. */}
        {!editing && !showToolbar ? (
          <button
            type="button"
            className="absolute right-1 top-1 z-10 flex min-h-touch min-w-touch items-center justify-center rounded-[var(--radius-sm)] text-[var(--muted)] hover:bg-[var(--surface-muted)] hover:text-[var(--foreground)] [@media(hover:hover)_and_(pointer:fine)]:pointer-events-none [@media(hover:hover)_and_(pointer:fine)]:opacity-0"
            aria-label="Message actions"
            onClick={(event) => {
              event.stopPropagation();
              setTouchActive(true);
              openActionsAt(event.clientX, event.clientY);
            }}
          >
            <MoreHorizontal className="h-4 w-4" />
          </button>
        ) : null}

        <UserAvatar
          user={{
            id: message.sender.id,
            fullName: message.sender.fullName,
            avatarUpdatedAt: message.sender.avatarUpdatedAt,
          }}
          size="sm"
          className="mt-0.5 shrink-0"
        />
        <div className="min-w-0 flex-1 pr-10 sm:pr-8 md:pr-0">
          <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
            <p className="text-sm font-semibold text-[var(--primary)]">
              {message.sender.fullName}
            </p>
            <span className="text-xs text-[var(--muted)]">
              {formatMessageTime(message.createdAt, timeZone)}
            </span>
            {message.isEdited && !editing ? (
              <span className="text-xs text-[var(--muted)]">(edited)</span>
            ) : null}
            {editing ? (
              <span className="text-xs font-medium text-[var(--primary)]">
                Editing
              </span>
            ) : null}
          </div>

          {editing ? (
            <div className="mt-2 space-y-2">
              <textarea
                value={editBody}
                autoFocus
                rows={Math.min(12, Math.max(3, editBody.split('\n').length + 1))}
                onChange={(event) => setEditBody(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === 'Escape') {
                    event.preventDefault();
                    cancelEditing();
                    return;
                  }
                  if (
                    event.key === 'Enter' &&
                    (event.ctrlKey || event.metaKey)
                  ) {
                    event.preventDefault();
                    void handleSaveEdit();
                  }
                }}
                className="min-h-[88px] w-full resize-y rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-sm leading-snug whitespace-pre-wrap outline-none focus:border-[var(--primary)]"
                aria-label="Edit message"
              />
              <div className="flex flex-wrap items-center gap-2">
                <Button
                  size="sm"
                  disabled={saving || !editBody.trim()}
                  onClick={() => void handleSaveEdit()}
                >
                  Save
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  disabled={saving}
                  onClick={cancelEditing}
                >
                  Cancel
                </Button>
                <span className="text-[11px] text-[var(--muted)]">
                  Enter for new line · Ctrl/⌘+Enter to save
                </span>
              </div>
            </div>
          ) : (
            <div
              className={cn(
                'mt-0.5 text-sm leading-snug text-[var(--foreground)]',
                unread && 'font-semibold',
              )}
            >
              <ChatMessageBody
                body={message.body}
                attachments={message.attachments}
                channelId={channelId}
                currentUserId={currentUserId}
              />
            </div>
          )}

          {!editing ? (
            <ReactionBar
              reactions={message.reactions ?? []}
              onToggle={(emoji) => void onReact(message.id, emoji)}
            />
          ) : null}
          {!editing && (message.replyCount ?? 0) > 0 ? (
            <button
              type="button"
              onClick={() => onReply(message.id)}
              className="mt-1 min-h-touch"
            >
              <Badge variant="primary">{message.replyCount} replies</Badge>
            </button>
          ) : null}
        </div>
      </div>
    </ContextMenu>
  );
}
