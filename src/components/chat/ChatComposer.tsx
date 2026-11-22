'use client';

import {
  ClipboardEvent,
  FormEvent,
  KeyboardEvent,
  useEffect,
  useId,
  useLayoutEffect,
  useRef,
  useState,
} from 'react';
import { createPortal } from 'react-dom';
import {
  AtSign,
  Bold,
  Code,
  Italic,
  Link2,
  List,
  ListOrdered,
  MessageSquareText,
  Plus,
  Quote,
  RotateCcw,
  Send,
  Smile,
  Strikethrough,
  Type,
  Underline,
  X,
} from 'lucide-react';
import {
  AttachmentActionSheet,
  type AttachmentSheetAction,
} from '@/components/chat/AttachmentActionSheet';
import { ComposerImageLightbox } from '@/components/chat/ComposerImageLightbox';
import { EmojiPicker } from '@/components/chat/EmojiPicker';
import { ImageAnnotationDialog } from '@/components/chat/ImageAnnotationDialog';
import { MentionPicker } from '@/components/chat/MentionPicker';
import { Button } from '@/components/ui/Button';
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
import { clipboardHtmlToMarkdown } from '@/lib/clipboardHtmlToMarkdown';
import {
  getChatFormatShortcutMeta,
  matchChatFormatShortcut,
  type ChatFormatAction,
} from '@/lib/chatFormatShortcuts';
import {
  CHAT_FILE_INPUT_CLASS,
  CHAT_MEDIA_FILE_ACCEPT,
  collectClipboardImageFiles,
  ensureImageFileType,
  isHeicLikeImage,
  prepareChatImageFile,
  screenshotFileName,
  validateChatImageFile,
} from '@/lib/chat-image-upload';
import { API_BASE_URL, AUTH_TOKEN_KEY } from '@/lib/config';
import { beginPwaUpload } from '@/lib/pwa-work-guard';
import { usePwaWorkHold } from '@/lib/use-pwa-work-hold';
import { prefersGalleryImagePicker } from '@/lib/device';
import {
  AnnotatableFile,
  IMAGE_ANNOTATION_ACCEPT,
  isAnnotatableImageMime,
} from '@/lib/image-annotations';

type PendingUploadStatus = 'uploading' | 'ready' | 'error';

interface PendingAttachment {
  localId: string;
  kind: 'file' | 'link';
  /** Normal chat attach vs dedicated image-feedback flow. */
  purpose?: 'attachment' | 'annotation';
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
  status: PendingUploadStatus;
  progress?: number;
  error?: string | null;
  /** Kept for retry after a failed image upload. */
  retryFile?: File | null;
}

const THUMBNAIL_SIZE_PX = 88;

const FORMAT_TOOLBAR_ITEMS: Array<{
  icon: typeof Bold;
  action: ChatFormatAction;
}> = [
  { icon: Bold, action: 'bold' },
  { icon: Italic, action: 'italic' },
  { icon: Underline, action: 'underline' },
  { icon: Strikethrough, action: 'strike' },
  { icon: Link2, action: 'link' },
  { icon: ListOrdered, action: 'orderedList' },
  { icon: List, action: 'unorderedList' },
  { icon: Quote, action: 'blockquote' },
  { icon: Code, action: 'codeBlock' },
];

