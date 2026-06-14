'use client';

import { useEffect, useState } from 'react';
import { apiRequest } from '@/lib/api-client';
import { ApiResponse } from '@/lib/auth';

interface ChannelCanvasPanelProps {
  channelId: string;
}

export function ChannelCanvasPanel({ channelId }: ChannelCanvasPanelProps) {
  const [content, setContent] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    setIsLoading(true);
    apiRequest<ApiResponse<{ content: string }>>(`/channels/${channelId}/canvas`)
      .then((response) => setContent(response.data.content ?? ''))
      .catch((error: Error) => setErrorMessage(error.message))
      .finally(() => setIsLoading(false));
  }, [channelId]);

  useEffect(() => {
    if (isLoading) return;

    const timeout = window.setTimeout(() => {
      setIsSaving(true);
      apiRequest<ApiResponse<{ content: string }>>(`/channels/${channelId}/canvas`, {
        method: 'PATCH',
        body: JSON.stringify({ content }),
      })
        .catch((error: Error) => setErrorMessage(error.message))
        .finally(() => setIsSaving(false));
    }, 800);

    return () => window.clearTimeout(timeout);
  }, [channelId, content, isLoading]);

  if (isLoading) {
    return <p className="p-4 text-sm text-[var(--muted)]">Loading canvas...</p>;
  }

  return (
    <div className="flex flex-1 flex-col p-4">
      <div className="mb-3 flex items-center justify-between">
        <p className="text-sm font-medium text-[var(--foreground)]">Channel canvas</p>
        {isSaving ? (
          <span className="text-xs text-[var(--muted)]">Saving...</span>
        ) : null}
      </div>
      <textarea
        value={content}
        onChange={(event) => setContent(event.target.value)}
        placeholder="Add notes, links, or markdown for this channel..."
        className="min-h-[320px] flex-1 rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-sm outline-none focus:border-[var(--primary)]"
      />
      {errorMessage ? (
        <p className="mt-2 text-sm text-[var(--danger)]">{errorMessage}</p>
      ) : null}
    </div>
  );
}
