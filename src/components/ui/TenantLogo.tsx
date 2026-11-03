'use client';

import { useEffect, useState } from 'react';
import { Building2 } from 'lucide-react';
import { API_BASE_URL } from '@/lib/config';
import { getStoredToken } from '@/lib/auth';
import { cn } from '@/lib/cn';

const logoCache = new Map<string, string>();

function useTenantLogo(logoUpdatedAt?: string | null): string | undefined {
  const cacheKey = logoUpdatedAt ? `workspace:${logoUpdatedAt}` : '';
  const [imageUrl, setImageUrl] = useState<string | undefined>(
    cacheKey ? logoCache.get(cacheKey) : undefined,
  );

  useEffect(() => {
    if (!cacheKey) {
      setImageUrl(undefined);
      return;
    }

    const cached = logoCache.get(cacheKey);
    if (cached) {
      setImageUrl(cached);
      return;
    }

    const token = getStoredToken();
    if (!token) {
      return;
    }

    let cancelled = false;
    const controller = new AbortController();

    fetch(`${API_BASE_URL}/workspace/logo`, {
      headers: { Authorization: `Bearer ${token}` },
      signal: controller.signal,
    })
      .then((response) => (response.ok ? response.blob() : null))
      .then((blob) => {
        if (!blob || cancelled) {
          return;
        }
        const objectUrl = URL.createObjectURL(blob);
        logoCache.set(cacheKey, objectUrl);
        setImageUrl(objectUrl);
      })
      .catch(() => undefined);

    return () => {
      cancelled = true;
      controller.abort();
    };
  }, [cacheKey]);

  return imageUrl;
}

export function TenantLogo({
  name,
  logoUpdatedAt,
  className,
}: {
  name: string;
  logoUpdatedAt?: string | null;
  className?: string;
}) {
  const imageUrl = useTenantLogo(logoUpdatedAt);

  return (
    <span
      className={cn(
        'inline-flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--surface-muted)]',
        className,
      )}
      title={name}
    >
      {imageUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={imageUrl}
          alt={`${name} logo`}
          className="h-full w-full object-contain"
        />
      ) : (
        <Building2 className="h-5 w-5 text-[var(--muted)]" aria-hidden="true" />
      )}
    </span>
  );
}
