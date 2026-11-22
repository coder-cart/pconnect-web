export type PwaWorkReason = 'message' | 'upload' | 'order-create' | 'order-edit';

const PRIORITY: PwaWorkReason[] = [
  'upload',
  'message',
  'order-create',
  'order-edit',
];

const holds = new Map<string, PwaWorkReason>();
const listeners = new Set<() => void>();

function emit() {
  for (const listener of [...listeners]) listener();
}

export function setPwaWorkHold(id: string, reason: PwaWorkReason | null) {
  if (reason) holds.set(id, reason);
  else holds.delete(id);
  emit();
}

export function getPwaWorkHold(): PwaWorkReason | null {
  const active = new Set(holds.values());
  for (const reason of PRIORITY) {
    if (active.has(reason)) return reason;
  }
  return null;
}

export function subscribePwaWork(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

let uploadDepth = 0;

/** Marks an in-flight upload so a PWA reload cannot drop it. */
export function beginPwaUpload(): () => void {
  uploadDepth += 1;
  holds.set('pwa-uploads', 'upload');
  emit();
  let closed = false;
  return () => {
    if (closed) return;
    closed = true;
    uploadDepth = Math.max(0, uploadDepth - 1);
    if (uploadDepth === 0) holds.delete('pwa-uploads');
    emit();
  };
}
