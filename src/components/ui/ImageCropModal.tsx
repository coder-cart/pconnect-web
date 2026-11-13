'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Cropper, { Area } from 'react-easy-crop';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { CropAreaPixels, getCroppedImageFile } from '@/lib/crop-image';
import { cn } from '@/lib/cn';

type CropMode = 'avatar' | 'logo';
type LogoShape = 'square' | 'wide' | 'ultrawide' | 'original';
type LogoBackgroundPreset = 'white' | 'black' | 'navy' | 'gray' | 'custom' | 'none';

interface ImageCropModalProps {
  open: boolean;
  imageSrc: string | null;
  title?: string;
  description?: string;
  /** @deprecated Prefer mode. Kept for avatar callers that pass a fixed ratio. */
  aspect?: number;
  /** avatar = square circle preview; logo = shape presets for company marks */
  mode?: CropMode;
  isSaving?: boolean;
  onClose: () => void;
  onSave: (file: File) => void | Promise<void>;
}

const DEFAULT_ZOOM = 1;
const DEFAULT_CROP = { x: 0, y: 0 };
const DEFAULT_CUSTOM_BG = '#2563eb';

const LOGO_SHAPE_OPTIONS: Array<{ id: LogoShape; label: string }> = [
  { id: 'original', label: 'Fit image' },
  { id: 'square', label: 'Square' },
  { id: 'wide', label: 'Wide' },
  { id: 'ultrawide', label: 'Banner' },
];

const LOGO_BG_PRESETS: Array<{
  id: LogoBackgroundPreset;
  label: string;
  color: string | null;
}> = [
  { id: 'white', label: 'White', color: '#ffffff' },
  { id: 'black', label: 'Black', color: '#111827' },
  { id: 'navy', label: 'Navy', color: '#0f172a' },
  { id: 'gray', label: 'Gray', color: '#e5e7eb' },
  { id: 'custom', label: 'Custom', color: null },
  { id: 'none', label: 'None', color: null },
];

function resolveLogoBackground(
  preset: LogoBackgroundPreset,
  customColor: string,
): string | null {
  switch (preset) {
    case 'white':
      return '#ffffff';
    case 'black':
      return '#111827';
    case 'navy':
      return '#0f172a';
    case 'gray':
      return '#e5e7eb';
    case 'custom':
      return customColor || DEFAULT_CUSTOM_BG;
    case 'none':
      return null;
    default: {
      const _exhaustive: never = preset;
      return _exhaustive;
    }
  }
}

function logoAspectValue(
  shape: LogoShape,
  naturalAspect: number | null,
): number {
  switch (shape) {
    case 'square':
      return 1;
    case 'wide':
      return 16 / 9;
    case 'ultrawide':
      return 3;
    case 'original':
      return naturalAspect && naturalAspect > 0 ? naturalAspect : 16 / 9;
    default: {
      const _exhaustive: never = shape;
      return _exhaustive;
    }
  }
}

function defaultLogoShape(naturalAspect: number | null): LogoShape {
  if (!naturalAspect || naturalAspect <= 0) return 'original';
  if (naturalAspect >= 2.4) return 'ultrawide';
  if (naturalAspect >= 1.25) return 'wide';
  if (naturalAspect <= 0.85) return 'original';
  return 'square';
}

