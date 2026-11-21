export const CHAT_LIST_PATH = '/chat';
export const CHAT_CONVERSATION_HISTORY_KEY = 'chatConversation';
export const CHAT_LIST_FRAME_HISTORY_KEY = 'chatListFrame';
export const CHAT_OVERLAY_HISTORY_TOKEN = 'pconnect-chat-overlay';
export const CHAT_ATTACHMENT_SHEET_HISTORY_TOKEN = 'pconnect-attachment-sheet';

type HistoryStateRecord = Record<string, unknown> | null;

type ChatRouter = {
  push: (href: string) => void;
  replace: (href: string) => void;
  back: () => void;
};

export function isMobileChatViewport() {
  return (
    typeof window !== 'undefined' &&
    window.matchMedia('(max-width: 1023px)').matches
  );
}

export function buildChatHref(
  channelId: string | null | undefined,
  messageId?: string | null,
) {
  const params = new URLSearchParams();
  if (channelId) {
    params.set('channel', channelId);
  }
  if (messageId) {
    params.set('message', messageId);
  }
  const query = params.toString();
  return query ? `${CHAT_LIST_PATH}?${query}` : CHAT_LIST_PATH;
}

function readHistoryState(): HistoryStateRecord {
  if (typeof window === 'undefined') return null;
  const state = window.history.state;
  if (!state || typeof state !== 'object') return {};
  return { ...(state as Record<string, unknown>) };
}

/**
 * When mobile lands on `/chat?channel=` without a list frame underneath
 * (deep link, unread, search, notification), rewrite history so Back hits
 * Chat List before the prior section:
 * [..., Orders, /chat?channel=X] → [..., Orders, /chat, /chat?channel=X]
 */
export function ensureMobileChatListUnderConversation(): boolean {
  if (typeof window === 'undefined') return false;
  if (!isMobileChatViewport()) return false;

  const { pathname, search } = window.location;
  if (pathname !== CHAT_LIST_PATH) return false;

  const params = new URLSearchParams(search);
  if (!params.get('channel')) return false;

  const state = readHistoryState() ?? {};
  if (state[CHAT_CONVERSATION_HISTORY_KEY] === true) {
    return false;
  }

  const conversationUrl = `${pathname}${search}${window.location.hash}`;

  window.history.replaceState(
    { ...state, [CHAT_LIST_FRAME_HISTORY_KEY]: true },
    '',
    CHAT_LIST_PATH,
  );
  window.history.pushState(
    { ...state, [CHAT_CONVERSATION_HISTORY_KEY]: true },
    '',
    conversationUrl,
  );

  return true;
}

export function historyHasChatConversationFrame() {
  if (typeof window === 'undefined') return false;
  const state = readHistoryState();
  return state?.[CHAT_CONVERSATION_HISTORY_KEY] === true;
}

/** Tag the current history entry as a stacked mobile conversation frame. */
export function markChatConversationHistoryFrame() {
  if (typeof window === 'undefined') return;
  const state = readHistoryState() ?? {};
  if (state[CHAT_CONVERSATION_HISTORY_KEY] === true) return;
  window.history.replaceState(
    { ...state, [CHAT_CONVERSATION_HISTORY_KEY]: true },
    '',
    `${window.location.pathname}${window.location.search}${window.location.hash}`,
  );
}

/**
 * Dismiss a soft history layer by consuming the pushState entry.
 * Returns true when history.back() was issued.
 */
export function dismissSoftHistoryLayer(tokenKey: string, tokenValue: string) {
  if (typeof window === 'undefined') return false;
  const state = readHistoryState();
  if (state?.[tokenKey] !== tokenValue) return false;
  window.history.back();
  return true;
}

type NavigateToChatOptions = {
  channelId: string;
  messageId?: string | null;
  pathname?: string | null;
  /** True when already viewing a conversation (switch channel). */
  alreadyInConversation?: boolean;
};

/**
 * Device-aware navigation into a chat conversation.
 * - Desktop / already in conversation: replace
 * - Mobile from chat list: push
 * - Outside /chat: push (ChatWorkspace ensure-list inserts the list frame)
 */
export function navigateToChatConversation(
  router: Pick<ChatRouter, 'push' | 'replace'>,
  options: NavigateToChatOptions,
) {
  const href = buildChatHref(options.channelId, options.messageId);
  const pathname = options.pathname ?? '';
  const mobile = isMobileChatViewport();
  const onChat = pathname === CHAT_LIST_PATH || pathname.startsWith(`${CHAT_LIST_PATH}/`);

  if (!mobile) {
    if (onChat) {
      router.replace(href);
    } else {
      router.push(href);
    }
    return { pushedConversation: false as const };
  }

  if (onChat && !options.alreadyInConversation) {
    router.push(href);
    return { pushedConversation: true as const };
  }

  if (onChat && options.alreadyInConversation) {
    router.replace(href);
    return { pushedConversation: false as const };
  }

  router.push(href);
  return { pushedConversation: false as const };
}

export function clearChatConversationUrl(
  router: Pick<ChatRouter, 'back' | 'replace'>,
  options?: { preferBack?: boolean; conversationWasStacked?: boolean },
) {
  const preferBack =
    options?.preferBack !== false &&
    Boolean(options?.conversationWasStacked) &&
    isMobileChatViewport();

  if (preferBack) {
    router.back();
  } else {
    router.replace(CHAT_LIST_PATH);
  }
}

/** Parse `/chat?channel=&message=` hrefs; returns null when not a chat conversation URL. */
export function parseChatConversationHref(href: string): {
  channelId: string;
  messageId?: string;
} | null {
  try {
    const url = new URL(href, 'http://local.invalid');
    if (url.pathname !== CHAT_LIST_PATH && !url.pathname.startsWith(`${CHAT_LIST_PATH}/`)) {
      return null;
    }
    const channelId = url.searchParams.get('channel');
    if (!channelId) return null;
    const messageId = url.searchParams.get('message') ?? undefined;
    return { channelId, messageId };
  } catch {
    return null;
  }
}
