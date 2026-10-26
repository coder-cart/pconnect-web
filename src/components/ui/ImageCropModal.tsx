'use client';

import { useCallback, useEffect, useState } from 'react';
import Cropper, { Area } from 'react-easy-crop';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { CropAreaPixels, getCroppedImageFile } from '@/lib/crop-image';

interface ImageCropModalProps {
  open: boolean;
  imageSrc: string | null;
  title?: string;
  description?: string;
  aspect?: number;
  isSaving?: boolean;
  onClose: () => void;
  onSave: (file: File) => void | Promise<void>;
}

const DEFAULT_ZOOM = 1;
const DEFAULT_CROP = { x: 0, y: 0 };

export function ImageCropModal({
  open,
  imageSrc,
  title = 'Adjust photo',
  description = 'Crop, zoom, and reposition before saving.',
  aspect = 1,
  isSaving = false,
  onClose,
  onSave,
}: ImageCropModalProps) {
  const [crop, setCrop] = useState(DEFAULT_CROP);
  const [zoom, setZoom] = useState(DEFAULT_ZOOM);
  const [croppedAreaPixels, setCroppedAreaPixels] =
    useState<CropAreaPixels | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isPreparing, setIsPreparing] = useState(false);

  const resetAdjustments = useCallback(() => {
    setCrop(DEFAULT_CROP);
    setZoom(DEFAULT_ZOOM);
    setErrorMessage(null);
  }, []);

  useEffect(() => {
    if (!open) {
      return;
    }
    resetAdjustments();
    setCroppedAreaPixels(null);
    setPreviewUrl(null);
  }, [open, imageSrc, resetAdjustments]);

  useEffect(() => {
    return () => {
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl);
      }
    };
  }, [previewUrl]);

  const onCropComplete = useCallback(
    (_croppedArea: Area, pixels: Area) => {
      setCroppedAreaPixels({
        x: pixels.x,
        y: pixels.y,
        width: pixels.width,
        height: pixels.height,
      });
    },
    [],
  );

  useEffect(() => {
    if (!imageSrc || !croppedAreaPixels) {
      setPreviewUrl(null);
      return;
    }

    let cancelled = false;
    void getCroppedImageFile(imageSrc, croppedAreaPixels)
      .then((file) => {
        if (cancelled) return;
        const nextUrl = URL.createObjectURL(file);
        setPreviewUrl((previous) => {
          if (previous) URL.revokeObjectURL(previous);
          return nextUrl;
        });
      })
      .catch(() => {
        if (!cancelled) setPreviewUrl(null);
      });

    return () => {
      cancelled = true;
    };
  }, [imageSrc, croppedAreaPixels]);

  async function handleSave() {
    if (!imageSrc || !croppedAreaPixels) {
      setErrorMessage('Adjust the image before saving.');
      return;
    }

    setIsPreparing(true);
    setErrorMessage(null);
    try {
      const file = await getCroppedImageFile(
        imageSrc,
        croppedAreaPixels,
        'profile-photo.jpg',
      );
      await onSave(file);
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : 'Unable to save the image',
      );
    } finally {
      setIsPreparing(false);
    }
  }

  const busy = isSaving || isPreparing;

  return (
    <Modal
      open={open && Boolean(imageSrc)}
      title={title}
      description={description}
      onClose={() => {
        if (!busy) onClose();
      }}
      size="lg"
      footer={
        <>
          <Button
            type="button"
            variant="secondary"
            className="h-11 w-full shrink-0 sm:h-10 sm:w-auto"
            onClick={onClose}
            disabled={busy}
          >
            Cancel
          </Button>
          <Button
            type="button"
            variant="secondary"
            className="h-11 w-full shrink-0 sm:h-10 sm:w-auto"
            onClick={resetAdjustments}
            disabled={busy}
          >
            Reset
          </Button>
          <Button
            type="button"
            className="h-11 w-full shrink-0 sm:h-10 sm:w-auto"
            onClick={() => void handleSave()}
            disabled={busy || !croppedAreaPixels}
          >
            {busy ? 'Saving…' : 'Save photo'}
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <div className="relative h-64 w-full overflow-hidden rounded-[var(--radius-md)] bg-[var(--surface-muted)] sm:h-80">
          {imageSrc ? (
            <Cropper
              image={imageSrc}
              crop={crop}
              zoom={zoom}
              aspect={aspect}
              showGrid
              onCropChange={setCrop}
              onZoomChange={setZoom}
              onCropComplete={onCropComplete}
            />
          ) : null}
        </div>

        <label className="block space-y-2">
          <span className="text-sm font-medium text-[var(--foreground)]">
            Zoom
          </span>
          <input
            type="range"
            min={1}
            max={3}
            step={0.05}
            value={zoom}
            disabled={busy}
            onChange={(event) => setZoom(Number(event.target.value))}
            className="w-full accent-[var(--primary)]"
            aria-label="Zoom"
          />
        </label>

        {previewUrl ? (
          <div className="flex items-center gap-3 rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--surface-muted)]/50 p-3">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={previewUrl}
              alt="Crop preview"
              className="h-14 w-14 rounded-full object-cover ring-2 ring-[var(--surface)]"
            />
            <p className="text-sm text-[var(--muted)]">
              Preview of the image that will be saved.
            </p>
          </div>
        ) : null}

        {errorMessage ? (
          <p className="text-sm text-[var(--danger)]">{errorMessage}</p>
        ) : null}
      </div>
    </Modal>
  );
}
