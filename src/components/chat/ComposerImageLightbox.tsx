'use client';

import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import {
  ChevronLeft,
  ChevronRight,
  Maximize2,
  Minus,
  Plus,
  X,
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { cn } from '@/lib/cn';

export interface ComposerLightboxImage {
  id: string;
  url: string;
  label: string;
}

interface ComposerImageLightboxProps {
  images: ComposerLightboxImage[];
  index: number;
  onIndexChange: (index: number) => void;
  onClose: () => void;
}

export function ComposerImageLightbox({
  images,
  index,
  onIndexChange,
  onClose,
}: ComposerImageLightboxProps) {
  const [scale, setScale] = useState(1);
  const current = images[index] ?? null;

  useEffect(() => {
    setScale(1);
  }, [index]);

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        event.preventDefault();
        onClose();
        return;
      }
      if (event.key === 'ArrowLeft' && index > 0) {
        event.preventDefault();
        onIndexChange(index - 1);
        return;
      }
      if (event.key === 'ArrowRight' && index < images.length - 1) {
        event.preventDefault();
        onIndexChange(index + 1);
      }
    }

    document.addEventListener('keydown', onKeyDown);
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKeyDown);
      document.body.style.overflow = previousOverflow;
    };
  }, [images.length, index, onClose, onIndexChange]);

  if (!current || typeof document === 'undefined') {
    return null;
  }

  return createPortal(
    <div
      className="fixed inset-0 z-[95] flex flex-col bg-black/80"
      role="dialog"
      aria-modal="true"
      aria-label="Image preview"
      onClick={onClose}
    >
      <div
        className="flex items-center justify-between gap-2 px-3 py-2 text-white sm:px-4"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="min-w-0">
          <p className="truncate text-sm font-medium">{current.label}</p>
          <p className="text-xs text-white/70">
            {index + 1} of {images.length}
          </p>
        </div>
        <div className="flex items-center gap-1">
          <Button
            type="button"
            size="sm"
            variant="ghost"
            className="text-white hover:bg-white/10"
            aria-label="Zoom out"
            onClick={() => setScale((value) => Math.max(1, value - 0.25))}
          >
            <Minus className="h-4 w-4" />
          </Button>
          <Button
            type="button"
            size="sm"
            variant="ghost"
            className="text-white hover:bg-white/10"
            aria-label="Zoom in"
            onClick={() => setScale((value) => Math.min(3, value + 0.25))}
          >
            <Plus className="h-4 w-4" />
          </Button>
          <Button
            type="button"
            size="sm"
            variant="ghost"
            className="text-white hover:bg-white/10"
            aria-label="Reset zoom"
            onClick={() => setScale(1)}
          >
            <Maximize2 className="h-4 w-4" />
          </Button>
          <Button
            type="button"
            size="sm"
            variant="ghost"
            className="text-white hover:bg-white/10"
            aria-label="Close preview"
            onClick={onClose}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <div
        className="relative flex min-h-0 flex-1 items-center justify-center px-2 pb-4 sm:px-10"
        onClick={(event) => event.stopPropagation()}
      >
        {images.length > 1 ? (
          <button
            type="button"
            className={cn(
              'absolute left-2 z-10 inline-flex h-10 w-10 items-center justify-center rounded-full bg-black/55 text-white sm:left-4',
              index === 0 && 'pointer-events-none opacity-30',
            )}
            aria-label="Previous image"
            disabled={index === 0}
            onClick={() => onIndexChange(Math.max(0, index - 1))}
          >
            <ChevronLeft className="h-5 w-5" />
          </button>
        ) : null}

        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={current.url}
          alt={current.label}
          className="max-h-full max-w-full object-contain transition-transform duration-150"
          style={{ transform: `scale(${scale})` }}
          draggable={false}
        />

        {images.length > 1 ? (
          <button
            type="button"
            className={cn(
              'absolute right-2 z-10 inline-flex h-10 w-10 items-center justify-center rounded-full bg-black/55 text-white sm:right-4',
              index >= images.length - 1 && 'pointer-events-none opacity-30',
            )}
            aria-label="Next image"
            disabled={index >= images.length - 1}
            onClick={() =>
              onIndexChange(Math.min(images.length - 1, index + 1))
            }
          >
            <ChevronRight className="h-5 w-5" />
          </button>
        ) : null}
      </div>
    </div>,
    document.body,
  );
}
