import type { PwaWorkReason } from '@/lib/pwa-work-guard';

export type PwaUpdateDecision = 'hidden' | 'defer' | 'prompt';

export function availablePwaRelease(input: {
  updateReady: boolean;
  runningRelease: string;
  remoteRelease: string | null;
}): string | null {
  if (!input.runningRelease) return null;
  if (input.remoteRelease && input.remoteRelease !== input.runningRelease) {
    return input.remoteRelease;
  }
  if (input.updateReady) return `worker:${input.runningRelease}`;
  return null;
}

export function resolvePwaUpdateDecision(input: {
  supported: boolean;
  availableRelease: string | null;
  dismissedRelease: string | null;
  workHold: boolean;
  userIsBusyTyping: boolean;
  popupLatched: boolean;
}): PwaUpdateDecision {
  if (!input.supported || !input.availableRelease) return 'hidden';
  if (input.dismissedRelease === input.availableRelease) return 'hidden';
  if (input.popupLatched) return 'prompt';
  if (input.workHold || input.userIsBusyTyping) return 'defer';
  return 'prompt';
}

export function pwaUpdateBlockMessage(
  hold: PwaWorkReason | null,
  typing: boolean,
): string | null {
  switch (hold) {
    case 'upload':
      return 'An upload is still in progress. You can update after it finishes.';
    case 'message':
      return 'Send or clear your unsent message first so this update does not discard it.';
    case 'order-create':
      return 'Finish or close order creation before updating so those details are not lost.';
    case 'order-edit':
      return 'Save or leave the order you are editing before updating.';
    case null:
      return typing
        ? 'Finish the message you are typing before updating.'
        : null;
    default: {
      const exhaustive: never = hold;
      return exhaustive;
    }
  }
}
