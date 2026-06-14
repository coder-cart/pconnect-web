'use client';

import { useSearchParams } from 'next/navigation';
import { PageHeader } from '@/components/ui/PageHeader';
import { ChatWorkspace } from '@/components/chat/ChatWorkspace';
import { useWorkspace } from '@/components/providers/WorkspaceProvider';

export default function ChatPage() {
  const { user } = useWorkspace();
  const searchParams = useSearchParams();
  const initialChannelId = searchParams.get('channel');
  const initialMessageId = searchParams.get('message');

  return (
    <div className="flex h-[calc(100dvh-7.5rem)] min-h-[560px] flex-col">
      <PageHeader
        title="Chat"
        description="Channels available to your account, filtered by membership and visibility."
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
