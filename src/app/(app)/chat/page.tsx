'use client';

import { Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { ChatWorkspace } from '@/components/chat/ChatWorkspace';
import { useWorkspace } from '@/components/providers/WorkspaceProvider';

function ChatPageContent() {
  const { user } = useWorkspace();
  const searchParams = useSearchParams();
  const initialChannelId = searchParams.get('channel');
  const initialMessageId = searchParams.get('message');

  return (
    <div className="chat-fill flex h-[calc(100dvh-4.75rem)] min-h-0 flex-col sm:h-[calc(100dvh-5.5rem)]">
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

export default function ChatPage() {
  return (
    <Suspense fallback={null}>
      <ChatPageContent />
    </Suspense>
  );
}