function createLocalId() {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID();
  }
  return `pending-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

function isImageAttachment(attachment: PendingAttachment) {
  return (
    attachment.kind === 'file' &&
    Boolean(attachment.mimeType?.startsWith('image/') || attachment.previewUrl)
  );
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
  const formatShortcutMeta = getChatFormatShortcutMeta();
  const [isEmpty, setIsEmpty] = useState(true);
  const [attachments, setAttachments] = useState<PendingAttachment[]>([]);
  const [emojiOpen, setEmojiOpen] = useState(false);
  const [linkOpen, setLinkOpen] = useState(false);
  const [attachmentMenuOpen, setAttachmentMenuOpen] = useState(false);
  const [formatOpen, setFormatOpen] = useState(false);
  const [linkUrl, setLinkUrl] = useState('');
  const [linkTitle, setLinkTitle] = useState('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<number | null>(null);
  const [alsoSendToChannel, setAlsoSendToChannel] = useState(false);
  const [notifyClientTeam, setNotifyClientTeam] = useState(false);
  const [mentionOpen, setMentionOpen] = useState(false);
  const [mentionQuery, setMentionQuery] = useState('');
  const [mentionActiveIndex, setMentionActiveIndex] = useState(0);
  const [mentionRange, setMentionRange] = useState<Range | null>(null);
  const [annotatingFile, setAnnotatingFile] = useState<AnnotatableFile | null>(
    null,
  );
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const annotateInputRef = useRef<HTMLInputElement>(null);
  const editorRef = useRef<HTMLDivElement>(null);
  const composerShellRef = useRef<HTMLDivElement>(null);
  const emojiButtonRef = useRef<HTMLButtonElement>(null);
  const emojiPanelRef = useRef<HTMLDivElement>(null);
  const pasteGuardRef = useRef(false);
  const [emojiPos, setEmojiPos] = useState({ left: 0, top: 0 });
  const [emojiReady, setEmojiReady] = useState(false);
  const composerHoldId = useId();
  usePwaWorkHold(
    !isEmpty || attachments.length > 0 || isUploading,
    composerHoldId,
    'message',
  );

  const imageAttachments = attachments.filter(isImageAttachment);
  const otherAttachments = attachments.filter(
    (attachment) => !isImageAttachment(attachment),
  );
  const lightboxImages = imageAttachments
    .filter((attachment) => Boolean(attachment.previewUrl))
    .map((attachment) => ({
      id: attachment.localId,
      url: attachment.previewUrl as string,
      label: attachment.label,
    }));
  const hasUploadingAttachments = attachments.some(
    (attachment) => attachment.status === 'uploading',
  );
  const hasFailedAttachments = attachments.some(
    (attachment) => attachment.status === 'error',
  );
  const readyAttachments = attachments.filter(
    (attachment) =>
      attachment.status === 'ready' &&
      (attachment.kind === 'link' || Boolean(attachment.fileId)),
  );

  const isThread = variant === 'thread';

  function openNativeFilePicker(input: HTMLInputElement | null) {
    if (!input) return;
    // Let the attachment sheet finish closing first. history.back() / unmount
    // racing with input.click() cancels the Android/iOS photo picker.
    window.setTimeout(() => {
      input.value = '';
      input.click();
    }, 120);
  }

  function handleAttachmentAction(action: AttachmentSheetAction) {
    switch (action) {
      case 'photos':
        openNativeFilePicker(fileInputRef.current);
        break;
      case 'link':
        setLinkOpen(true);
        break;
      case 'annotate':
        openNativeFilePicker(annotateInputRef.current);
        break;
      default: {
        const _exhaustive: never = action;
        return _exhaustive;
      }
    }
  }

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

  function applyFormatAction(action: ChatFormatAction) {
    switch (action) {
      case 'bold':
        applyFormat('bold');
        return;
      case 'italic':
        applyFormat('italic');
        return;
      case 'underline':
        applyFormat('underline');
        return;
      case 'strike':
        applyFormat('strikeThrough');
        return;
      case 'link':
        applyLink();
        return;
      case 'orderedList':
        applyFormat('insertOrderedList');
        return;
      case 'unorderedList':
        applyFormat('insertUnorderedList');
        return;
      case 'blockquote':
        applyFormat('formatBlock', 'blockquote');
        return;
      case 'codeBlock':
        applyCodeBlock();
        return;
      default: {
        const _exhaustive: never = action;
        return _exhaustive;
      }
    }
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
    if (!channelId || isSubmitting || hasUploadingAttachments) {
      return;
    }

    const messageBody = getMessageBody();
    if (!messageBody.trim() && readyAttachments.length === 0) return;

    if (hasFailedAttachments) {
      setErrorMessage('Remove or retry failed uploads before sending');
      return;
    }

    setErrorMessage(null);

    try {
      await onSubmit({
        body: messageBody.trim(),
        attachments: readyAttachments.map(({ kind, fileId, url, title }) => ({
          kind,
          fileId,
          url,
          title,
        })),
        ...(isThread ? { alsoSendToChannel, notifyClientTeam } : {}),
      });
      attachments.forEach((attachment) => {
        if (attachment.previewUrl) {
          URL.revokeObjectURL(attachment.previewUrl);
        }
      });
      clearEditor();
      setAttachments([]);
      setLinkOpen(false);
      setLinkUrl('');
      setLinkTitle('');
    } catch (error) {
      // Keep composer content + previews so the user can retry send.
      setErrorMessage(
        error instanceof Error ? error.message : 'Unable to send message',
      );
    }
  }

  function patchAttachment(
    localId: string,
    patch: Partial<PendingAttachment>,
  ) {
    setAttachments((current) =>
      current.map((item) =>
        item.localId === localId ? { ...item, ...patch } : item,
      ),
    );
  }

  function removeAttachment(localId: string) {
    setAttachments((current) => {
      const target = current.find((item) => item.localId === localId);
      if (target?.previewUrl) {
        URL.revokeObjectURL(target.previewUrl);
      }
      return current.filter((item) => item.localId !== localId);
    });
    setLightboxIndex((current) => {
      if (current == null) return current;
      const remaining = imageAttachments.filter(
        (item) => item.localId !== localId && item.previewUrl,
      );
      if (remaining.length === 0) return null;
      return Math.min(current, remaining.length - 1);
    });
  }

  async function uploadFileToChannel(
    file: File,
    localId: string,
    options?: {
      purpose?: 'attachment' | 'annotation';
      openAnnotation?: boolean;
    },
  ) {
    if (!channelId) {
      throw new Error('No channel selected');
    }

    const token = window.localStorage.getItem(AUTH_TOKEN_KEY);
    const formData = new FormData();
    formData.append('file', file);
    const endUpload = beginPwaUpload();

    let payload: {
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
    try {
      payload = await new Promise<{
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
        const progress = Math.round((event.loaded / event.total) * 100);
        patchAttachment(localId, { progress, status: 'uploading' });
        setUploadProgress(progress);
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
    } finally {
      endUpload();
    }

    patchAttachment(localId, {
      status: 'ready',
      progress: 100,
      error: null,
      retryFile: null,
      fileId: payload.id,
      label: payload.fileName,
      mimeType: payload.mimeType,
      annotationCount: payload._count?.imageAnnotations ?? 0,
      hasWebp: Boolean(payload.webpStorageKey),
      originalWidth: payload.originalWidth,
      originalHeight: payload.originalHeight,
      purpose: options?.purpose ?? 'attachment',
    });

    if (
      options?.openAnnotation &&
      isAnnotatableImageMime(payload.mimeType)
    ) {
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

  async function handleFiles(fileList: ArrayLike<File> | null, options?: {
    fromClipboard?: boolean;
    purpose?: 'attachment' | 'annotation';
    openAnnotation?: boolean;
  }) {
    if (!CHAT_MEDIA_UPLOADS_ENABLED || !channelId || !fileList?.length) return;

    setIsUploading(true);
    setUploadProgress(0);
    setErrorMessage(null);

    const purpose = options?.purpose ?? 'attachment';
    const prepared: Array<{ localId: string; file: File; previewUrl: string | null }> =
      [];

    try {
      const files = Array.from(fileList);
      const prepareErrors: string[] = [];

      for (let index = 0; index < files.length; index += 1) {
        try {
          let file = files[index];
          const treatAsImage =
            file.type.startsWith('image/') ||
            Boolean(options?.fromClipboard) ||
            purpose === 'annotation';

          if (treatAsImage || isHeicLikeImage(file)) {
            if (isHeicLikeImage(file)) {
              throw new Error(
                'HEIC photos are not supported yet. Choose a JPEG or PNG, or export the photo as Most Compatible.',
              );
            }
            file = await ensureImageFileType(file);
            if (
              options?.fromClipboard &&
              (!file.name ||
                file.name === 'image.png' ||
                file.name === 'image.jpg' ||
                !/\.[^.]+$/.test(file.name))
            ) {
              file = new File([file], screenshotFileName(index), {
                type: file.type || 'image/png',
                lastModified: file.lastModified || Date.now(),
              });
            }
            file = await prepareChatImageFile(file);
            const validationError = validateChatImageFile(file);
            if (validationError) {
              throw new Error(validationError);
            }
          }

          const localId = createLocalId();
          const previewUrl = file.type.startsWith('image/')
            ? URL.createObjectURL(file)
            : null;

          prepared.push({ localId, file, previewUrl });
          setAttachments((current) => [
            ...current,
            {
              localId,
              kind: 'file',
              purpose,
              label: file.name,
              mimeType: file.type,
              previewUrl,
              status: 'uploading',
              progress: 0,
              retryFile: file,
            },
          ]);
        } catch (error) {
          prepareErrors.push(
            error instanceof Error ? error.message : 'Unable to prepare file',
          );
        }
      }

      if (prepareErrors.length > 0) {
        setErrorMessage(prepareErrors[0]);
      }

      for (const item of prepared) {
        try {
          await uploadFileToChannel(item.file, item.localId, {
            purpose,
            openAnnotation: options?.openAnnotation,
          });
        } catch (error) {
          patchAttachment(item.localId, {
            status: 'error',
            progress: 0,
            error:
              error instanceof Error ? error.message : 'Unable to upload file',
            retryFile: item.file,
          });
        }
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
      if (annotateInputRef.current) {
        annotateInputRef.current.value = '';
      }
    }
  }

  async function retryAttachment(attachment: PendingAttachment) {
    if (!attachment.retryFile || !channelId) return;
    patchAttachment(attachment.localId, {
      status: 'uploading',
      progress: 0,
      error: null,
    });
    setIsUploading(true);
    setErrorMessage(null);
    try {
      await uploadFileToChannel(attachment.retryFile, attachment.localId, {
        purpose: attachment.purpose ?? 'attachment',
      });
    } catch (error) {
      patchAttachment(attachment.localId, {
        status: 'error',
        progress: 0,
        error: error instanceof Error ? error.message : 'Unable to upload file',
      });
    } finally {
      setIsUploading(false);
      setUploadProgress(null);
    }
  }

  async function handleFileSelected(fileList: FileList | null) {
    await handleFiles(fileList, { purpose: 'attachment' });
  }

  async function handleAnnotateFileSelected(fileList: FileList | null) {
    if (!fileList?.length) return;
    await handleFiles([fileList[0]], {
      purpose: 'annotation',
      openAnnotation: true,
    });
  }

  function openAnnotateOnPending(attachment: PendingAttachment) {
    if (!attachment.fileId || !isAnnotatableImageMime(attachment.mimeType)) {
      return;
    }
    setAnnotatingFile({
      id: attachment.fileId,
      fileName: attachment.label,
      mimeType: attachment.mimeType ?? 'image/jpeg',
      hasWebp: attachment.hasWebp,
      originalWidth: attachment.originalWidth,
      originalHeight: attachment.originalHeight,
      annotationCount: attachment.annotationCount,
    });
  }

  function insertSafePasteHtml(safeHtml: string) {
    focusEditor();
    document.execCommand('insertHTML', false, safeHtml);
    syncEditorState();
  }

  function handleRichHtmlPaste(html: string) {
    const { safeHtml, markdown } = clipboardHtmlToMarkdown(html);
    if (safeHtml.trim()) {
      insertSafePasteHtml(safeHtml);
      return true;
    }
    if (markdown.trim()) {
      insertAtCursor(markdown);
      return true;
    }
    return false;
  }

  function ingestClipboardImages(
    dataTransfer: DataTransfer | null,
    options?: { html?: string; plainText?: string },
  ) {
    if (!CHAT_MEDIA_UPLOADS_ENABLED || !channelId || !dataTransfer) {
      return false;
    }

    const imageFiles = collectClipboardImageFiles(dataTransfer);
    if (imageFiles.length === 0) {
      return false;
    }

    if (pasteGuardRef.current) {
      return true;
    }

    pasteGuardRef.current = true;

    const html = options?.html?.trim() ?? '';
    const plainText = options?.plainText?.trim() ?? '';
    if (html) {
      handleRichHtmlPaste(html);
    } else if (plainText) {
      insertAtCursor(plainText);
    }

    void handleFiles(imageFiles, { fromClipboard: true }).finally(() => {
      window.setTimeout(() => {
        pasteGuardRef.current = false;
      }, 400);
    });
    return true;
  }

  function handleEditorPaste(event: ClipboardEvent<HTMLDivElement>) {
    const clipboard = event.clipboardData;
    if (!clipboard) {
      return;
    }

    const html = clipboard.getData('text/html');
    const plainText = clipboard.getData('text/plain');

    if (ingestClipboardImages(clipboard, { html, plainText })) {
      event.preventDefault();
      return;
    }

    if (html.trim()) {
      event.preventDefault();
      if (!handleRichHtmlPaste(html) && plainText) {
        insertAtCursor(plainText);
      }
      return;
    }

    // Mobile often exposes a file item without readable image bytes.
    // Guide to gallery — do not claim the browser is "unsupported".
    if (CHAT_MEDIA_UPLOADS_ENABLED && prefersGalleryImagePicker()) {
      const hasFileItem = Array.from(clipboard.items ?? []).some(
        (item) => item.kind === 'file',
      );
      if (hasFileItem) {
        event.preventDefault();
        setErrorMessage(
          'This device did not provide the screenshot for paste. Tap + → Photos & files to attach it from your gallery.',
        );
      }
    }
  }

  function handleEditorBeforeInput(event: FormEvent<HTMLDivElement>) {
    if (!CHAT_MEDIA_UPLOADS_ENABLED || !channelId) return;

    const inputEvent = event.nativeEvent as InputEvent;
    if (
      inputEvent.inputType !== 'insertFromPaste' &&
      inputEvent.inputType !== 'insertFromDrop'
    ) {
      return;
    }

    const dataTransfer = inputEvent.dataTransfer;
    if (!dataTransfer) return;

    if (ingestClipboardImages(dataTransfer)) {
      event.preventDefault();
    }
  }

  function addLinkAttachment() {
    if (!linkUrl.trim()) return;

    setAttachments((current) => [
      ...current,
      {
        localId: createLocalId(),
        kind: 'link',
        url: linkUrl.trim(),
        title: linkTitle.trim() || linkUrl.trim(),
        label: linkTitle.trim() || linkUrl.trim(),
        status: 'ready',
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

  function handleEditorKeyDown(event: KeyboardEvent<HTMLDivElement>) {
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

    const formatAction = matchChatFormatShortcut(event);
    if (formatAction) {
      event.preventDefault();
      applyFormatAction(formatAction);
      return;
    }

    // Enter always inserts a new line. Only the Send button submits.
  }

  return (
    <form
      data-chat-composer=""
      onSubmit={(event) => void handleSubmit(event)}
      className="flex max-h-[min(52vh,480px)] flex-col gap-2"
    >
      {imageAttachments.length > 0 ? (
        <div className="shrink-0 space-y-1.5">
          <div className="flex items-center justify-between gap-2">
            <p className="text-xs text-[var(--muted)]">
              {imageAttachments.length}{' '}
              {imageAttachments.length === 1 ? 'image' : 'images'}
              {hasUploadingAttachments ? ' · uploading…' : ''}
              <span className="hidden sm:inline"> · tap to preview</span>
            </p>
          </div>
          <div className="max-h-[100px] overflow-x-auto overflow-y-hidden pb-0.5">
            <div className="flex w-max gap-2">
              {imageAttachments.map((attachment, index) => (
                <div
                  key={attachment.localId}
                  className="group relative shrink-0 overflow-hidden rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--surface-muted)]"
                  style={{
                    width: THUMBNAIL_SIZE_PX,
                    height: THUMBNAIL_SIZE_PX,
                  }}
                >
                  <button
                    type="button"
                    className="absolute inset-0"
                    title="View full image"
                    aria-label={`Preview ${attachment.label}`}
                    onClick={() => {
                      if (!attachment.previewUrl) return;
                      const lightboxPos = lightboxImages.findIndex(
                        (item) => item.id === attachment.localId,
                      );
                      setLightboxIndex(
                        lightboxPos >= 0 ? lightboxPos : index,
                      );
                    }}
                  >
                    {attachment.previewUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={attachment.previewUrl}
                        alt=""
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <span className="flex h-full items-center justify-center text-[10px] text-[var(--muted)]">
                        Image
                      </span>
                    )}
                  </button>

                  {attachment.status === 'uploading' ? (
                    <div className="pointer-events-none absolute inset-0 flex items-end bg-black/35 p-1.5">
                      <div className="h-1 w-full overflow-hidden rounded-full bg-white/30">
                        <div
                          className="h-full rounded-full bg-white"
                          style={{ width: `${attachment.progress ?? 8}%` }}
                        />
                      </div>
                    </div>
                  ) : null}

                  {attachment.status === 'error' ? (
                    <button
                      type="button"
                      className="absolute inset-0 flex flex-col items-center justify-center gap-1 bg-black/65 px-1 text-center"
                      onClick={() => void retryAttachment(attachment)}
                    >
                      <RotateCcw className="h-3.5 w-3.5 text-white" />
                      <span className="text-[10px] font-medium text-white">
                        Retry
                      </span>
                    </button>
                  ) : null}

                  <button
                    type="button"
                    className="absolute right-1 top-1 z-[1] inline-flex h-5 w-5 items-center justify-center rounded-full bg-black/75 text-white"
                    title="Remove image"
                    aria-label={`Remove ${attachment.label}`}
                    onClick={(event) => {
                      event.stopPropagation();
                      removeAttachment(attachment.localId);
                    }}
                  >
                    <X className="h-3 w-3" />
                  </button>

                  {attachment.purpose === 'annotation' &&
                  attachment.status === 'ready' &&
                  attachment.fileId ? (
                    <button
                      type="button"
                      className="absolute bottom-1 left-1 z-[1] inline-flex h-5 w-5 items-center justify-center rounded-full bg-black/75 text-white"
                      title="Open image annotation"
                      onClick={(event) => {
                        event.stopPropagation();
                        openAnnotateOnPending(attachment);
                      }}
                    >
                      <MessageSquareText className="h-3 w-3" />
                    </button>
                  ) : null}
                </div>
              ))}
            </div>
          </div>
        </div>
      ) : null}

      {otherAttachments.length > 0 ? (
        <div className="flex max-h-20 shrink-0 flex-wrap gap-2 overflow-y-auto">
          {otherAttachments.map((attachment) => (
            <span
              key={attachment.localId}
              className="inline-flex max-w-full items-center gap-2 rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--surface-muted)] px-2 py-1.5 text-xs"
            >
              <span className="min-w-0">
                <span className="block truncate font-medium text-[var(--foreground)]">
                  {attachment.label}
                </span>
                {attachment.status === 'uploading' ? (
                  <span className="text-[11px] text-[var(--muted)]">
                    Uploading {attachment.progress ?? 0}%
                  </span>
                ) : null}
                {attachment.status === 'error' ? (
                  <span className="text-[11px] text-[var(--danger)]">
                    {attachment.error ?? 'Upload failed'}
                  </span>
                ) : null}
              </span>
              {attachment.status === 'error' ? (
                <button
                  type="button"
                  className="rounded p-1 text-[var(--muted)] hover:bg-[var(--surface)] hover:text-[var(--foreground)]"
                  title="Retry upload"
                  onClick={() => void retryAttachment(attachment)}
                >
                  <RotateCcw className="h-3.5 w-3.5" />
                </button>
              ) : null}
              <button
                type="button"
                className="rounded p-1 text-[var(--muted)] hover:text-[var(--foreground)]"
                aria-label="Remove attachment"
                onClick={() => removeAttachment(attachment.localId)}
              >
                <X className="h-3.5 w-3.5" />
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

      <div
        ref={composerShellRef}
        className="relative min-h-0 shrink-0 overflow-visible rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--surface)]"
      >
        {formatOpen ? (
          <div className="flex flex-wrap items-center gap-0.5 border-b border-[var(--border)] px-2 py-1.5">
            {FORMAT_TOOLBAR_ITEMS.map(({ icon: Icon, action }) => {
              const meta = formatShortcutMeta.find(
                (item) => item.action === action,
              );
              const label = meta?.label ?? action;
              const shortcutLabel = meta?.shortcutLabel;
              return (
                <button
                  key={action}
                  type="button"
                  aria-label={label}
                  aria-keyshortcuts={meta?.ariaKeyshortcuts}
                  title={
                    shortcutLabel ? `${label} (${shortcutLabel})` : label
                  }
                  className="min-h-touch min-w-touch rounded-[var(--radius-sm)] p-1.5 text-[var(--muted)] hover:bg-[var(--surface-muted)] hover:text-[var(--foreground)] sm:min-h-0 sm:min-w-0"
                  onMouseDown={(event) => event.preventDefault()}
                  onClick={() => applyFormatAction(action)}
                >
                  <Icon className="h-4 w-4" />
                </button>
              );
            })}
          </div>
        ) : null}

        <div className="flex items-end gap-2 px-2 py-2 sm:block sm:px-0 sm:py-0">
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
            onPaste={handleEditorPaste}
            onBeforeInput={handleEditorBeforeInput}
            className={cn(
              'max-h-[140px] min-h-[44px] min-w-0 flex-1 overflow-y-auto bg-transparent px-2.5 py-2 text-sm outline-none sm:max-h-[180px] sm:min-h-[52px] sm:w-full sm:px-3',
              'whitespace-pre-wrap break-words',
              'empty:before:pointer-events-none empty:before:text-[var(--muted)] empty:before:content-[attr(data-placeholder)]',
              '[&_a]:text-[var(--primary)] [&_a]:underline',
              '[&_[data-mention-id]]:rounded [&_[data-mention-id]]:bg-[var(--primary-soft)] [&_[data-mention-id]]:px-1 [&_[data-mention-id]]:font-medium [&_[data-mention-id]]:text-[var(--primary)]',
              '[&_blockquote]:border-l-2 [&_blockquote]:border-[var(--border)] [&_blockquote]:pl-3 [&_blockquote]:text-[var(--muted-foreground)]',
              '[&_code]:rounded [&_code]:bg-[var(--surface-muted)] [&_code]:px-1 [&_code]:font-mono [&_code]:text-[0.85em]',
              '[&_pre]:overflow-x-auto [&_pre]:rounded-[var(--radius-md)] [&_pre]:bg-[var(--surface-muted)] [&_pre]:p-2 [&_pre]:font-mono [&_pre]:text-xs',
              '[&_ol]:list-decimal [&_ol]:pl-5 [&_ul]:list-disc [&_ul]:pl-5',
              '[&_u]:underline [&_s]:line-through',
              '[&_h1]:text-base [&_h1]:font-semibold [&_h2]:text-sm [&_h2]:font-semibold [&_h3]:text-sm [&_h3]:font-medium',
              '[&_table]:w-full [&_table]:border-collapse [&_td]:border [&_td]:border-[var(--border)] [&_td]:px-1 [&_th]:border [&_th]:border-[var(--border)] [&_th]:px-1',
            )}
            onKeyDown={handleEditorKeyDown}
          />
          <Button
            type="submit"
            size="sm"
            className="mb-0.5 h-10 w-10 shrink-0 rounded-full p-0 sm:hidden"
            title={
              hasUploadingAttachments
                ? 'Wait for upload to finish'
                : hasFailedAttachments
                  ? 'Retry or remove failed uploads first'
                  : 'Send message'
            }
            aria-label="Send message"
            disabled={
              isSubmitting ||
              hasUploadingAttachments ||
              hasFailedAttachments ||
              !channelId ||
              (isEmpty && readyAttachments.length === 0)
            }
          >
            <Send className="h-4 w-4" />
          </Button>
        </div>

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

        <div className="flex items-center justify-between gap-2 border-t border-[var(--border)] px-2 py-1.5 pb-[max(0.375rem,env(safe-area-inset-bottom))]">
          <div className="flex min-w-0 flex-1 items-center gap-0.5 overflow-x-auto">
            <AttachmentActionSheet
              open={attachmentMenuOpen}
              onOpenChange={setAttachmentMenuOpen}
              mediaEnabled={CHAT_MEDIA_UPLOADS_ENABLED}
              canAnnotate={CHAT_MEDIA_UPLOADS_ENABLED}
              annotateDisabled={!channelId || isUploading}
              onAction={handleAttachmentAction}
              trigger={
                <button
                  type="button"
                  className="min-h-touch min-w-touch rounded-[var(--radius-sm)] p-1.5 text-[var(--muted)] hover:bg-[var(--surface-muted)] hover:text-[var(--foreground)] sm:min-h-0 sm:min-w-0"
                  aria-label={
                    CHAT_MEDIA_UPLOADS_ENABLED ? 'Add attachment' : 'Add link'
                  }
                  aria-expanded={attachmentMenuOpen}
                >
                  <Plus className="h-4 w-4" />
                </button>
              }
            />
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
          </div>
          <div className="hidden shrink-0 sm:flex sm:items-center sm:gap-2">
            <Button
              type="submit"
              size="sm"
              title={
                hasUploadingAttachments
                  ? 'Wait for upload to finish'
                  : hasFailedAttachments
                    ? 'Retry or remove failed uploads first'
                    : 'Send message'
              }
              aria-label="Send message"
              disabled={
                isSubmitting ||
                hasUploadingAttachments ||
                hasFailedAttachments ||
                !channelId ||
                (isEmpty && readyAttachments.length === 0)
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
        <div className="relative h-0 w-0 overflow-visible" aria-hidden>
          <input
            ref={fileInputRef}
            type="file"
            accept={CHAT_MEDIA_FILE_ACCEPT}
            multiple
            className={CHAT_FILE_INPUT_CLASS}
            tabIndex={-1}
            onChange={(event) => void handleFileSelected(event.target.files)}
          />
          <input
            ref={annotateInputRef}
            type="file"
            accept={IMAGE_ANNOTATION_ACCEPT}
            className={CHAT_FILE_INPUT_CLASS}
            tabIndex={-1}
            onChange={(event) =>
              void handleAnnotateFileSelected(event.target.files)
            }
          />
        </div>
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
                  ? {
                      ...item,
                      purpose: 'annotation',
                      annotationCount: count,
                    }
                  : item,
              ),
            );
            setAnnotatingFile((current) =>
              current ? { ...current, annotationCount: count } : current,
            );
          }}
        />
      ) : null}

      {lightboxIndex != null && lightboxImages[lightboxIndex] ? (
        <ComposerImageLightbox
          images={lightboxImages}
          index={lightboxIndex}
          onIndexChange={setLightboxIndex}
          onClose={() => setLightboxIndex(null)}
        />
      ) : null}
    </form>
  );
}