export function ImageCropModal({
  open,
  imageSrc,
  title = 'Adjust photo',
  description = 'Crop, zoom, and reposition before saving.',
  aspect = 1,
  mode = 'avatar',
  isSaving = false,
  onClose,
  onSave,
}: ImageCropModalProps) {
  const isLogoMode = mode === 'logo';
  const [crop, setCrop] = useState(DEFAULT_CROP);
  const [zoom, setZoom] = useState(DEFAULT_ZOOM);
  const [croppedAreaPixels, setCroppedAreaPixels] =
    useState<CropAreaPixels | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isPreparing, setIsPreparing] = useState(false);
  const [naturalAspect, setNaturalAspect] = useState<number | null>(null);
  const [logoShape, setLogoShape] = useState<LogoShape>('original');
  const [logoBgPreset, setLogoBgPreset] =
    useState<LogoBackgroundPreset>('white');
  const [customBgColor, setCustomBgColor] = useState(DEFAULT_CUSTOM_BG);

  const activeAspect = useMemo(() => {
    if (isLogoMode) {
      return logoAspectValue(logoShape, naturalAspect);
    }
    return aspect;
  }, [aspect, isLogoMode, logoShape, naturalAspect]);

  const logoBackgroundColor = useMemo(() => {
    if (!isLogoMode) return '#ffffff';
    return resolveLogoBackground(logoBgPreset, customBgColor);
  }, [customBgColor, isLogoMode, logoBgPreset]);

  const resetAdjustments = useCallback(() => {
    setCrop(DEFAULT_CROP);
    setZoom(DEFAULT_ZOOM);
    setErrorMessage(null);
  }, []);

  useEffect(() => {
    if (!open || !imageSrc) {
      return;
    }

    let cancelled = false;
    const image = new Image();
    image.onload = () => {
      if (cancelled) return;
      const ratio =
        image.naturalWidth > 0 && image.naturalHeight > 0
          ? image.naturalWidth / image.naturalHeight
          : null;
      setNaturalAspect(ratio);
      if (isLogoMode) {
        setLogoShape(defaultLogoShape(ratio));
        setLogoBgPreset('white');
        setCustomBgColor(DEFAULT_CUSTOM_BG);
      }
      resetAdjustments();
      setCroppedAreaPixels(null);
      setPreviewUrl(null);
    };
    image.onerror = () => {
      if (cancelled) return;
      setNaturalAspect(null);
      if (isLogoMode) {
        setLogoShape('wide');
        setLogoBgPreset('white');
        setCustomBgColor(DEFAULT_CUSTOM_BG);
      }
      resetAdjustments();
      setCroppedAreaPixels(null);
      setPreviewUrl(null);
    };
    image.src = imageSrc;

    return () => {
      cancelled = true;
    };
  }, [open, imageSrc, isLogoMode, resetAdjustments]);

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
    void getCroppedImageFile(imageSrc, croppedAreaPixels, {
      fileName: isLogoMode ? 'company-logo.png' : 'profile-photo.jpg',
      mimeType: isLogoMode ? 'image/png' : 'image/jpeg',
      backgroundColor: logoBackgroundColor,
    })
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
  }, [imageSrc, croppedAreaPixels, isLogoMode, logoBackgroundColor]);

  async function handleSave() {
    if (!imageSrc || !croppedAreaPixels) {
      setErrorMessage('Adjust the image before saving.');
      return;
    }

    setIsPreparing(true);
    setErrorMessage(null);
    try {
      const file = await getCroppedImageFile(imageSrc, croppedAreaPixels, {
        fileName: isLogoMode ? 'company-logo.png' : 'profile-photo.jpg',
        mimeType: isLogoMode ? 'image/png' : 'image/jpeg',
        backgroundColor: logoBackgroundColor,
      });
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
  const previewAspect = Math.max(0.5, Math.min(activeAspect, 4));

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
            {busy ? 'Saving…' : isLogoMode ? 'Save logo' : 'Save photo'}
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        {isLogoMode ? (
          <div className="space-y-3">
            <div className="flex flex-wrap gap-1.5">
              {LOGO_SHAPE_OPTIONS.map((option) => (
                <button
                  key={option.id}
                  type="button"
                  disabled={busy}
                  onClick={() => {
                    setLogoShape(option.id);
                    resetAdjustments();
                  }}
                  className={cn(
                    'rounded-full border px-3 py-1.5 text-xs font-medium transition-colors',
                    logoShape === option.id
                      ? 'border-[var(--primary)] bg-[var(--primary-soft)] text-[var(--primary)]'
                      : 'border-[var(--border)] text-[var(--muted)] hover:bg-[var(--surface-muted)] hover:text-[var(--foreground)]',
                  )}
                >
                  {option.label}
                </button>
              ))}
            </div>

            <div className="space-y-2">
              <p className="text-sm font-medium text-[var(--foreground)]">
                Background
              </p>
              <p className="text-xs text-[var(--muted)]">
                Use a dark background for white logos so they stay visible.
              </p>
              <div className="flex flex-wrap items-center gap-2">
                {LOGO_BG_PRESETS.map((preset) => {
                  const swatch =
                    preset.id === 'custom'
                      ? customBgColor
                      : preset.color;
                  const selected = logoBgPreset === preset.id;
                  return (
                    <button
                      key={preset.id}
                      type="button"
                      disabled={busy}
                      title={preset.label}
                      aria-label={`Background ${preset.label}`}
                      aria-pressed={selected}
                      onClick={() => setLogoBgPreset(preset.id)}
                      className={cn(
                        'inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1.5 text-xs font-medium transition-colors',
                        selected
                          ? 'border-[var(--primary)] bg-[var(--primary-soft)] text-[var(--primary)]'
                          : 'border-[var(--border)] text-[var(--muted)] hover:bg-[var(--surface-muted)] hover:text-[var(--foreground)]',
                      )}
                    >
                      <span
                        className="h-3.5 w-3.5 shrink-0 rounded-full border border-[var(--border)]"
                        style={
                          preset.id === 'none'
                            ? {
                                backgroundImage:
                                  'repeating-conic-gradient(#d1d5db 0% 25%, #ffffff 0% 50%)',
                                backgroundSize: '8px 8px',
                              }
                            : {
                                backgroundColor:
                                  swatch ?? customBgColor,
                              }
                        }
                      />
                      {preset.label}
                    </button>
                  );
                })}
                {logoBgPreset === 'custom' ? (
                  <label className="inline-flex items-center gap-2 text-xs text-[var(--muted)]">
                    <span className="sr-only">Custom background color</span>
                    <input
                      type="color"
                      value={customBgColor}
                      disabled={busy}
                      onChange={(event) =>
                        setCustomBgColor(event.target.value)
                      }
                      className="h-8 w-10 cursor-pointer rounded border border-[var(--border)] bg-transparent p-0.5"
                    />
                  </label>
                ) : null}
              </div>
            </div>
          </div>
        ) : null}

        <div
          className="relative h-64 w-full overflow-hidden rounded-[var(--radius-md)] sm:h-80"
          style={{
            backgroundColor:
              isLogoMode && logoBackgroundColor
                ? logoBackgroundColor
                : undefined,
          }}
        >
          <div
            className={cn(
              'absolute inset-0',
              !(isLogoMode && logoBackgroundColor) &&
                'bg-[var(--surface-muted)]',
            )}
          />
          {imageSrc ? (
            <Cropper
              image={imageSrc}
              crop={crop}
              zoom={zoom}
              aspect={activeAspect}
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
              className={cn(
                'shrink-0 object-contain ring-2 ring-[var(--border)]',
                isLogoMode
                  ? 'h-14 max-w-[12rem] rounded-[var(--radius-md)]'
                  : 'h-14 w-14 rounded-full object-cover',
              )}
              style={{
                ...(isLogoMode
                  ? { aspectRatio: String(previewAspect) }
                  : undefined),
                ...(logoBackgroundColor
                  ? { backgroundColor: logoBackgroundColor }
                  : {
                      backgroundImage:
                        'repeating-conic-gradient(#d1d5db 0% 25%, #ffffff 0% 50%)',
                      backgroundSize: '10px 10px',
                    }),
              }}
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
