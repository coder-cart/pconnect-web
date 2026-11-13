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
    <div className="chat-fill flex h-full min-h-0 flex-col">
      <ChatWorkspace
        user={user}
        initialChannelId={initialChannelId}
        initialMessageId={initialMessageId}
      />
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
