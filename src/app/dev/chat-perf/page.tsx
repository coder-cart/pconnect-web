'use client';

import dynamic from 'next/dynamic';

const chatPerfEnabled =
  process.env.NODE_ENV !== 'production' ||
  process.env.NEXT_PUBLIC_ENABLE_CHAT_PERF === '1';

const ChatPerfClient = dynamic(() => import('./ChatPerfClient'), {
  ssr: false,
  loading: () => (
    <main className="p-6 text-sm text-[var(--muted)]">
      <span data-testid="chat-perf-ready">loading</span>
    </main>
  ),
});

export default function ChatPerfHarnessPage() {
  if (!chatPerfEnabled) {
    return (
      <main className="p-6 text-sm text-[var(--muted)]">
        Chat perf harness is disabled in this build.
      </main>
    );
  }

  return <ChatPerfClient />;
}
