'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { Headphones } from 'lucide-react';
import { Card } from '@/components/ui/Card';

export default function HuddlePage() {
  const params = useParams<{ channelId: string }>();
  const channelId = params.channelId;

  return (
    <div className="mx-auto max-w-xl py-12">
      <Card padding="lg" className="text-center">
        <Headphones className="mx-auto h-10 w-10 text-[var(--primary)]" />
        <h1 className="mt-4 text-lg font-semibold">Huddle room</h1>
        <p className="mt-2 text-sm text-[var(--muted)]">
          Audio huddles are link-based for now. WebRTC integration can be added
          later with a provider such as Livekit or Daily.co.
        </p>
        <p className="mt-4 text-xs text-[var(--muted)]">
          Channel: {channelId}
        </p>
        <Link
          href={`/chat?channel=${channelId}`}
          className="mt-6 inline-flex h-10 items-center justify-center rounded-[var(--radius-md)] bg-[var(--primary)] px-4 text-sm font-medium text-white"
        >
          Back to channel
        </Link>
      </Card>
    </div>
  );
}
