'use client';

import { useEffect, useState } from 'react';
import { API_BASE_URL, AUTH_TOKEN_KEY } from '@/lib/config';
import { renderMarkdownBody } from '@/lib/chatMarkdown';
import { cn } from '@/lib/cn';
import { ExternalLink, FileText, ImageIcon, MessageSquareText } from 'lucide-react';
import { ImageAnnotationDialog } from '@/components/chat/ImageAnnotationDialog';
import { isAnnotatableImageMime } from '@/lib/image-annotations';

export interface MessageAttachment {
  id: string;
  kind: 'file' | 'link';
  url?: string | null;
  title?: string | null;
  provider?: string | null;
  mimeType?: string | null;
  fileName?: string | null;
  file?: {
    id: string;
    fileName: string;
    mimeType: string;
    processingStatus?: string;
    originalWidth?: number | null;
    originalHeight?: number | null;
    hasWebp?: boolean;
    hasThumbnail?: boolean;
    annotationCount?: number;
  } | null;
}

function providerLabel(provider?: string | null) {
  if (provider === 'google_drive') return 'Google Drive';
  if (provider === 'onedrive') return 'OneDrive';
  return 'Link';
}

function providerClass(provider?: string | null) {
  if (provider === 'google_drive') return 'border-[#4285F4]/30 bg-[#4285F4]/5';
  if (provider === 'onedrive') return 'border-[#0078D4]/30 bg-[#0078D4]/5';
  return 'border-[var(--border)] bg-[var(--surface-muted)]';
}

