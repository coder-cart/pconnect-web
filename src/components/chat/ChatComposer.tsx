'use client';

import { FormEvent, useRef, useState } from 'react';
import {
  AtSign,
  Bold,
  Code,
  Italic,
  Link2,
  List,
  ListOrdered,
  Mic,
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
import { cn } from '@/lib/cn';
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

interface PendingAttachment {
  kind: 'file' | 'link';
  fileId?: string;
  url?: string;
  title?: string;
  label: string;
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
  const [isRecording, setIsRecording] = useState(false);
  const [alsoSendToChannel, setAlsoSendToChannel] = useState(false);
  const [notifyClientTeam, setNotifyClientTeam] = useState(false);
  const [mentionOpen, setMentionOpen] = useState(false);
  const [mentionQuery, setMentionQuery] = useState('');
  const [mentionActiveIndex, setMentionActiveIndex] = useState(0);
  const [mentionRange, setMentionRange] = useState<Range | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const editorRef = useRef<HTMLDivElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const mediaChunksRef = useRef<Blob[]>([]);

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

  async function uploadBlob(blob: Blob, fileName: string, mimeType: string) {
    if (!channelId) return;

    const token = window.localStorage.getItem(AUTH_TOKEN_KEY);
    const formData = new FormData();
    formData.append('file', new File([blob], fileName, { type: mimeType }));

    const response = await fetch(
      `${API_BASE_URL}/channels/${channelId}/attachments/upload`,
      {
        method: 'POST',
        headers: token ? { Authorization: `Bearer ${token}` } : undefined,
        body: formData,
      },
    );

    const payload = (await response.json()) as {
      success?: boolean;
      data?: { id: string; fileName: string };
      message?: string;
    };

    if (!response.ok || !payload.success || !payload.data) {
      throw new Error(payload.message ?? 'Upload failed');
    }

    setAttachments((current) => [
      ...current,
      {
        kind: 'file',
        fileId: payload.data!.id,
        label: payload.data!.fileName,
      },
    ]);
  }

  async function handleFileSelected(fileList: FileList | null) {
    if (!channelId || !fileList?.[0]) return;

    const file = fileList[0];
    setIsUploading(true);
    setErrorMessage(null);

    try {
      await uploadBlob(file, file.name, file.type);
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : 'Unable to upload file',
      );
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  }

  async function startRecording(kind: 'audio' | 'video') {
    if (!channelId || isRecording) return;

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

    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      event.currentTarget.closest('form')?.requestSubmit();
    }
  }

  return (
    <form onSubmit={(event) => void handleSubmit(event)} className="space-y-3">
      {attachments.length > 0 ? (
        <div className="flex flex-wrap gap-2">
          {attachments.map((attachment, index) => (
            <span
              key={`${attachment.label}-${index}`}
              className="inline-flex items-center gap-2 rounded-full border border-[var(--border)] bg-[var(--surface-muted)] px-3 py-1 text-xs"
            >
              {attachment.label}
              <button
                type="button"
                className="text-[var(--muted)] hover:text-[var(--foreground)]"
                onClick={() =>
                  setAttachments((current) =>
                    current.filter((_, itemIndex) => itemIndex !== index),
                  )
                }
              >
                ×
              </button>
            </span>
          ))}
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

      <div className="relative overflow-visible rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--surface)]">
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
                className="rounded-[var(--radius-sm)] p-1.5 text-[var(--muted)] hover:bg-[var(--surface-muted)] hover:text-[var(--foreground)]"
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
            'min-h-[72px] w-full bg-transparent px-3 py-2 text-sm outline-none',
            'empty:before:text-[var(--muted)] empty:before:content-[attr(data-placeholder)]',
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
                  className="rounded-[var(--radius-sm)] p-1.5 text-[var(--muted)] hover:bg-[var(--surface-muted)] hover:text-[var(--foreground)]"
                  aria-label="Add attachment"
                >
                  <Plus className="h-4 w-4" />
                </button>
              }
            >
              <DropdownMenuItem onClick={() => fileInputRef.current?.click()}>
                <Paperclip className="h-4 w-4" />
                Upload file
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setLinkOpen(true)}>
                <Link2 className="h-4 w-4" />
                Add link
              </DropdownMenuItem>
            </DropdownMenu>
            <button
              type="button"
              className={cn(
                'rounded-[var(--radius-sm)] p-1.5 hover:bg-[var(--surface-muted)]',
                formatOpen
                  ? 'text-[var(--primary)]'
                  : 'text-[var(--muted)] hover:text-[var(--foreground)]',
              )}
              aria-label="Toggle formatting"
              onClick={() => setFormatOpen((open) => !open)}
            >
              <Type className="h-4 w-4" />
            </button>
            <div className="relative">
              <button
                type="button"
                className="rounded-[var(--radius-sm)] p-1.5 text-[var(--muted)] hover:bg-[var(--surface-muted)] hover:text-[var(--foreground)]"
                aria-label="Add emoji"
                onClick={() => setEmojiOpen((open) => !open)}
              >
                <Smile className="h-4 w-4" />
              </button>
              {emojiOpen ? (
                <div className="absolute bottom-full left-0 z-30 mb-1">
                  <EmojiPicker
                    onSelect={(emoji) => {
                      insertAtCursor(emoji);
                      setEmojiOpen(false);
                    }}
                  />
                </div>
              ) : null}
            </div>
            <button
              type="button"
              className="rounded-[var(--radius-sm)] p-1.5 text-[var(--muted)] hover:bg-[var(--surface-muted)] hover:text-[var(--foreground)]"
              aria-label="Mention someone"
              onClick={triggerMentionPicker}
            >
              <AtSign className="h-4 w-4" />
            </button>
            {!isThread ? (
              <>
                <button
                  type="button"
                  className="rounded-[var(--radius-sm)] p-1.5 text-[var(--muted)] hover:bg-[var(--surface-muted)] hover:text-[var(--foreground)]"
                  aria-label="Record video clip"
                  disabled={isRecording || !channelId}
                  onClick={() => void startRecording('video')}
                >
                  <Video className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  className="rounded-[var(--radius-sm)] p-1.5 text-[var(--muted)] hover:bg-[var(--surface-muted)] hover:text-[var(--foreground)]"
                  aria-label="Record audio clip"
                  disabled={isRecording || !channelId}
                  onClick={() => void startRecording('audio')}
                >
                  <Mic className="h-4 w-4" />
                </button>
              </>
            ) : null}
          </div>
          <Button
            type="submit"
            size="sm"
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

        <MentionPicker
          open={mentionOpen}
          members={mentionCandidates}
          activeIndex={mentionActiveIndex}
          currentUserId={currentUserId}
          onSelect={selectMention}
          onActiveIndexChange={setMentionActiveIndex}
        />
      </div>

      <input
        ref={fileInputRef}
        type="file"
        className="hidden"
        onChange={(event) => void handleFileSelected(event.target.files)}
      />

      {isRecording ? (
        <p className="text-xs text-[var(--primary)]">Recording clip...</p>
      ) : null}

      {errorMessage ? (
        <p className="text-sm text-[var(--danger)]">{errorMessage}</p>
      ) : null}
    </form>
  );
}
