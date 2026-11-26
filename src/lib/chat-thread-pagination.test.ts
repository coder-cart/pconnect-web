import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  normalizeChannelMessagesPage,
  prependOlderMessagePage,
} from './chat-types';

describe('thread reply page normalize', () => {
  it('accepts paginated { items, hasMore }', () => {
    const page = normalizeChannelMessagesPage({
      items: [{ id: 'a' } as never, { id: 'b' } as never],
      hasMore: true,
    });
    assert.equal(page.hasMore, true);
    assert.deepEqual(
      page.items.map((item) => item.id),
      ['a', 'b'],
    );
  });

  it('treats legacy array as final page (hasMore false)', () => {
    const page = normalizeChannelMessagesPage([
      { id: 'x' } as never,
      { id: 'y' } as never,
    ]);
    assert.equal(page.hasMore, false);
    assert.equal(page.items.length, 2);
  });

  it('handles null / empty payloads', () => {
    assert.deepEqual(normalizeChannelMessagesPage(null), {
      items: [],
      hasMore: false,
    });
    assert.deepEqual(normalizeChannelMessagesPage(undefined), {
      items: [],
      hasMore: false,
    });
  });
});

describe('prepend older thread replies', () => {
  it('places older page before current and dedupes overlap', () => {
    const older = [{ id: '1' }, { id: '2' }, { id: '3' }];
    const current = [{ id: '3' }, { id: '4' }, { id: '5' }];
    const merged = prependOlderMessagePage(older, current);
    assert.deepEqual(
      merged.map((item) => item.id),
      ['1', '2', '3', '4', '5'],
    );
  });

  it('no-ops when older page is empty', () => {
    const current = [{ id: 'a' }];
    assert.equal(prependOlderMessagePage([], current), current);
  });

  it('keeps older-only pages when current is empty', () => {
    const older = [{ id: '1' }, { id: '2' }];
    assert.deepEqual(prependOlderMessagePage(older, []), older);
  });
});
