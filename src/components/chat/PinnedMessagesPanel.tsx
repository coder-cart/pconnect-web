'use client';

import { Pin, PinOff } from 'lucide-react';
import { UserAvatar } from '@/components/ui/UserAvatar';
import { Button } from '@/components/ui/Button';
import { ChatMessageBody } from '@/components/chat/ChatMessageBody';
import { EmptyState } from '@/components/ui/StatePanels';
import { ListSkeleton } from '@/components/ui/Skeleton';
import { ChatMessage } from '@/lib/chat-types';
import { formatMessageTime } from '@/lib/formatMessageDate';
import { useViewerTimeZone } from '@/hooks/useViewerTimeZone';

interface PinnedMessageRecord {
  id: string;
  pinnedAt: string;
  message: ChatMessage;
}

interface PinnedMessagesPanelProps {
  pins: PinnedMessageRecord[];
  isLoading: boolean;
  canUnpin: boolean;
  onJumpToMessage: (messageId: string) => void;
  onUnpin: (messageId: string) => Promise<void>;
}

export function PinnedMessagesPanel({
  pins,
  isLoading,
  canUnpin,
  onJumpToMessage,
  onUnpin,
}: PinnedMessagesPanelProps) {
  const timeZone = useViewerTimeZone();

  if (isLoading) {
    return (
      <div className="p-4">
        <ListSkeleton rows={3} />
      </div>
    );
  }

  if (pins.length === 0) {
    return (
      <div className="flex flex-1 items-center justify-center p-6">
        <EmptyState
          title="No pinned messages"
          description="Pin important messages from the message menu to find them here."
        />
      </div>
    );
  }

  return (
    <div className="min-h-0 flex-1 overflow-y-auto p-4">
      <div className="space-y-3">
        {pins.map((pin) => (
          <div
            key={pin.id}
            className="rounded-[var(--radius-md)] border border-[var(--border)] p-3"
          >
            <div className="mb-2 flex items-start justify-between gap-3">
              <button
                type="button"
                onClick={() => onJumpToMessage(pin.message.id)}
                className="flex min-w-0 flex-1 items-start gap-3 text-left"
              >
                <UserAvatar
                  user={{
                    id: pin.message.sender.id,
                    fullName: pin.message.sender.fullName,
                    avatarUpdatedAt: pin.message.sender.avatarUpdatedAt,
                  }}
                  size="sm"
                  className="mt-0.5 shrink-0"
                />
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-sm font-semibold text-[var(--foreground)]">
                      {pin.message.sender.fullName}
                    </span>
                    <span className="text-xs text-[var(--muted)]">
                      {formatMessageTime(pin.message.createdAt, timeZone)}
                    </span>
                    <Pin className="h-3.5 w-3.5 text-[var(--primary)]" />
                  </div>
                  <div className="mt-1 text-sm text-[var(--foreground)]">
                    <ChatMessageBody body={pin.message.body} />
                  </div>
                </div>
              </button>
              {canUnpin ? (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  aria-label="Unpin message"
                  onClick={() => void onUnpin(pin.message.id)}
                >
                  <PinOff className="h-4 w-4" />
                </Button>
              ) : null}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
