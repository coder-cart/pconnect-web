import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  availablePwaRelease,
  pwaUpdateBlockMessage,
  resolvePwaUpdateDecision,
} from './pwa-update-policy.ts';

const base = {
  supported: true,
  availableRelease: 'build-b' as string | null,
  dismissedRelease: null as string | null,
  workHold: false,
  userIsBusyTyping: false,
  popupLatched: false,
};

describe('availablePwaRelease', () => {
  it('stays quiet when the running release matches the server', () => {
    assert.equal(
      availablePwaRelease({
        updateReady: false,
        runningRelease: 'build-a',
        remoteRelease: 'build-a',
      }),
      null,
    );
  });

  it('uses the remote release when a deployment is newer', () => {
    assert.equal(
      availablePwaRelease({
        updateReady: true,
        runningRelease: 'build-a',
        remoteRelease: 'build-b',
      }),
      'build-b',
    );
  });

  it('still offers an update when a worker is waiting and version.json matches', () => {
    assert.equal(
      availablePwaRelease({
        updateReady: true,
        runningRelease: 'build-a',
        remoteRelease: 'build-a',
      }),
      'worker:build-a',
    );
  });
});

describe('resolvePwaUpdateDecision', () => {
  it('prompts only for a real pending release', () => {
    assert.equal(resolvePwaUpdateDecision(base), 'prompt');
    assert.equal(
      resolvePwaUpdateDecision({ ...base, availableRelease: null }),
      'hidden',
    );
    assert.equal(
      resolvePwaUpdateDecision({ ...base, supported: false }),
      'hidden',
    );
  });

  it('hides for the rest of the session after Later', () => {
    assert.equal(
      resolvePwaUpdateDecision({ ...base, dismissedRelease: 'build-b' }),
      'hidden',
    );
  });

  it('shows again when a newer release arrives after Later', () => {
    assert.equal(
      resolvePwaUpdateDecision({
        ...base,
        availableRelease: 'build-c',
        dismissedRelease: 'build-b',
      }),
      'prompt',
    );
  });

  it('defers the first prompt while work is in progress', () => {
    assert.equal(
      resolvePwaUpdateDecision({ ...base, workHold: true }),
      'defer',
    );
    assert.equal(
      resolvePwaUpdateDecision({ ...base, userIsBusyTyping: true }),
      'defer',
    );
  });

  it('keeps a visible prompt up if typing starts after it opened', () => {
    assert.equal(
      resolvePwaUpdateDecision({
        ...base,
        popupLatched: true,
        userIsBusyTyping: true,
        workHold: true,
      }),
      'prompt',
    );
  });
});

describe('pwaUpdateBlockMessage', () => {
  it('explains why Update Now is waiting', () => {
    assert.match(pwaUpdateBlockMessage('message', false) ?? '', /unsent message/);
    assert.match(pwaUpdateBlockMessage('upload', false) ?? '', /upload/i);
    assert.match(pwaUpdateBlockMessage('order-create', false) ?? '', /order creation/);
    assert.match(pwaUpdateBlockMessage('order-edit', false) ?? '', /editing/);
    assert.match(pwaUpdateBlockMessage(null, true) ?? '', /typing/);
    assert.equal(pwaUpdateBlockMessage(null, false), null);
  });
});
