'use client';

import { useWorkspace } from '@/components/providers/WorkspaceProvider';
import { resolveViewerTimeZone } from '@/lib/formatMessageDate';

export function useViewerTimeZone(): string {
  const { user } = useWorkspace();
  return resolveViewerTimeZone(user.effectiveTimeZone ?? user.timeZone);
}
