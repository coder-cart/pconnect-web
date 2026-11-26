import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  CHAT_VIRTUOSO_START_INDEX,
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

  it('does not shift when list shrinks', () => {
    const next = nextFirstItemIndexAfterPrepend(
      CHAT_VIRTUOSO_START_INDEX,
      50,
      40,
      'msg-1',
      'msg-10',
    );
    assert.equal(next, CHAT_VIRTUOSO_START_INDEX);
  });
});
