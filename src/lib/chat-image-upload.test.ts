import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  collectClipboardImageFiles,
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

function mockClipboardData(options: {
  plainText?: string;
  html?: string;
  files?: File[];
  items?: Array<{ kind: string; type: string; file: File | null }>;
}): DataTransfer {
  const files = options.files ?? [];
  const items = options.items ?? [];
  return {
    getData(type: string) {
      if (type === 'text/plain') return options.plainText ?? '';
      if (type === 'text/html') return options.html ?? '';
      return '';
    },
    files: files as unknown as FileList,
    items: {
      length: items.length,
      [Symbol.iterator]() {
        return items
          .map((item) => ({
            kind: item.kind,
            type: item.type,
            getAsFile: () => item.file,
          }))
          [Symbol.iterator]();
      },
    },
  } as unknown as DataTransfer;
}

describe('collectClipboardImageFiles', () => {
  it('keeps explicit image/* screenshot files', () => {
    const image = new File([new Uint8Array([1, 2, 3, 4])], 'shot.png', {
      type: 'image/png',
    });
    const result = collectClipboardImageFiles(
      mockClipboardData({ files: [image] }),
    );
    assert.equal(result.length, 1);
    assert.equal(result[0].type, 'image/png');
  });

  it('does not treat empty-type phantom files as images when text is present', () => {
    const phantom = new File([new Uint8Array([9, 9, 9])], 'blob', {
      type: '',
    });
    const result = collectClipboardImageFiles(
      mockClipboardData({
        plainText: 'hello from laptop',
        html: '<meta charset="utf-8"><div>hello from laptop</div>',
        files: [phantom],
        items: [{ kind: 'file', type: '', file: phantom }],
      }),
    );
    assert.equal(result.length, 0);
  });

  it('still accepts untitled empty-type blobs for image-only pastes', () => {
    const blob = new File([new Uint8Array([1, 2, 3, 4, 5])], 'image.png', {
      type: '',
    });
    // name has image extension → always accepted
    const named = collectClipboardImageFiles(
      mockClipboardData({ files: [blob] }),
    );
    assert.equal(named.length, 1);

    const untitled = new File([new Uint8Array([1, 2, 3, 4, 5])], '', {
      type: '',
    });
    const imageOnly = collectClipboardImageFiles(
      mockClipboardData({ files: [untitled] }),
    );
    assert.equal(imageOnly.length, 1);
  });
});
