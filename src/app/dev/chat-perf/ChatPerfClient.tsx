'use client';

/**
 * Browser-only Virtuoso measurement surface (loaded with ssr:false).
 */

import { useEffect, useMemo, useState } from 'react';
import { MessageList } from '@/components/chat/MessageList';
import { WorkspaceProvider } from '@/components/providers/WorkspaceProvider';
import type { AuthenticatedUser } from '@/lib/auth';
import type { ChatMessage } from '@/lib/chat-types';

declare global {
  interface Window {
    __CHAT_PERF__?: {
      n: number;
      measure: () => {
        n: number;
        domMessageRows: number;
        domNodes: number;
        heapUsedMB: number | null;
        scrollHeight: number;
        clientHeight: number;
      };
    };
  }
}

const PERF_USER: AuthenticatedUser = {
  id: 'perf-me',
  tenantId: 'perf-tenant',
  email: 'perf@example.com',
  fullName: 'Perf User',
  userType: 'internal',
  roleCodes: [],
  permissionCodes: [],
  timeZone: 'UTC',
  effectiveTimeZone: 'UTC',
};

function buildMessages(count: number): ChatMessage[] {
  const now = Date.now();
  return Array.from({ length: count }, (_, index) => {
    const i = count - index;
    const rich = i % 9 === 0;
    const withImage = i % 17 === 0;
    const message = {
      id: `perf-msg-${i}`,
      body: rich
        ? `## Perf message ${i}\n\n${'Lorem ipsum dolor sit amet. '.repeat(12)}\n\n- item a\n- item b\n\n**bold** and _italic_`
        : `Perf message ${i} — ${'hello world '.repeat(8)}`,
      createdAt: new Date(now - i * 60_000).toISOString(),
      updatedAt: new Date(now - i * 60_000).toISOString(),
      sender: {
        id: `perf-user-${i % 12}`,
        fullName: `Perf User ${i % 12}`,
        email: `perf${i % 12}@example.com`,
        avatarUpdatedAt: null,
      },
      attachments: withImage
        ? [
            {
              id: `perf-att-${i}`,
              kind: 'file' as const,
              fileName: `shot-${i}.png`,
              mimeType: 'image/png',
              file: {
                id: `perf-file-${i}`,
                fileName: `shot-${i}.png`,
                mimeType: 'image/png',
                originalWidth: 1200,
                originalHeight: 800,
                hasWebp: false,
                hasThumbnail: false,
              },
            },
          ]
        : [],
      reactions:
        i % 11 === 0
          ? [
              {
                emoji: '👍',
                count: 2,
                reactedByMe: false,
                userIds: ['u1', 'u2'],
                users: [
                  { id: 'u1', fullName: 'A' },
                  { id: 'u2', fullName: 'B' },
                ],
              },
            ]
          : [],
      replyCount: i % 23 === 0 ? 3 : 0,
      isThreadReply: false,
      parentMessageId: null,
    };
    return message as ChatMessage;
  });
}

function parseCount(raw: string | null): number {
  const n = Number(raw ?? '1000');
  if (!Number.isFinite(n)) return 1000;
  return Math.min(Math.max(Math.floor(n), 1), 5000);
}

export default function ChatPerfClient() {
  const [count, setCount] = useState(() =>
    parseCount(new URLSearchParams(window.location.search).get('n')),
  );
  const [ready, setReady] = useState(false);
  const messages = useMemo(() => buildMessages(count), [count]);

  useEffect(() => {
    window.__CHAT_PERF__ = {
      n: count,
      measure: () => {
        const perfMemory = (
          performance as Performance & {
            memory?: { usedJSHeapSize: number };
          }
        ).memory;
        const scroller =
          document.querySelector(
            '[data-testid="chat-perf-root"] [data-virtuoso-scroller]',
          ) ?? document.querySelector('[data-testid="chat-perf-root"]');
        return {
          n: count,
          domMessageRows: document.querySelectorAll(
            '[data-testid="chat-perf-root"] .chat-message-row',
          ).length,
          domNodes: document.querySelectorAll(
            '[data-testid="chat-perf-root"] *',
          ).length,
          heapUsedMB: perfMemory
            ? Math.round((perfMemory.usedJSHeapSize / 1024 / 1024) * 100) / 100
            : null,
          scrollHeight:
            scroller instanceof HTMLElement ? scroller.scrollHeight : 0,
          clientHeight:
            scroller instanceof HTMLElement ? scroller.clientHeight : 0,
        };
      },
    };
    setReady(true);
  }, [count]);

  return (
    <WorkspaceProvider
      user={PERF_USER}
      refreshKey={0}
      notifyRefresh={() => undefined}
      refreshUser={async () => undefined}
    >
      <main className="fixed inset-0 flex flex-col bg-[var(--background)] text-[var(--foreground)]">
        <header className="flex shrink-0 flex-wrap items-center gap-3 border-b border-[var(--border)] px-4 py-3">
          <h1 className="text-sm font-semibold">Chat perf harness</h1>
          <label className="flex items-center gap-2 text-xs">
            Messages
            <select
              className="rounded border border-[var(--border)] bg-[var(--surface)] px-2 py-1"
              value={count}
              onChange={(event) => {
                const next = Number(event.target.value);
                setCount(next);
                const url = new URL(window.location.href);
                url.searchParams.set('n', String(next));
                window.history.replaceState({}, '', url);
              }}
            >
              {[50, 100, 500, 1000, 2000, 5000].map((value) => (
                <option key={value} value={value}>
                  {value}
                </option>
              ))}
            </select>
          </label>
          <span
            className="text-xs text-[var(--muted)]"
            data-testid="chat-perf-ready"
          >
            {ready ? 'ready' : 'loading'}
          </span>
        </header>
        <div
          data-testid="chat-perf-root"
          className="flex min-h-0 flex-1 flex-col border border-[var(--border)] bg-[var(--surface)]"
        >
          <MessageList
            messages={messages}
            channelId="perf-channel"
            currentUserId="perf-me"
            canManageChannel={false}
            isLoading={false}
            activeThreadMessageId={null}
            scrollKey={`perf-${count}`}
            unreadSince={messages[Math.floor(messages.length * 0.8)]?.createdAt}
            onReply={() => undefined}
            onReact={async () => undefined}
            onEdit={async () => undefined}
            onDelete={() => undefined}
            onPin={async () => undefined}
            onCopyMessage={() => undefined}
            onCopyLink={() => undefined}
            onMarkUnread={async () => undefined}
            className="h-full"
          />
        </div>
      </main>
    </WorkspaceProvider>
  );
}
