import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  CHANNEL_MESSAGE_HEAD_BUFFER,
  CHANNEL_MESSAGE_MAX_RETAINED,
  CHANNEL_MESSAGE_PAGE_SIZE,
  retainChannelMessageWindow,
} from './messageWindowRetention';

function makeMessages(count: number, start = 1) {
  return Array.from({ length: count }, (_, index) => ({
    id: `m${start + index}`,
  }));
}

describe('retainChannelMessageWindow', () => {
  it('is a no-op under the soft cap', () => {
    const messages = makeMessages(100);
    const result = retainChannelMessageWindow({
      messages,
      startDataIndex: 80,
    });
    assert.equal(result.removedCount, 0);
    assert.equal(result.hasMoreForced, false);
    assert.equal(result.messages, messages);
  });

  it('drops oldest full pages when over cap and viewport is safe', () => {
    const messages = makeMessages(2500);
    const result = retainChannelMessageWindow({
      messages,
      startDataIndex: 800,
      maxRetained: CHANNEL_MESSAGE_MAX_RETAINED,
      pageSize: CHANNEL_MESSAGE_PAGE_SIZE,
      headBufferMessages: CHANNEL_MESSAGE_HEAD_BUFFER,
    });
    assert.ok(result.removedCount > 0);
    assert.equal(result.removedCount % CHANNEL_MESSAGE_PAGE_SIZE, 0);
    assert.equal(result.messages.length, messages.length - result.removedCount);
    assert.ok(result.messages.length <= CHANNEL_MESSAGE_MAX_RETAINED);
    assert.equal(result.hasMoreForced, true);
    assert.equal(result.messages[0].id, `m${1 + result.removedCount}`);
  });

  it('does not evict when near the retained head', () => {
    const messages = makeMessages(2500);
    const result = retainChannelMessageWindow({
      messages,
      startDataIndex: 40,
    });
    assert.equal(result.removedCount, 0);
    assert.equal(result.messages, messages);
  });

  it('suspends eviction while loading older / at top', () => {
    const messages = makeMessages(2500);
    const result = retainChannelMessageWindow({
      messages,
      startDataIndex: 900,
      suspend: true,
    });
    assert.equal(result.removedCount, 0);
    assert.equal(result.messages, messages);
  });

  it('never drops protected ids (thread parent / highlight)', () => {
    const messages = makeMessages(2500);
    const protectedId = messages[20].id;
    const result = retainChannelMessageWindow({
      messages,
      startDataIndex: 900,
      protectedIds: [protectedId],
    });
    assert.ok(result.removedCount <= 20);
    assert.equal(result.removedCount % CHANNEL_MESSAGE_PAGE_SIZE, 0);
    assert.ok(result.messages.some((message) => message.id === protectedId));
  });

  it('aligns removals to page size only', () => {
    const messages = makeMessages(2050);
    const result = retainChannelMessageWindow({
      messages,
      startDataIndex: 700,
      maxRetained: 2000,
      pageSize: 50,
    });
    assert.equal(result.removedCount, 50);
    assert.equal(result.messages.length, 2000);
  });

  it('reports retained counts for large synthetic windows', () => {
    const sizes = [1000, 2000, 5000, 10000];
    const report: Array<{
      n: number;
      retained: number;
      removed: number;
    }> = [];
    for (const n of sizes) {
      const messages = makeMessages(n);
      const result = retainChannelMessageWindow({
        messages,
        startDataIndex: Math.max(0, n - 200),
      });
      report.push({
        n,
        retained: result.messages.length,
        removed: result.removedCount,
      });
      assert.ok(result.messages.length <= Math.max(n, CHANNEL_MESSAGE_MAX_RETAINED));
      if (n > CHANNEL_MESSAGE_MAX_RETAINED) {
        assert.ok(result.messages.length <= CHANNEL_MESSAGE_MAX_RETAINED);
        assert.ok(result.removedCount > 0);
      }
    }
    assert.equal(report.length, 4);
  });
});
