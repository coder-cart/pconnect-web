'use client';

import { FormEvent, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import {
  AtSign,
  Bold,
  Code,
  Italic,
  Link2,
  List,
  ListOrdered,
  Mic,
  MessageSquareText,
  Paperclip,
  Plus,
  Quote,
  Send,
  Smile,
  Strikethrough,
  Type,
  Video,
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import {
  DropdownMenu,
  DropdownMenuItem,
} from '@/components/ui/DropdownMenu';
import { EmojiPicker } from '@/components/chat/EmojiPicker';
import { MentionPicker } from '@/components/chat/MentionPicker';
import { ImageAnnotationDialog } from '@/components/chat/ImageAnnotationDialog';
import { cn } from '@/lib/cn';
import { positionPanelAboveAnchor } from '@/lib/viewport-menu';
import { CHAT_MEDIA_UPLOADS_ENABLED } from '@/lib/chat-release';
import {
  ChannelMemberOption,
  filterMentionCandidates,
  getClientTeamMembers,
} from '@/lib/channelMembers';
import {
  getMentionContext,
  htmlToMarkdown,
  insertMentionSpan,
  isEditorEmpty,
} from '@/lib/chatMarkdown';
import { API_BASE_URL, AUTH_TOKEN_KEY } from '@/lib/config';
import {
  AnnotatableFile,
  IMAGE_ANNOTATION_ACCEPT,
  isAnnotatableImageMime,
  validateAnnotatableImageFile,
} from '@/lib/image-annotations';

interface PendingAttachment {
  kind: 'file' | 'link';
  fileId?: string;
  url?: string;
  title?: string;
  label: string;
  mimeType?: string;
  previewUrl?: string | null;
  annotationCount?: number;
  hasWebp?: boolean;
  originalWidth?: number | null;
  originalHeight?: number | null;
}

interface ChatComposerProps {
  channelId: string | null;
  channelName?: string;
  placeholder?: string;
  isSubmitting?: boolean;
  variant?: 'channel' | 'thread';
  channelType?: string;
  members?: ChannelMemberOption[];
  currentUserId?: string;
  isInternalUser?: boolean;
  onSubmit: (payload: {
    body: string;
    attachments: Array<{
      kind: 'file' | 'link';
      fileId?: string;
      url?: string;
      title?: string;
    }>;
    alsoSendToChannel?: boolean;
    notifyClientTeam?: boolean;
  }) => Promise<void>;
}

export function ChatComposer({
  channelId,
  channelName,
  placeholder,
  isSubmitting = false,
  variant = 'channel',
  channelType,
  members = [],
  currentUserId = '',
  isInternalUser = false,
  onSubmit,
}: ChatComposerProps) {
  const [isEmpty, setIsEmpty] = useState(true);
  const [attachments, setAttachments] = useState<PendingAttachment[]>([]);
  const [emojiOpen, setEmojiOpen] = useState(false);
  const [linkOpen, setLinkOpen] = useState(false);
  const [formatOpen, setFormatOpen] = useState(true);
  const [linkUrl, setLinkUrl] = useState('');
  const [linkTitle, setLinkTitle] = useState('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<number | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [alsoSendToChannel, setAlsoSendToChannel] = useState(false);
  const [notifyClientTeam, setNotifyClientTeam] = useState(false);
  const [mentionOpen, setMentionOpen] = useState(false);
  const [mentionQuery, setMentionQuery] = useState('');
  const [mentionActiveIndex, setMentionActiveIndex] = useState(0);
  const [mentionRange, setMentionRange] = useState<Range | null>(null);
  const [annotatingFile, setAnnotatingFile] = useState<AnnotatableFile | null>(
    null,
  );
  const fileInputRef = useRef<HTMLInputElement>(null);
  const editorRef = useRef<HTMLDivElement>(null);
  const composerShellRef = useRef<HTMLDivElement>(null);
  const emojiButtonRef = useRef<HTMLButtonElement>(null);
  const emojiPanelRef = useRef<HTMLDivElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const mediaChunksRef = useRef<Blob[]>([]);
  const [emojiPos, setEmojiPos] = useState({ left: 0, top: 0 });
  const [emojiReady, setEmojiReady] = useState(false);

  const isThread = variant === 'thread';
  const mentionCandidates = filterMentionCandidates(
    members,
    currentUserId,
    isInternalUser,
    mentionQuery,
  );
  const clientTeamMembers = getClientTeamMembers(members);
  const showNotifyClientTeam =
    isThread &&
    isInternalUser &&
    channelType === 'client_shared' &&
    clientTeamMembers.length > 0;

  function syncEditorState() {
    setIsEmpty(isEditorEmpty(editorRef.current));
    updateMentionPicker();
  }

  function updateMentionPicker() {
    if (!editorRef.current || members.length === 0) {
      setMentionOpen(false);
      setMentionQuery('');
      setMentionRange(null);
      return;
    }

    const context = getMentionContext(editorRef.current);
    if (!context) {
      setMentionOpen(false);
      setMentionQuery('');
      setMentionRange(null);
      return;
    }

    const candidates = filterMentionCandidates(
      members,
      currentUserId,
      isInternalUser,
      context.query,
    );

    if (candidates.length === 0) {
      setMentionOpen(false);
      setMentionQuery('');
      setMentionRange(null);
      return;
    }

    setMentionOpen(true);
    setMentionQuery(context.query);
    setMentionRange(context.mentionRange);
    setMentionActiveIndex((current) =>
      current >= candidates.length ? 0 : current,
    );
  }

  function closeMentionPicker() {
    setMentionOpen(false);
    setMentionQuery('');
    setMentionRange(null);
    setMentionActiveIndex(0);
  }

  function selectMention(member: ChannelMemberOption) {
    if (!editorRef.current || !mentionRange) return;

    insertMentionSpan(editorRef.current, mentionRange, member);
    closeMentionPicker();
    syncEditorState();
  }

  function focusEditor() {
    editorRef.current?.focus();
  }

  function applyFormat(command: string, value?: string) {
    focusEditor();
    document.execCommand(command, false, value);
    syncEditorState();
  }

  function applyLink() {
    focusEditor();
    const url = window.prompt('Enter link URL');
    if (!url?.trim()) return;
    applyFormat('createLink', url.trim());
  }

  function applyCodeBlock() {
    focusEditor();
    const selection = window.getSelection();
    const selectedText = selection?.toString() || 'code';
    document.execCommand(
      'insertHTML',
      false,
      `<pre><code>${selectedText.replace(/</g, '&lt;').replace(/>/g, '&gt;')}</code></pre>`,
    );
    syncEditorState();
  }

  function insertAtCursor(text: string) {
    focusEditor();
    document.execCommand('insertText', false, text);
    syncEditorState();
  }

  function triggerMentionPicker() {
    insertAtCursor('@');
  }

  function getMessageBody() {
    if (!editorRef.current) return '';
    return htmlToMarkdown(editorRef.current);
  }

  function clearEditor() {
    if (editorRef.current) {
      editorRef.current.innerHTML = '';
    }
    setIsEmpty(true);
    setAlsoSendToChannel(false);
    setNotifyClientTeam(false);
    closeMentionPicker();
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!channelId || isSubmitting || isUploading || isRecording) return;

    const messageBody = getMessageBody();
    if (!messageBody.trim() && attachments.length === 0) return;

    setErrorMessage(null);

    try {
      await onSubmit({
        body: messageBody.trim(),
        attachments: attachments.map(({ kind, fileId, url, title }) => ({
          kind,
          fileId,
          url,
          title,
        })),
        ...(isThread ? { alsoSendToChannel, notifyClientTeam } : {}),
      });
      clearEditor();
      setAttachments([]);
      setLinkOpen(false);
      setLinkUrl('');
      setLinkTitle('');
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : 'Unable to send message',
      );
    }
  }

  async function uploadBlob(
    blob: Blob,
    fileName: string,
    mimeType: string,
    previewUrl?: string | null,
  ) {
    if (!channelId) return;

    const token = window.localStorage.getItem(AUTH_TOKEN_KEY);
    const formData = new FormData();
    formData.append('file', new File([blob], fileName, { type: mimeType }));

    const payload = await new Promise<{
      id: string;
      fileName: string;
      mimeType: string;
      processingStatus?: string;
      originalWidth?: number | null;
      originalHeight?: number | null;
      webpStorageKey?: string | null;
      thumbnailStorageKey?: string | null;
      _count?: { imageAnnotations: number };
    }>((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      xhr.open(
        'POST',
        `${API_BASE_URL}/channels/${channelId}/attachments/upload`,
      );
      if (token) {
        xhr.setRequestHeader('Authorization', `Bearer ${token}`);
      }
      xhr.upload.onprogress = (event) => {
        if (!event.lengthComputable) return;
        setUploadProgress(Math.round((event.loaded / event.total) * 100));
      };
      xhr.onload = () => {
        try {
          const body = JSON.parse(xhr.responseText) as {
            success?: boolean;
            data?: {
              id: string;
              fileName: string;
              mimeType: string;
              processingStatus?: string;
              originalWidth?: number | null;
              originalHeight?: number | null;
              webpStorageKey?: string | null;
              thumbnailStorageKey?: string | null;
              _count?: { imageAnnotations: number };
            };
            message?: string;
          };
          if (xhr.status >= 200 && xhr.status < 300 && body.success && body.data) {
            resolve(body.data);
            return;
          }
          reject(new Error(body.message ?? 'Upload failed'));
        } catch {
          reject(new Error('Upload failed'));
        }
      };
      xhr.onerror = () => reject(new Error('Upload failed'));
      xhr.send(formData);
    });

    const nextAttachment: PendingAttachment = {
      kind: 'file',
      fileId: payload.id,
      label: payload.fileName,
      mimeType: payload.mimeType,
      previewUrl: previewUrl ?? null,
      annotationCount: payload._count?.imageAnnotations ?? 0,
      hasWebp: Boolean(payload.webpStorageKey),
      originalWidth: payload.originalWidth,
      originalHeight: payload.originalHeight,
    };

    setAttachments((current) => [...current, nextAttachment]);

    if (isAnnotatableImageMime(payload.mimeType)) {
      setAnnotatingFile({
        id: payload.id,
        fileName: payload.fileName,
        mimeType: payload.mimeType,
        processingStatus: payload.processingStatus,
        originalWidth: payload.originalWidth,
        originalHeight: payload.originalHeight,
        hasWebp: Boolean(payload.webpStorageKey),
        hasThumbnail: Boolean(payload.thumbnailStorageKey),
        annotationCount: payload._count?.imageAnnotations ?? 0,
      });
    }
  }

  async function handleFileSelected(fileList: FileList | null) {
    if (!CHAT_MEDIA_UPLOADS_ENABLED || !channelId || !fileList?.length) return;

    setIsUploading(true);
    setUploadProgress(0);
    setErrorMessage(null);

    try {
      for (const file of Array.from(fileList)) {
        if (isAnnotatableImageMime(file.type)) {
          const validationError = validateAnnotatableImageFile(file);
          if (validationError) {
            throw new Error(validationError);
          }
        }
        const previewUrl = file.type.startsWith('image/')
          ? URL.createObjectURL(file)
          : null;
        await uploadBlob(file, file.name, file.type, previewUrl);
      }
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : 'Unable to upload file',
      );
    } finally {
      setIsUploading(false);
      setUploadProgress(null);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  }

  async function startRecording(kind: 'audio' | 'video') {
    if (!CHAT_MEDIA_UPLOADS_ENABLED || !channelId || isRecording) return;

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: true,
        video: kind === 'video',
      });
      const mimeType =
        kind === 'video' && MediaRecorder.isTypeSupported('video/webm')
          ? 'video/webm'
          : MediaRecorder.isTypeSupported('audio/webm')
            ? 'audio/webm'
            : 'audio/mp4';

      const recorder = new MediaRecorder(stream, { mimeType });
      mediaChunksRef.current = [];
      mediaRecorderRef.current = recorder;

      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          mediaChunksRef.current.push(event.data);
        }
      };

      recorder.onstop = () => {
        stream.getTracks().forEach((track) => track.stop());
        const blob = new Blob(mediaChunksRef.current, { type: mimeType });
        const extension = mimeType.includes('video') ? 'webm' : 'webm';
        void uploadBlob(blob, `${kind}-clip.${extension}`, mimeType).catch(
          (error: Error) => setErrorMessage(error.message),
        );
        setIsRecording(false);
      };

      recorder.start();
      setIsRecording(true);
      window.setTimeout(() => {
        if (mediaRecorderRef.current?.state === 'recording') {
          mediaRecorderRef.current.stop();
        }
      }, 5000);
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : 'Unable to access microphone',
      );
    }
  }

  function addLinkAttachment() {
    if (!linkUrl.trim()) return;

    setAttachments((current) => [
      ...current,
      {
        kind: 'link',
        url: linkUrl.trim(),
        title: linkTitle.trim() || linkUrl.trim(),
        label: linkTitle.trim() || linkUrl.trim(),
      },
    ]);
    setLinkOpen(false);
    setLinkUrl('');
    setLinkTitle('');
  }

  useLayoutEffect(() => {
    if (!emojiOpen) {
      setEmojiReady(false);
      return;
    }

    function place() {
      const anchor = emojiButtonRef.current?.getBoundingClientRect();
      const panel = emojiPanelRef.current?.getBoundingClientRect();
      if (!anchor || !panel) return;
      setEmojiPos(positionPanelAboveAnchor(anchor, panel.width, panel.height));
      setEmojiReady(true);
    }

    place();
    const vv = window.visualViewport;
    vv?.addEventListener('resize', place);
    vv?.addEventListener('scroll', place);
    window.addEventListener('resize', place);
    return () => {
      vv?.removeEventListener('resize', place);
      vv?.removeEventListener('scroll', place);
      window.removeEventListener('resize', place);
    };
  }, [emojiOpen]);

  useEffect(() => {
    if (!emojiOpen) return;
    function handlePointerDown(event: MouseEvent | TouchEvent) {
      const target = event.target as Node;
      if (
        emojiButtonRef.current?.contains(target) ||
        emojiPanelRef.current?.contains(target)
      ) {
        return;
      }
      setEmojiOpen(false);
    }
    document.addEventListener('mousedown', handlePointerDown);
    document.addEventListener('touchstart', handlePointerDown, {
      passive: true,
    });
    return () => {
      document.removeEventListener('mousedown', handlePointerDown);
      document.removeEventListener('touchstart', handlePointerDown);
    };
  }, [emojiOpen]);

  function handleEditorKeyDown(event: React.KeyboardEvent<HTMLDivElement>) {
    if (mentionOpen && mentionCandidates.length > 0) {
      if (event.key === 'ArrowDown') {
        event.preventDefault();
        setMentionActiveIndex(
          (current) => (current + 1) % mentionCandidates.length,
        );
        return;
      }

      if (event.key === 'ArrowUp') {
        event.preventDefault();
        setMentionActiveIndex(
          (current) =>
            (current - 1 + mentionCandidates.length) % mentionCandidates.length,
        );
        return;
      }

      if (event.key === 'Enter') {
        event.preventDefault();
        selectMention(mentionCandidates[mentionActiveIndex]);
        return;
      }

      if (event.key === 'Escape') {
        event.preventDefault();
        closeMentionPicker();
        return;
      }
    }

    // Enter / Shift+Enter insert a new line in the contentEditable.
    // Only Ctrl/Cmd+Enter (or the Send button) submits the message.
    if (event.key === 'Enter' && (event.ctrlKey || event.metaKey)) {
      event.preventDefault();
      event.currentTarget.closest('form')?.requestSubmit();
    }
  }

  return (
    <form onSubmit={(event) => void handleSubmit(event)} className="space-y-2">
      {attachments.length > 0 ? (
        <div className="flex flex-wrap gap-2">
          {attachments.map((attachment, index) => (
            <span
              key={`${attachment.fileId ?? attachment.url}-${index}`}
              className="inline-flex max-w-full items-center gap-2 rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--surface-muted)] px-2 py-1.5 text-xs"
            >
              {attachment.previewUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={attachment.previewUrl}
                  alt=""
                  className="h-10 w-10 rounded object-cover"
                />
              ) : null}
              <span className="min-w-0">
                <span className="block truncate font-medium text-[var(--foreground)]">
                  {attachment.label}
                </span>
                {attachment.annotationCount ? (
                  <span className="text-[11px] text-[var(--muted)]">
                    {attachment.annotationCount} feedback marker
                    {attachment.annotationCount === 1 ? '' : 's'}
                  </span>
                ) : null}
              </span>
              {attachment.fileId &&
              isAnnotatableImageMime(attachment.mimeType) ? (
                <button
                  type="button"
                  className="rounded p-1 text-[var(--muted)] hover:bg-[var(--surface)] hover:text-[var(--foreground)]"
                  title="Annotate image"
                  onClick={() =>
                    setAnnotatingFile({
                      id: attachment.fileId!,
                      fileName: attachment.label,
                      mimeType: attachment.mimeType ?? 'image/jpeg',
                      hasWebp: attachment.hasWebp,
                      originalWidth: attachment.originalWidth,
                      originalHeight: attachment.originalHeight,
                      annotationCount: attachment.annotationCount,
                    })
                  }
                >
                  <MessageSquareText className="h-3.5 w-3.5" />
                </button>
              ) : null}
              <button
                type="button"
                className="text-[var(--muted)] hover:text-[var(--foreground)]"
                onClick={() =>
                  setAttachments((current) => {
                    const next = current.filter(
                      (_, itemIndex) => itemIndex !== index,
                    );
                    if (attachment.previewUrl) {
                      URL.revokeObjectURL(attachment.previewUrl);
                    }
                    return next;
                  })
                }
              >
                ×
              </button>
            </span>
          ))}
        </div>
      ) : null}

      {isUploading && uploadProgress != null ? (
        <div className="h-1.5 overflow-hidden rounded-full bg-[var(--surface-muted)]">
          <div
            className="h-full bg-[var(--primary)] transition-all"
            style={{ width: `${uploadProgress}%` }}
          />
        </div>
      ) : null}

      {linkOpen ? (
        <div className="rounded-[var(--radius-md)] border border-[var(--border)] p-3">
          <p className="mb-2 text-xs font-medium text-[var(--muted)]">
            Paste a link (Google Drive, OneDrive, or any URL)
          </p>
          <div className="space-y-2">
            <input
              value={linkUrl}
              onChange={(event) => setLinkUrl(event.target.value)}
              placeholder="https://drive.google.com/..."
              className="h-10 w-full rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--surface)] px-3 text-sm outline-none focus:border-[var(--primary)]"
            />
            <input
              value={linkTitle}
              onChange={(event) => setLinkTitle(event.target.value)}
              placeholder="Optional title"
              className="h-10 w-full rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--surface)] px-3 text-sm outline-none focus:border-[var(--primary)]"
            />
            <div className="flex gap-2">
              <Button type="button" size="sm" onClick={addLinkAttachment}>
                Add link
              </Button>
              <Button
                type="button"
                size="sm"
                variant="ghost"
                onClick={() => setLinkOpen(false)}
              >
                Cancel
              </Button>
            </div>
          </div>
        </div>
      ) : null}

      <div
        ref={composerShellRef}
        className="relative overflow-visible rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--surface)]"
      >
        {formatOpen ? (
          <div className="flex flex-wrap items-center gap-0.5 border-b border-[var(--border)] px-2 py-1.5">
            {[
              {
                icon: Bold,
                label: 'Bold',
                action: () => applyFormat('bold'),
              },
              {
                icon: Italic,
                label: 'Italic',
                action: () => applyFormat('italic'),
              },
              {
                icon: Strikethrough,
                label: 'Strikethrough',
                action: () => applyFormat('strikeThrough'),
              },
              { icon: Link2, label: 'Link', action: applyLink },
              {
                icon: ListOrdered,
                label: 'Numbered list',
                action: () => applyFormat('insertOrderedList'),
              },
              {
                icon: List,
                label: 'Bulleted list',
                action: () => applyFormat('insertUnorderedList'),
              },
              {
                icon: Quote,
                label: 'Blockquote',
                action: () => applyFormat('formatBlock', 'blockquote'),
              },
              { icon: Code, label: 'Code block', action: applyCodeBlock },
            ].map(({ icon: Icon, label, action }) => (
              <button
                key={label}
                type="button"
                aria-label={label}
                className="min-h-touch min-w-touch rounded-[var(--radius-sm)] p-1.5 text-[var(--muted)] hover:bg-[var(--surface-muted)] hover:text-[var(--foreground)] sm:min-h-0 sm:min-w-0"
                onMouseDown={(event) => event.preventDefault()}
                onClick={action}
              >
                <Icon className="h-4 w-4" />
              </button>
            ))}
          </div>
        ) : null}

        <div
          ref={editorRef}
          contentEditable
          role="textbox"
          aria-multiline="true"
          data-placeholder={
            placeholder ??
            (isThread ? 'Reply...' : `Message #${channelName ?? 'channel'}`)
          }
          suppressContentEditableWarning
          onInput={syncEditorState}
          className={cn(
            'max-h-[240px] min-h-[52px] w-full overflow-y-auto bg-transparent px-2.5 py-2 text-sm outline-none sm:min-h-[60px] sm:px-3',
            'whitespace-pre-wrap break-words',
            'empty:before:pointer-events-none empty:before:text-[var(--muted)] empty:before:content-[attr(data-placeholder)]',
            '[&_a]:text-[var(--primary)] [&_a]:underline',
            '[&_[data-mention-id]]:rounded [&_[data-mention-id]]:bg-[var(--primary-soft)] [&_[data-mention-id]]:px-1 [&_[data-mention-id]]:font-medium [&_[data-mention-id]]:text-[var(--primary)]',
            '[&_blockquote]:border-l-2 [&_blockquote]:border-[var(--border)] [&_blockquote]:pl-3 [&_blockquote]:text-[var(--muted-foreground)]',
            '[&_code]:rounded [&_code]:bg-[var(--surface-muted)] [&_code]:px-1 [&_code]:font-mono [&_code]:text-[0.85em]',
            '[&_pre]:overflow-x-auto [&_pre]:rounded-[var(--radius-md)] [&_pre]:bg-[var(--surface-muted)] [&_pre]:p-2 [&_pre]:font-mono [&_pre]:text-xs',
            '[&_ol]:list-decimal [&_ol]:pl-5 [&_ul]:list-disc [&_ul]:pl-5',
          )}
          onKeyDown={handleEditorKeyDown}
        />

        {isThread ? (
          <div className="space-y-2 border-t border-[var(--border)] px-3 py-2">
            <label className="flex items-center gap-2 text-sm text-[var(--foreground)]">
              <input
                type="checkbox"
                checked={alsoSendToChannel}
                onChange={(event) => setAlsoSendToChannel(event.target.checked)}
                className="rounded border-[var(--border)]"
              />
              Also send to #{channelName ?? 'channel'}
            </label>
            {showNotifyClientTeam ? (
              <label className="flex items-center gap-2 text-sm text-[var(--foreground)]">
                <input
                  type="checkbox"
                  checked={notifyClientTeam}
                  onChange={(event) => setNotifyClientTeam(event.target.checked)}
                  className="rounded border-[var(--border)]"
                />
                Notify client team ({clientTeamMembers.length}{' '}
                {clientTeamMembers.length === 1 ? 'member' : 'members'})
              </label>
            ) : null}
          </div>
        ) : null}

        <div className="flex items-center justify-between border-t border-[var(--border)] px-2 py-1.5">
          <div className="flex items-center gap-0.5">
            <DropdownMenu
              trigger={
                <button
                  type="button"
                  className="min-h-touch min-w-touch rounded-[var(--radius-sm)] p-1.5 text-[var(--muted)] hover:bg-[var(--surface-muted)] hover:text-[var(--foreground)] sm:min-h-0 sm:min-w-0"
                  aria-label={
                    CHAT_MEDIA_UPLOADS_ENABLED ? 'Add attachment' : 'Add link'
                  }
                >
                  <Plus className="h-4 w-4" />
                </button>
              }
            >
              {CHAT_MEDIA_UPLOADS_ENABLED ? (
                <DropdownMenuItem onClick={() => fileInputRef.current?.click()}>
                  <Paperclip className="h-4 w-4" />
                  Upload image / file
                </DropdownMenuItem>
              ) : null}
              <DropdownMenuItem onClick={() => setLinkOpen(true)}>
                <Link2 className="h-4 w-4" />
                Add link
              </DropdownMenuItem>
            </DropdownMenu>
            <button
              type="button"
              className={cn(
                'min-h-touch min-w-touch rounded-[var(--radius-sm)] p-1.5 hover:bg-[var(--surface-muted)] sm:min-h-0 sm:min-w-0',
                formatOpen
                  ? 'text-[var(--primary)]'
                  : 'text-[var(--muted)] hover:text-[var(--foreground)]',
              )}
              aria-label="Toggle formatting"
              onClick={() => setFormatOpen((open) => !open)}
            >
              <Type className="h-4 w-4" />
            </button>
            <button
              ref={emojiButtonRef}
              type="button"
              className="min-h-touch min-w-touch rounded-[var(--radius-sm)] p-1.5 text-[var(--muted)] hover:bg-[var(--surface-muted)] hover:text-[var(--foreground)] sm:min-h-0 sm:min-w-0"
              aria-label="Add emoji"
              aria-expanded={emojiOpen}
              onClick={() => setEmojiOpen((open) => !open)}
            >
              <Smile className="h-4 w-4" />
            </button>
            {emojiOpen
              ? createPortal(
                  <div
                    ref={emojiPanelRef}
                    className="fixed z-[90]"
                    style={{
                      left: emojiPos.left,
                      top: emojiPos.top,
                      visibility: emojiReady ? 'visible' : 'hidden',
                    }}
                  >
                    <EmojiPicker
                      onSelect={(emoji) => {
                        insertAtCursor(emoji);
                        setEmojiOpen(false);
                      }}
                    />
                  </div>,
                  document.body,
                )
              : null}
            <button
              type="button"
              className="min-h-touch min-w-touch rounded-[var(--radius-sm)] p-1.5 text-[var(--muted)] hover:bg-[var(--surface-muted)] hover:text-[var(--foreground)] sm:min-h-0 sm:min-w-0"
              aria-label="Mention someone"
              onClick={triggerMentionPicker}
            >
              <AtSign className="h-4 w-4" />
            </button>
            {CHAT_MEDIA_UPLOADS_ENABLED && !isThread ? (
              <>
                <button
                  type="button"
                  className="min-h-touch min-w-touch rounded-[var(--radius-sm)] p-1.5 text-[var(--muted)] hover:bg-[var(--surface-muted)] hover:text-[var(--foreground)] sm:min-h-0 sm:min-w-0"
                  aria-label="Record video clip"
                  disabled={isRecording || !channelId}
                  onClick={() => void startRecording('video')}
                >
                  <Video className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  className="min-h-touch min-w-touch rounded-[var(--radius-sm)] p-1.5 text-[var(--muted)] hover:bg-[var(--surface-muted)] hover:text-[var(--foreground)] sm:min-h-0 sm:min-w-0"
                  aria-label="Record audio clip"
                  disabled={isRecording || !channelId}
                  onClick={() => void startRecording('audio')}
                >
                  <Mic className="h-4 w-4" />
                </button>
              </>
            ) : null}
          </div>
          <div className="flex flex-col items-end gap-1 sm:flex-row sm:items-center sm:gap-2">
            <span className="hidden text-[11px] text-[var(--muted)] [@media(hover:hover)_and_(pointer:fine)]:inline">
              Enter for new line · Ctrl/⌘+Enter to send
            </span>
            <span className="text-[11px] text-[var(--muted)] [@media(hover:hover)_and_(pointer:fine)]:hidden">
              Enter for new line · Tap Send to post
            </span>
            <Button
              type="submit"
              size="sm"
              className="min-h-touch sm:min-h-0"
              title="Send message (Ctrl/⌘+Enter)"
              aria-label="Send message"
              disabled={
                isSubmitting ||
                isUploading ||
                isRecording ||
                !channelId ||
                (isEmpty && attachments.length === 0)
              }
            >
              <Send className="h-4 w-4" />
              Send
            </Button>
          </div>
        </div>

        <MentionPicker
          open={mentionOpen}
          members={mentionCandidates}
          activeIndex={mentionActiveIndex}
          currentUserId={currentUserId}
          anchorRef={composerShellRef}
          onSelect={selectMention}
          onActiveIndexChange={setMentionActiveIndex}
        />
      </div>

      {CHAT_MEDIA_UPLOADS_ENABLED ? (
        <input
          ref={fileInputRef}
          type="file"
          accept={`${IMAGE_ANNOTATION_ACCEPT},application/pdf,image/*,video/*,audio/*`}
          multiple
          className="hidden"
          onChange={(event) => void handleFileSelected(event.target.files)}
        />
      ) : null}

      {isRecording ? (
        <p className="text-xs text-[var(--primary)]">Recording clip...</p>
      ) : null}

      {errorMessage ? (
        <p className="text-sm text-[var(--danger)]">{errorMessage}</p>
      ) : null}

      {annotatingFile && channelId ? (
        <ImageAnnotationDialog
          open
          channelId={channelId}
          file={annotatingFile}
          mode="compose"
          currentUserId={currentUserId}
          canAnnotate
          onClose={() => setAnnotatingFile(null)}
          onAnnotationsChange={(count) => {
            setAttachments((current) =>
              current.map((item) =>
                item.fileId === annotatingFile.id
                  ? { ...item, annotationCount: count }
                  : item,
              ),
            );
            setAnnotatingFile((current) =>
              current ? { ...current, annotationCount: count } : current,
            );
          }}
        />
      ) : null}
    </form>
  );
}
