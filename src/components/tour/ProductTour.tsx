'use client';

import { useEffect, useLayoutEffect, useState } from 'react';
import { TourStep } from '@/lib/product-tour';
import { Button } from '@/components/ui/Button';
import { cn } from '@/lib/cn';

interface ProductTourProps {
  steps: TourStep[];
  open: boolean;
  onClose: (completed: boolean) => void;
  onStepChange?: (step: TourStep, index: number) => void;
}

interface SpotlightRect {
  top: number;
  left: number;
  width: number;
  height: number;
}

function readTargetRect(selector: string): SpotlightRect | null {
  const el = document.querySelector(selector);
  if (!(el instanceof HTMLElement)) {
    return null;
  }
  const rect = el.getBoundingClientRect();
  if (rect.width === 0 && rect.height === 0) {
    return null;
  }
  const pad = 6;
  return {
    top: Math.max(0, rect.top - pad),
    left: Math.max(0, rect.left - pad),
    width: rect.width + pad * 2,
    height: rect.height + pad * 2,
  };
}

export function ProductTour({
  steps,
  open,
  onClose,
  onStepChange,
}: ProductTourProps) {
  const [index, setIndex] = useState(0);
  const [spotlight, setSpotlight] = useState<SpotlightRect | null>(null);

  const step = steps[index] ?? null;
  const isLast = index >= steps.length - 1;

  useEffect(() => {
    if (!open) {
      setIndex(0);
      setSpotlight(null);
      return;
    }
    setIndex(0);
  }, [open, steps]);

  useEffect(() => {
    if (!open || !step) return;
    onStepChange?.(step, index);
  }, [open, step, index, onStepChange]);

  useLayoutEffect(() => {
    if (!open || !step) {
      return;
    }

    function measure() {
      setSpotlight(readTargetRect(step.target));
    }

    measure();
    const timer = window.setTimeout(measure, 150);
    window.addEventListener('resize', measure);
    window.addEventListener('scroll', measure, true);
    return () => {
      window.clearTimeout(timer);
      window.removeEventListener('resize', measure);
      window.removeEventListener('scroll', measure, true);
    };
  }, [open, step, index]);

  useEffect(() => {
    if (!open) return;

    function onKey(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        onClose(true);
      }
    }

    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!open || !step || steps.length === 0) {
    return null;
  }

  const cardStyle = spotlight
    ? {
        top: Math.min(
          spotlight.top + spotlight.height + 12,
          typeof window !== 'undefined' ? window.innerHeight - 220 : 0,
        ),
        left: Math.min(
          Math.max(12, spotlight.left),
          typeof window !== 'undefined' ? window.innerWidth - 340 : 12,
        ),
      }
    : undefined;

  return (
    <div
      className="fixed inset-0 z-[80]"
      role="dialog"
      aria-modal="true"
      aria-labelledby="product-tour-title"
    >
      {spotlight ? (
        <div
          className="pointer-events-none absolute z-[81] rounded-[var(--radius-md)] ring-2 ring-[var(--primary)]"
          style={{
            top: spotlight.top,
            left: spotlight.left,
            width: spotlight.width,
            height: spotlight.height,
            boxShadow:
              '0 0 0 9999px color-mix(in srgb, var(--foreground) 45%, transparent)',
          }}
          aria-hidden
        />
      ) : (
        <div className="absolute inset-0 bg-[var(--foreground)]/45" aria-hidden />
      )}

      <div
        className={cn(
          'absolute z-[82] w-[min(20rem,calc(100vw-1.5rem))] rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--surface)] p-4 shadow-[var(--shadow-md)]',
          !spotlight && 'bottom-4 left-1/2 -translate-x-1/2 sm:bottom-8',
        )}
        style={spotlight ? cardStyle : undefined}
      >
        <p className="text-[11px] font-semibold uppercase tracking-wide text-[var(--muted)]">
          Step {index + 1} of {steps.length}
        </p>
        <h2
          id="product-tour-title"
          className="mt-1 text-sm font-semibold text-[var(--foreground)]"
        >
          {step.title}
        </h2>
        <p className="mt-1.5 text-sm text-[var(--muted-foreground)]">{step.body}</p>

        <div className="mt-4 flex flex-wrap items-center justify-between gap-2">
          <button
            type="button"
            className="text-xs text-[var(--muted)] hover:text-[var(--foreground)]"
            onClick={() => onClose(true)}
          >
            Skip tour
          </button>
          <div className="flex gap-2">
            {index > 0 ? (
              <Button
                type="button"
                variant="secondary"
                size="sm"
                onClick={() => setIndex((value) => Math.max(0, value - 1))}
              >
                Back
              </Button>
            ) : null}
            <Button
              type="button"
              size="sm"
              onClick={() => {
                if (isLast) {
                  onClose(true);
                  return;
                }
                setIndex((value) => value + 1);
              }}
            >
              {isLast ? 'Done' : 'Next'}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
