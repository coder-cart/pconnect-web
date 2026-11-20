'use client';

import { useEffect } from 'react';
import { setPwaWorkHold, type PwaWorkReason } from '@/lib/pwa-work-guard';

export function usePwaWorkHold(
  active: boolean,
  id: string,
  reason: PwaWorkReason,
) {
  useEffect(() => {
    if (!active) {
      setPwaWorkHold(id, null);
      return;
    }
    setPwaWorkHold(id, reason);
    return () => setPwaWorkHold(id, null);
  }, [active, id, reason]);
}
