'use client';

import { useSearchParams } from 'next/navigation';
import { PageHeader } from '@/components/ui/PageHeader';
import { ChatWorkspace } from '@/components/chat/ChatWorkspace';
import { useWorkspace } from '@/components/providers/WorkspaceProvider';
import { userIsExternal } from '@/lib/auth';

export default function ChatPage() {
  const { user } = useWorkspace();
  const searchParams = useSearchParams();
  const initialChannelId = searchParams.get('channel');
  const initialMessageId = searchParams.get('message');
  const isExternalUser = userIsExternal(user);

  if (isExternalUser) {
    return (
      <div className="flex h-[calc(100dvh-7.5rem)] min-h-[560px] flex-col">
        <div className="mb-4 shrink-0">
          <h1 className="text-lg font-semibold text-[var(--foreground)]">Messages</h1>
          <p className="mt-1 text-sm text-[var(--muted)]">
            Conversation with your project team.
          </p>
        </div>
        <div className="min-h-0 flex-1">
          <ChatWorkspace
            user={user}
            initialChannelId={initialChannelId}
            initialMessageId={initialMessageId}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-[calc(100dvh-7.5rem)] min-h-[560px] flex-col">
      <PageHeader
        title="Chat"
        description="Team channels, client message hubs, and direct messages."
        breadcrumbs={[
          { label: 'Workspace', href: '/dashboard' },
          { label: 'Chat' },
        ]}
        className="mb-4 shrink-0"
      />
      <div className="min-h-0 flex-1">
        <ChatWorkspace
          user={user}
          initialChannelId={initialChannelId}
          initialMessageId={initialMessageId}
        />
      </div>
    </div>
  );
}
