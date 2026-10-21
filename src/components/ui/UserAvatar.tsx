'use client';

import { useEffect, useState } from 'react';
import { API_BASE_URL } from '@/lib/config';
import { AuthenticatedUser, getStoredToken } from '@/lib/auth';
import { Avatar } from '@/components/ui/Avatar';

const avatarCache = new Map<string, string>();

function useUserAvatar(
  userId: string,
  avatarUpdatedAt?: string | null,
): string | undefined {
  const cacheKey = avatarUpdatedAt ? `${userId}:${avatarUpdatedAt}` : '';
  const [imageUrl, setImageUrl] = useState<string | undefined>(
    cacheKey ? avatarCache.get(cacheKey) : undefined,
  );

  useEffect(() => {
    if (!cacheKey) {
      setImageUrl(undefined);
      return;
    }

    const cached = avatarCache.get(cacheKey);
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

    fetch(`${API_BASE_URL}/users/${userId}/avatar`, {
      headers: { Authorization: `Bearer ${token}` },
      signal: controller.signal,
    })
      .then((response) => (response.ok ? response.blob() : null))
      .then((blob) => {
        if (!blob || cancelled) {
          return;
        }
        const objectUrl = URL.createObjectURL(blob);
        avatarCache.set(cacheKey, objectUrl);
        setImageUrl(objectUrl);
      })
      .catch(() => undefined);

    return () => {
      cancelled = true;
      controller.abort();
    };
  }, [cacheKey, userId]);

  return imageUrl;
}

export function UserAvatar({
  user,
  size = 'md',
  className,
}: {
  user: Pick<AuthenticatedUser, 'id' | 'fullName' | 'avatarUpdatedAt'>;
  size?: 'xs' | 'sm' | 'md' | 'lg';
  className?: string;
}) {
  const imageUrl = useUserAvatar(user.id, user.avatarUpdatedAt);
  return (
    <Avatar
      name={user.fullName}
      imageUrl={imageUrl}
      size={size}
      className={className}
    />
  );
}
