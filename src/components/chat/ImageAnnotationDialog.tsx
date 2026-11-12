'use client';

import {
  FormEvent,
  PointerEvent as ReactPointerEvent,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import {
  Maximize2,
  Minus,
  Plus,
  Trash2,
  X,
  MessageSquarePlus,
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { useRealtime } from '@/components/providers/RealtimeProvider';
import { apiRequest } from '@/lib/api-client';
import { ApiResponse } from '@/lib/auth';
import { API_BASE_URL, AUTH_TOKEN_KEY } from '@/lib/config';
import { cn } from '@/lib/cn';
import {
  AnnotatableFile,
  ImageAnnotation,
} from '@/lib/image-annotations';

interface ImageAnnotationDialogProps {
  open: boolean;
  channelId: string;
  file: AnnotatableFile;
  mode: 'compose' | 'review';
  currentUserId: string;
  canAnnotate?: boolean;
  initialMarkerNumber?: number | null;
  onClose: () => void;
  onAnnotationsChange?: (count: number) => void;
}

type DraftPin = {
  xPosition: number;
  yPosition: number;
};

const CATEGORIES = [
  'Color',
  'Cropping',
  'Retouching',
  'Alignment',
  'Background',
  'Other',
];

export function ImageAnnotationDialog({
  open,
  channelId,
  file,
  mode,
  currentUserId,
  canAnnotate = true,
  initialMarkerNumber = null,
  onClose,
  onAnnotationsChange,
}: ImageAnnotationDialogProps) {
  const [imageSrc, setImageSrc] = useState<string | null>(null);
  const [annotations, setAnnotations] = useState<ImageAnnotation[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [draftPin, setDraftPin] = useState<DraftPin | null>(null);
  const [title, setTitle] = useState('');
  const [comment, setComment] = useState('');
  const [category, setCategory] = useState('');
  const [busy, setBusy] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [scale, setScale] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);
  const panStartRef = useRef<{ x: number; y: number; ox: number; oy: number } | null>(
    null,
  );
  const viewportRef = useRef<HTMLDivElement>(null);
  const { subscribeChannelEvents } = useRealtime();

  const selected = useMemo(
    () => annotations.find((item) => item.id === selectedId) ?? null,
    [annotations, selectedId],
  );

  useEffect(() => {
    if (!open) return;
    let objectUrl: string | null = null;
    const token = window.localStorage.getItem(AUTH_TOKEN_KEY);
    const variant = file.hasWebp ? 'webp' : 'original';

    fetch(`${API_BASE_URL}/files/${file.id}/download?variant=${variant}`, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    })
      .then((response) => {
        if (!response.ok) throw new Error('Unable to load image');
        return response.blob();
      })
      .then((blob) => {
        objectUrl = URL.createObjectURL(blob);
        setImageSrc(objectUrl);
      })
      .catch(() => setErrorMessage('Unable to load image'));

    return () => {
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [open, file.id, file.hasWebp]);

  useEffect(() => {
    if (!open) return;
    setErrorMessage(null);
    setDraftPin(null);
    setTitle('');
    setComment('');
    setCategory('');
    setScale(1);
    setOffset({ x: 0, y: 0 });

    apiRequest<ApiResponse<ImageAnnotation[]>>(
      `/channels/${channelId}/files/${file.id}/annotations`,
    )
      .then((response) => {
        setAnnotations(response.data);
        onAnnotationsChange?.(response.data.length);
        let nextSelected: ImageAnnotation | undefined;
        if (initialMarkerNumber != null) {
          nextSelected = response.data.find(
            (item) => item.markerNumber === initialMarkerNumber,
          );
        }
        nextSelected = nextSelected ?? response.data[0];
        if (nextSelected) {
          setSelectedId(nextSelected.id);
          setTitle(nextSelected.title ?? '');
          setComment(nextSelected.comment);
          setCategory(nextSelected.category ?? '');
        } else {
          setSelectedId(null);
        }
      })
      .catch((error: Error) => setErrorMessage(error.message));
    // Intentionally omit onAnnotationsChange to avoid reload loops from parent setters.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, channelId, file.id, initialMarkerNumber]);

  useEffect(() => {
    if (!open) return;
    return subscribeChannelEvents(({ channelId: eventChannelId, event, data }) => {
      if (eventChannelId !== channelId || event !== 'annotation.created') return;
      const payload = data as {
        fileId?: string;
        annotation?: ImageAnnotation;
      };
      const annotation = payload.annotation;
      if (!annotation || (payload.fileId ?? annotation.fileId) !== file.id) {
        return;
      }
      setAnnotations((current) => {
        if (current.some((item) => item.id === annotation.id)) return current;
        const next = [...current, annotation].sort(
          (left, right) => left.markerNumber - right.markerNumber,
        );
        onAnnotationsChange?.(next.length);
        return next;
      });
    });
  }, [open, channelId, file.id, subscribeChannelEvents, onAnnotationsChange]);

  useEffect(() => {
    if (!open) return;
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') onClose();
    }
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [open, onClose]);

  if (!open) return null;

  function resetZoom() {
    setScale(1);
    setOffset({ x: 0, y: 0 });
  }

  function handleImageClick(event: React.MouseEvent<HTMLDivElement>) {
    if (!canAnnotate || isPanning || scale !== 1) return;
    const bounds = event.currentTarget.getBoundingClientRect();
    const xPosition = (event.clientX - bounds.left) / bounds.width;
    const yPosition = (event.clientY - bounds.top) / bounds.height;
    if (xPosition < 0 || xPosition > 1 || yPosition < 0 || yPosition > 1) return;

    setDraftPin({ xPosition, yPosition });
    setSelectedId(null);
    setTitle('');
    setComment('');
    setCategory('');
  }

  function handlePointerDown(event: ReactPointerEvent<HTMLDivElement>) {
    if (event.button !== 0 || scale <= 1) return;
    setIsPanning(true);
    panStartRef.current = {
      x: event.clientX,
      y: event.clientY,
      ox: offset.x,
      oy: offset.y,
    };
    event.currentTarget.setPointerCapture(event.pointerId);
  }

  function handlePointerMove(event: ReactPointerEvent<HTMLDivElement>) {
    if (!isPanning || !panStartRef.current) return;
    setOffset({
      x: panStartRef.current.ox + (event.clientX - panStartRef.current.x),
      y: panStartRef.current.oy + (event.clientY - panStartRef.current.y),
    });
  }

  function handlePointerUp(event: ReactPointerEvent<HTMLDivElement>) {
    if (!isPanning) return;
    setIsPanning(false);
    panStartRef.current = null;
    try {
      event.currentTarget.releasePointerCapture(event.pointerId);
    } catch {
      // ignore
    }
  }

  async function saveDraft(event?: FormEvent) {
    event?.preventDefault();
    if (!draftPin || !comment.trim()) return;
    setBusy(true);
    setErrorMessage(null);
    try {
      const response = await apiRequest<ApiResponse<ImageAnnotation>>(
        `/channels/${channelId}/files/${file.id}/annotations`,
        {
          method: 'POST',
          body: JSON.stringify({
            xPosition: draftPin.xPosition,
            yPosition: draftPin.yPosition,
            title: title.trim() || null,
            comment: comment.trim(),
            category: category || null,
          }),
        },
      );
      const next = [...annotations, response.data].sort(
        (left, right) => left.markerNumber - right.markerNumber,
      );
      setAnnotations(next);
      setSelectedId(response.data.id);
      setDraftPin(null);
      setTitle('');
      setComment('');
      setCategory('');
      onAnnotationsChange?.(next.length);
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : 'Unable to save annotation',
      );
    } finally {
      setBusy(false);
    }
  }

  async function saveSelectedEdits(event?: FormEvent) {
    event?.preventDefault();
    if (!selected || selected.createdBy.id !== currentUserId) return;
    if (!comment.trim()) return;
    setBusy(true);
    setErrorMessage(null);
    try {
      const response = await apiRequest<ApiResponse<ImageAnnotation>>(
        `/channels/${channelId}/files/${file.id}/annotations/${selected.id}`,
        {
          method: 'PATCH',
          body: JSON.stringify({
            title: title.trim() || null,
            comment: comment.trim(),
            category: category || null,
          }),
        },
      );
      setAnnotations((current) =>
        current.map((item) =>
          item.id === response.data.id ? response.data : item,
        ),
      );
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : 'Unable to update annotation',
      );
    } finally {
      setBusy(false);
    }
  }

  async function deleteSelected() {
    if (!selected || selected.createdBy.id !== currentUserId) return;
    setBusy(true);
    try {
      await apiRequest(
        `/channels/${channelId}/files/${file.id}/annotations/${selected.id}`,
        { method: 'DELETE' },
      );
      const next = annotations.filter((item) => item.id !== selected.id);
      setAnnotations(next);
      setSelectedId(next[0]?.id ?? null);
      onAnnotationsChange?.(next.length);
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : 'Unable to delete annotation',
      );
    } finally {
      setBusy(false);
    }
  }

  function selectAnnotation(annotation: ImageAnnotation) {
    setDraftPin(null);
    setSelectedId(annotation.id);
    setTitle(annotation.title ?? '');
    setComment(annotation.comment);
    setCategory(annotation.category ?? '');
  }

  const editingOwn =
    Boolean(selected) && selected?.createdBy.id === currentUserId && !draftPin;

  return (
    <div className="fixed inset-0 z-[80] flex items-stretch justify-center bg-black/55 p-0 sm:p-4">
      <div className="flex h-full w-full max-w-6xl flex-col overflow-hidden bg-[var(--surface)] shadow-[var(--shadow-md)] sm:h-[min(92vh,900px)] sm:rounded-[var(--radius-lg)]">
        <div className="flex items-center justify-between gap-3 border-b border-[var(--border)] px-4 py-3">
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-[var(--foreground)]">
              {mode === 'compose' ? 'Annotate image' : 'Image feedback'}
            </p>
            <p className="truncate text-xs text-[var(--muted)]">
              {file.fileName}
              {annotations.length > 0
                ? ` · ${annotations.length} annotation${annotations.length === 1 ? '' : 's'}`
                : mode === 'compose'
                  ? ' · Click the image to add markers'
                  : ''}
            </p>
          </div>
          <div className="flex items-center gap-1">
            <Button
              type="button"
              size="sm"
              variant="ghost"
              onClick={() => setScale((value) => Math.max(1, value - 0.25))}
              aria-label="Zoom out"
            >
              <Minus className="h-4 w-4" />
            </Button>
            <Button
              type="button"
              size="sm"
              variant="ghost"
              onClick={() => setScale((value) => Math.min(4, value + 0.25))}
              aria-label="Zoom in"
            >
              <Plus className="h-4 w-4" />
            </Button>
            <Button
              type="button"
              size="sm"
              variant="ghost"
              onClick={resetZoom}
              aria-label="Fit to screen"
            >
              <Maximize2 className="h-4 w-4" />
            </Button>
            <Button type="button" size="sm" variant="ghost" onClick={onClose}>
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>

        <div className="grid min-h-0 flex-1 grid-cols-1 lg:grid-cols-[minmax(0,1fr)_20rem]">
          <div
            ref={viewportRef}
            className="relative min-h-[45vh] overflow-hidden bg-[var(--surface-muted)] lg:min-h-0"
          >
            {imageSrc ? (
              <div
                className={cn(
                  'absolute inset-0 flex items-center justify-center',
                  scale > 1 ? 'cursor-grab' : canAnnotate ? 'cursor-crosshair' : 'cursor-default',
                  isPanning && 'cursor-grabbing',
                )}
                onPointerDown={handlePointerDown}
                onPointerMove={handlePointerMove}
                onPointerUp={handlePointerUp}
                onPointerCancel={handlePointerUp}
              >
                <div
                  className="relative max-h-full max-w-full"
                  style={{
                    transform: `translate(${offset.x}px, ${offset.y}px) scale(${scale})`,
                    transformOrigin: 'center center',
                  }}
                  onClick={handleImageClick}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={imageSrc}
                    alt={file.fileName}
                    className="max-h-[70vh] max-w-full select-none object-contain lg:max-h-[78vh]"
                    draggable={false}
                  />
                  {annotations.map((annotation) => (
                    <button
                      key={annotation.id}
                      type="button"
                      className={cn(
                        'absolute flex h-6 w-6 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border-2 text-[11px] font-bold shadow-sm',
                        selectedId === annotation.id
                          ? 'border-white bg-[var(--primary)] text-white'
                          : 'border-white bg-[var(--danger)] text-white',
                      )}
                      style={{
                        left: `${annotation.xPosition * 100}%`,
                        top: `${annotation.yPosition * 100}%`,
                      }}
                      onClick={(event) => {
                        event.stopPropagation();
                        selectAnnotation(annotation);
                      }}
                    >
                      {annotation.markerNumber}
                    </button>
                  ))}
                  {draftPin ? (
                    <span
                      className="absolute flex h-6 w-6 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border-2 border-white bg-[var(--primary)] text-[11px] font-bold text-white"
                      style={{
                        left: `${draftPin.xPosition * 100}%`,
                        top: `${draftPin.yPosition * 100}%`,
                      }}
                    >
                      +
                    </span>
                  ) : null}
                </div>
              </div>
            ) : (
              <div className="flex h-full items-center justify-center text-sm text-[var(--muted)]">
                Loading image…
              </div>
            )}
          </div>

          <aside className="flex min-h-0 flex-col border-t border-[var(--border)] lg:border-l lg:border-t-0">
            <div className="border-b border-[var(--border)] px-3 py-2">
              <p className="text-xs font-semibold uppercase tracking-wide text-[var(--muted)]">
                Feedback
              </p>
              {canAnnotate ? (
                <p className="mt-1 text-xs text-[var(--muted)]">
                  Click the image to add a marker. Zoom in to pan.
                </p>
              ) : null}
            </div>

            <div className="min-h-0 flex-1 space-y-2 overflow-y-auto p-3">
              {annotations.length === 0 && !draftPin ? (
                <div className="rounded-[var(--radius-md)] border border-dashed border-[var(--border)] p-4 text-center text-sm text-[var(--muted)]">
                  <MessageSquarePlus className="mx-auto mb-2 h-5 w-5" />
                  No annotations yet
                </div>
              ) : null}

              {annotations.map((annotation) => (
                <button
                  key={annotation.id}
                  type="button"
                  onClick={() => selectAnnotation(annotation)}
                  className={cn(
                    'w-full rounded-[var(--radius-md)] border px-3 py-2 text-left transition-colors',
                    selectedId === annotation.id
                      ? 'border-[var(--primary)] bg-[var(--primary-soft)]'
                      : 'border-[var(--border)] hover:bg-[var(--surface-muted)]',
                  )}
                >
                  <p className="text-sm font-semibold text-[var(--foreground)]">
                    #{annotation.markerNumber}
                    {annotation.title ? ` · ${annotation.title}` : ''}
                  </p>
                  <p className="mt-0.5 line-clamp-2 text-xs text-[var(--muted)]">
                    {annotation.comment}
                  </p>
                  <p className="mt-1 text-[11px] text-[var(--muted)]">
                    {annotation.createdBy.fullName} ·{' '}
                    {new Date(annotation.createdAt).toLocaleString()}
                  </p>
                </button>
              ))}
            </div>

            {(draftPin || selected) && (
              <form
                className="space-y-2 border-t border-[var(--border)] p-3"
                onSubmit={(event) =>
                  void (draftPin ? saveDraft(event) : saveSelectedEdits(event))
                }
              >
                <p className="text-xs font-semibold text-[var(--foreground)]">
                  {draftPin
                    ? `New marker #${annotations.length + 1}`
                    : `Marker #${selected?.markerNumber}`}
                </p>
                {(draftPin || editingOwn) && (
                  <>
                    <Input
                      label="Title (optional)"
                      value={title}
                      onChange={(event) => setTitle(event.target.value)}
                      disabled={busy}
                    />
                    <label className="block space-y-1.5">
                      <span className="text-sm font-medium text-[var(--foreground)]">
                        Comment
                      </span>
                      <textarea
                        value={comment}
                        onChange={(event) => setComment(event.target.value)}
                        rows={3}
                        required
                        disabled={busy}
                        className="w-full resize-y rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-sm text-[var(--foreground)] outline-none focus:border-[var(--primary)]"
                      />
                    </label>
                    <label className="block space-y-1.5">
                      <span className="text-sm font-medium text-[var(--foreground)]">
                        Category
                      </span>
                      <select
                        value={category}
                        onChange={(event) => setCategory(event.target.value)}
                        disabled={busy}
                        className="h-9 w-full rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--surface)] px-3 text-sm"
                      >
                        <option value="">None</option>
                        {CATEGORIES.map((item) => (
                          <option key={item} value={item}>
                            {item}
                          </option>
                        ))}
                      </select>
                    </label>
                    <div className="flex flex-wrap gap-2">
                      {draftPin ? (
                        <>
                          <Button type="submit" size="sm" disabled={busy}>
                            Save marker
                          </Button>
                          <Button
                            type="button"
                            size="sm"
                            variant="secondary"
                            disabled={busy}
                            onClick={() => setDraftPin(null)}
                          >
                            Cancel
                          </Button>
                        </>
                      ) : (
                        <>
                          <Button type="submit" size="sm" disabled={busy}>
                            Update
                          </Button>
                          <Button
                            type="button"
                            size="sm"
                            variant="secondary"
                            disabled={busy}
                            onClick={() => void deleteSelected()}
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                            Delete
                          </Button>
                        </>
                      )}
                    </div>
                  </>
                )}
                {!draftPin && selected && !editingOwn ? (
                  <div className="space-y-1 text-sm text-[var(--foreground)]">
                    {selected.title ? (
                      <p className="font-medium">{selected.title}</p>
                    ) : null}
                    <p>{selected.comment}</p>
                    <p className="text-xs text-[var(--muted)]">
                      Added by {selected.createdBy.fullName} ·{' '}
                      {new Date(selected.createdAt).toLocaleString()}
                    </p>
                  </div>
                ) : null}
              </form>
            )}

            {errorMessage ? (
              <p className="border-t border-[var(--border)] px-3 py-2 text-xs text-[var(--danger)]">
                {errorMessage}
              </p>
            ) : null}

            {mode === 'compose' ? (
              <div className="space-y-2 border-t border-[var(--border)] p-3">
                <Button type="button" className="w-full" onClick={onClose}>
                  {annotations.length > 0
                    ? 'Add annotated image to message'
                    : 'Add image to message'}
                </Button>
                <p className="text-center text-[11px] text-[var(--muted)]">
                  Markers save as you add them. Send from the composer when ready.
                </p>
              </div>
            ) : null}
          </aside>
        </div>
      </div>
    </div>
  );
}
