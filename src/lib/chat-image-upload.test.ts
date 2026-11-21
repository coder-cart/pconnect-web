import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  isHeicLikeImage,
  validateChatImageFile,
} from './chat-image-upload';

describe('isHeicLikeImage', () => {
  it('detects HEIC MIME and extensions', () => {
    assert.equal(
      isHeicLikeImage(new File([], 'a.heic', { type: 'image/heic' })),
      true,
    );
    assert.equal(
      isHeicLikeImage(new File([], 'a.HEIF', { type: '' })),
      true,
    );
    assert.equal(
      isHeicLikeImage(new File([], 'shot.png', { type: 'image/png' })),
      false,
    );
  });
});

describe('validateChatImageFile', () => {
  it('rejects HEIC with a gallery-friendly message', () => {
    const message = validateChatImageFile(
      new File([new Uint8Array([1, 2, 3])], 'photo.heic', {
        type: 'image/heic',
      }),
    );
    assert.ok(message);
    assert.match(message!, /HEIC/i);
  });
});
