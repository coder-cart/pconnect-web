import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  buildChatHref,
  parseChatConversationHref,
} from './chat-navigation';

describe('buildChatHref', () => {
  it('builds list and conversation URLs', () => {
    assert.equal(buildChatHref(null), '/chat');
    assert.equal(buildChatHref('abc'), '/chat?channel=abc');
    assert.equal(
      buildChatHref('abc', 'msg-1'),
      '/chat?channel=abc&message=msg-1',
    );
  });
});

describe('parseChatConversationHref', () => {
  it('parses channel and message from chat URLs', () => {
    assert.deepEqual(parseChatConversationHref('/chat?channel=c1'), {
      channelId: 'c1',
      messageId: undefined,
    });
    assert.deepEqual(
      parseChatConversationHref('/chat?channel=c1&message=m1'),
      { channelId: 'c1', messageId: 'm1' },
    );
  });

  it('returns null for non-conversation chat links', () => {
    assert.equal(parseChatConversationHref('/chat'), null);
    assert.equal(parseChatConversationHref('/orders'), null);
    assert.equal(parseChatConversationHref('/projects/1'), null);
  });
});
