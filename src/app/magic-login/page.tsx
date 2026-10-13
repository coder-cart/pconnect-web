'use client';

import { Suspense } from 'react';
import MagicLoginClient from './MagicLoginClient';
import { Card } from '@/components/ui/Card';
import { Logo } from '@/components/ui/Logo';
import { ListSkeleton } from '@/components/ui/Skeleton';

export default function MagicLoginPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-[var(--background)] p-4">
          <div className="w-full max-w-md space-y-6">
            <Logo />
            <Card>
              <ListSkeleton rows={2} />
            </Card>
          </div>
        </div>
      }
    >
      <MagicLoginClient />
    </Suspense>
  );
}
