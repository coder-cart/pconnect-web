import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  CHAT_VIRTUOSO_START_INDEX,
  nextFirstItemIndexAfterFrontEvict,
  nextFirstItemIndexAfterMessagesChange,
  nextFirstItemIndexAfterPrepend,
} from './chatVirtualization';

describe('chat virtualization prepend index', () => {
  it('shifts firstItemIndex backward by prepended count', () => {
    const next = nextFirstItemIndexAfterPrepend(
      CHAT_VIRTUOSO_START_INDEX,
      50,
      100,
      'msg-50',
      'msg-1',
    );
    assert.equal(next, CHAT_VIRTUOSO_START_INDEX - 50);
  });

  it('does not shift on append / same head', () => {
    const next = nextFirstItemIndexAfterPrepend(
      CHAT_VIRTUOSO_START_INDEX,
      50,
      51,
      'msg-1',
      'msg-1',
    );
    assert.equal(next, CHAT_VIRTUOSO_START_INDEX);
  });

  it('does not shift on mid-list shrink with same head (prepend helper)', () => {
    const next = nextFirstItemIndexAfterPrepend(
      CHAT_VIRTUOSO_START_INDEX,
      50,
      40,
      'msg-1',
      'msg-1',
    );
    assert.equal(next, CHAT_VIRTUOSO_START_INDEX);
  });
});

describe('chat virtualization front eviction index', () => {
  it('shifts firstItemIndex forward by removed count', () => {
    const next = nextFirstItemIndexAfterFrontEvict(
      CHAT_VIRTUOSO_START_INDEX - 100,
      50,
    );
    assert.equal(next, CHAT_VIRTUOSO_START_INDEX - 50);
  });

  it('messages-change helper prepends and front-evicts correctly', () => {
    const afterPrepend = nextFirstItemIndexAfterMessagesChange(
      CHAT_VIRTUOSO_START_INDEX,
      50,
      100,
      'msg-50',
      'msg-1',
    );
    assert.equal(afterPrepend, CHAT_VIRTUOSO_START_INDEX - 50);

    const afterEvict = nextFirstItemIndexAfterMessagesChange(
      afterPrepend,
      100,
      50,
      'msg-1',
      'msg-51',
    );
    assert.equal(afterEvict, CHAT_VIRTUOSO_START_INDEX);

    const midDelete = nextFirstItemIndexAfterMessagesChange(
      CHAT_VIRTUOSO_START_INDEX,
      50,
      49,
      'msg-1',
      'msg-1',
    );
    assert.equal(midDelete, CHAT_VIRTUOSO_START_INDEX);
  });
});
