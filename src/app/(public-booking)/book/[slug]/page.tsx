'use client';

import { useParams, useSearchParams } from 'next/navigation';
import { PublicBookFlow } from '@/components/public-booking/PublicBookFlow';

function paramValue(value: string | string[] | undefined) {
  if (Array.isArray(value)) return value[0] ?? '';
  return value ?? '';
}

export default function PublicBookPage() {
  const params = useParams<{ slug: string }>();
  const searchParams = useSearchParams();
  const slug = paramValue(params.slug);
  const embed = searchParams.get('embed') === '1';
  return (
    <PublicBookFlow
      slug={slug}
      showAttribution
      embed={embed}
    />
  );
}