export function ChatMessageBody({
  body,
  attachments = [],
  channelId,
  currentUserId,
}: {
  body: string;
  attachments?: MessageAttachment[];
  channelId?: string;
  currentUserId?: string;
}) {
  const [reviewing, setReviewing] = useState<{
    fileId: string;
    fileName: string;
    mimeType: string;
    hasWebp?: boolean;
    annotationCount?: number;
    markerNumber?: number | null;
  } | null>(null);

  return (
    <div className="space-y-1">
      {body !== '(attachment)' ? renderMarkdownBody(body) : null}

      {attachments.map((attachment) => {
        if (attachment.kind === 'link' && attachment.url) {
          return (
            <a
              key={attachment.id}
              href={attachment.url}
              target="_blank"
              rel="noopener noreferrer"
              className={cn(
                'flex items-start gap-3 rounded-[var(--radius-md)] border p-3 transition-colors hover:bg-[var(--surface-muted)]',
                providerClass(attachment.provider),
              )}
            >
              <ExternalLink className="mt-0.5 h-4 w-4 shrink-0 text-[var(--primary)]" />
              <span className="min-w-0">
                <span className="block text-xs font-medium uppercase tracking-wide text-[var(--muted)]">
                  {providerLabel(attachment.provider)}
                </span>
                <span className="block truncate text-sm font-medium text-[var(--foreground)]">
                  {attachment.title ?? attachment.url}
                </span>
                <span className="block truncate text-xs text-[var(--muted)]">
                  {attachment.url}
                </span>
              </span>
            </a>
          );
        }

        if (attachment.kind === 'file') {
          const fileId = attachment.file?.id;
          const fileName =
            attachment.file?.fileName ?? attachment.fileName ?? 'Attachment';
          const mimeType = attachment.file?.mimeType ?? attachment.mimeType ?? '';
          const isImage = mimeType.startsWith('image/');
          const isAudio = mimeType.startsWith('audio/');
          const isVideo = mimeType.startsWith('video/');

          if (isImage && fileId) {
            const annotationCount = attachment.file?.annotationCount ?? 0;
            return (
              <div key={attachment.id} className="relative inline-block max-w-full">
                <AuthenticatedImage
                  fileId={fileId}
                  alt={fileName}
                  preferThumbnail={Boolean(attachment.file?.hasThumbnail)}
                  onOpen={() => {
                    if (!channelId) return;
                    setReviewing({
                      fileId,
                      fileName,
                      mimeType,
                      hasWebp: attachment.file?.hasWebp,
                      annotationCount,
                    });
                  }}
                />
                {annotationCount > 0 ? (
                  <span className="pointer-events-none absolute left-2 top-2 inline-flex items-center gap-1 rounded-full bg-black/70 px-2 py-0.5 text-[10px] font-semibold text-white">
                    <MessageSquareText className="h-3 w-3" />
                    {annotationCount}
                  </span>
                ) : isAnnotatableImageMime(mimeType) && channelId ? (
                  <span className="pointer-events-none absolute left-2 top-2 inline-flex items-center gap-1 rounded-full bg-black/55 px-2 py-0.5 text-[10px] font-medium text-white">
                    Feedback
                  </span>
                ) : null}
              </div>
            );
          }

          if ((isAudio || isVideo) && fileId) {
            return (
              <AuthenticatedMedia
                key={attachment.id}
                fileId={fileId}
                mimeType={mimeType}
                fileName={fileName}
              />
            );
          }

          const downloadUrl = fileId
            ? `${API_BASE_URL}/files/${fileId}/download`
            : undefined;

          return (
            <a
              key={attachment.id}
              href={downloadUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-1 flex max-w-md items-center gap-3 rounded-[var(--radius-md)] border border-[var(--primary)]/20 bg-[var(--primary-soft)]/40 px-3 py-2.5 hover:bg-[var(--primary-soft)]/70"
            >
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[var(--radius-sm)] bg-[var(--surface)] text-[var(--primary)] shadow-sm">
                <FileText className="h-4 w-4" />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-medium text-[var(--foreground)]">
                  {fileName}
                </span>
                <span className="block text-xs text-[var(--muted)]">Attachment</span>
              </span>
            </a>
          );
        }

        return null;
      })}

      {reviewing && channelId ? (
        <ImageAnnotationDialog
          open
          channelId={channelId}
          file={{
            id: reviewing.fileId,
            fileName: reviewing.fileName,
            mimeType: reviewing.mimeType,
            hasWebp: reviewing.hasWebp,
            annotationCount: reviewing.annotationCount,
          }}
          mode="review"
          currentUserId={currentUserId ?? ''}
          canAnnotate={Boolean(currentUserId)}
          initialMarkerNumber={reviewing.markerNumber}
          onClose={() => setReviewing(null)}
          onAnnotationsChange={(count) => {
            setReviewing((current) =>
              current ? { ...current, annotationCount: count } : current,
            );
          }}
        />
      ) : null}
    </div>
  );
}

function AuthenticatedImage({
  fileId,
  alt,
  preferThumbnail = false,
  onOpen,
}: {
  fileId: string;
  alt: string;
  preferThumbnail?: boolean;
  onOpen?: () => void;
}) {
  const [src, setSrc] = useState<string | null>(null);

  useEffect(() => {
    let objectUrl: string | null = null;
    let cancelled = false;
    const token = window.localStorage.getItem(AUTH_TOKEN_KEY);
    const variants = preferThumbnail
      ? (['thumbnail', 'webp', 'original'] as const)
      : (['webp', 'original'] as const);

    async function loadImage() {
      for (const variant of variants) {
        try {
          const response = await fetch(
            `${API_BASE_URL}/files/${fileId}/download?variant=${variant}`,
            {
              headers: token ? { Authorization: `Bearer ${token}` } : {},
            },
          );
          if (!response.ok) continue;
          const blob = await response.blob();
          if (cancelled) return;
          objectUrl = URL.createObjectURL(blob);
          setSrc(objectUrl);
          return;
        } catch {
          // try next variant
        }
      }
      if (!cancelled) setSrc(null);
    }

    void loadImage();

    return () => {
      cancelled = true;
      if (objectUrl) {
        URL.revokeObjectURL(objectUrl);
      }
    };
  }, [fileId, preferThumbnail]);

  if (!src) {
    return (
      <div className="flex items-center gap-2 rounded-[var(--radius-md)] border border-[var(--border)] p-3 text-sm text-[var(--muted)]">
        <ImageIcon className="h-4 w-4" />
        {alt}
      </div>
    );
  }

  return (
    <button
      type="button"
      onClick={onOpen}
      className="block max-w-full overflow-hidden rounded-[var(--radius-md)] border border-[var(--border)] text-left"
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={src} alt={alt} className="max-h-64 w-full object-cover" />
    </button>
  );
}

function AuthenticatedMedia({
  fileId,
  mimeType,
  fileName,
}: {
  fileId: string;
  mimeType: string;
  fileName: string;
}) {
  const [src, setSrc] = useState<string | null>(null);

  useEffect(() => {
    let objectUrl: string | null = null;
    const token = window.localStorage.getItem(AUTH_TOKEN_KEY);

    fetch(`${API_BASE_URL}/files/${fileId}/download`, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    })
      .then((response) => {
        if (!response.ok) throw new Error('Unable to load media');
        return response.blob();
      })
      .then((blob) => {
        objectUrl = URL.createObjectURL(blob);
        setSrc(objectUrl);
      })
      .catch(() => setSrc(null));

    return () => {
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [fileId]);

  if (!src) {
    return (
      <div className="rounded-[var(--radius-md)] border border-[var(--border)] p-3 text-sm text-[var(--muted)]">
        {fileName}
      </div>
    );
  }

  if (mimeType.startsWith('audio/')) {
    return (
      <audio controls src={src} className="w-full max-w-md">
        {fileName}
      </audio>
    );
  }

  return (
    <video controls src={src} className="max-h-64 w-full rounded-[var(--radius-md)]">
      {fileName}
    </video>
  );
}
