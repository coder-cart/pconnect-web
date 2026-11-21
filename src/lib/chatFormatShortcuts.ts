export type ChatFormatAction =
  | 'bold'
  | 'italic'
  | 'underline'
  | 'strike'
  | 'link'
  | 'orderedList'
  | 'unorderedList'
  | 'blockquote'
  | 'codeBlock';

export interface ChatFormatShortcutMeta {
  action: ChatFormatAction;
  label: string;
  /** Human-readable hint for title tooltips (uses ⌘ on Apple, Ctrl elsewhere). */
  shortcutLabel: string;
  /** W3C aria-keyshortcuts tokens (Control on Win/Linux, Meta on Apple). */
  ariaKeyshortcuts: string;
}

function isApplePlatform() {
  if (typeof navigator === 'undefined') {
    return false;
  }
  return /Mac|iPhone|iPad|iPod/i.test(navigator.platform || navigator.userAgent);
}

export function getChatFormatShortcutMeta(): ChatFormatShortcutMeta[] {
  const apple = isApplePlatform();
  const mod = apple ? '⌘' : 'Ctrl';
  const ariaMod = apple ? 'Meta' : 'Control';

  return [
    {
      action: 'bold',
      label: 'Bold',
      shortcutLabel: `${mod}+B`,
      ariaKeyshortcuts: `${ariaMod}+B`,
    },
    {
      action: 'italic',
      label: 'Italic',
      shortcutLabel: `${mod}+I`,
      ariaKeyshortcuts: `${ariaMod}+I`,
    },
    {
      action: 'underline',
      label: 'Underline',
      shortcutLabel: `${mod}+U`,
      ariaKeyshortcuts: `${ariaMod}+U`,
    },
    {
      action: 'strike',
      label: 'Strikethrough',
      shortcutLabel: `${mod}+Shift+X`,
      ariaKeyshortcuts: `${ariaMod}+Shift+X`,
    },
    {
      action: 'link',
      label: 'Link',
      shortcutLabel: `${mod}+K`,
      ariaKeyshortcuts: `${ariaMod}+K`,
    },
    {
      action: 'orderedList',
      label: 'Numbered list',
      shortcutLabel: `${mod}+Shift+7`,
      ariaKeyshortcuts: `${ariaMod}+Shift+7`,
    },
    {
      action: 'unorderedList',
      label: 'Bulleted list',
      shortcutLabel: `${mod}+Shift+8`,
      ariaKeyshortcuts: `${ariaMod}+Shift+8`,
    },
    {
      action: 'blockquote',
      label: 'Blockquote',
      shortcutLabel: `${mod}+Shift+9`,
      ariaKeyshortcuts: `${ariaMod}+Shift+9`,
    },
    {
      action: 'codeBlock',
      label: 'Code block',
      shortcutLabel: `${mod}+Shift+C`,
      ariaKeyshortcuts: `${ariaMod}+Shift+C`,
    },
  ];
}

/** Match Slack-style format shortcuts. Returns null when no format combo. */
export function matchChatFormatShortcut(event: {
  key: string;
  code?: string;
  ctrlKey: boolean;
  metaKey: boolean;
  shiftKey: boolean;
  altKey?: boolean;
}): ChatFormatAction | null {
  const mod = event.metaKey || event.ctrlKey;
  if (!mod || event.altKey) {
    return null;
  }

  const key = event.key.length === 1 ? event.key.toLowerCase() : event.key;
  const code = event.code ?? '';

  if (!event.shiftKey) {
    if (key === 'b' || code === 'KeyB') return 'bold';
    if (key === 'i' || code === 'KeyI') return 'italic';
    if (key === 'u' || code === 'KeyU') return 'underline';
    if (key === 'k' || code === 'KeyK') return 'link';
    return null;
  }

  if (key === 'x' || code === 'KeyX') return 'strike';
  if (key === 'c' || code === 'KeyC') return 'codeBlock';
  if (key === '7' || code === 'Digit7') return 'orderedList';
  if (key === '8' || code === 'Digit8') return 'unorderedList';
  if (key === '9' || code === 'Digit9') return 'blockquote';

  return null;
}

function wrapInline(
  value: string,
  start: number,
  end: number,
  before: string,
  after: string,
  placeholder = 'text',
): { value: string; selectionStart: number; selectionEnd: number } {
  const selected = value.slice(start, end);
  const inner = selected.length > 0 ? selected : placeholder;
  const next = `${value.slice(0, start)}${before}${inner}${after}${value.slice(end)}`;
  if (selected.length > 0) {
    return {
      value: next,
      selectionStart: start,
      selectionEnd: start + before.length + inner.length + after.length,
    };
  }
  return {
    value: next,
    selectionStart: start + before.length,
    selectionEnd: start + before.length + inner.length,
  };
}

function prefixSelectedLines(
  value: string,
  start: number,
  end: number,
  prefixForIndex: (index: number) => string,
): { value: string; selectionStart: number; selectionEnd: number } {
  const lineStart = value.lastIndexOf('\n', Math.max(0, start - 1)) + 1;
  const lineEndSearch = value.indexOf('\n', end);
  const lineEnd = lineEndSearch === -1 ? value.length : lineEndSearch;
  const block = value.slice(lineStart, lineEnd);
  const lines = block.split('\n');
  const rewritten = lines
    .map((line, index) => {
      const prefix = prefixForIndex(index);
      if (line.startsWith(prefix)) {
        return line;
      }
      // Strip alternate list/quote markers when switching styles.
      const stripped = line
        .replace(/^>\s?/, '')
        .replace(/^[-*]\s+/, '')
        .replace(/^\d+\.\s+/, '');
      return `${prefix}${stripped}`;
    })
    .join('\n');
  const next = `${value.slice(0, lineStart)}${rewritten}${value.slice(lineEnd)}`;
  return {
    value: next,
    selectionStart: lineStart,
    selectionEnd: lineStart + rewritten.length,
  };
}

/**
 * Apply a format action to a markdown textarea selection.
 * For `link`, pass `linkUrl` from a prompt; if omitted/empty, returns the input unchanged.
 */
export function wrapMarkdownSelection(
  value: string,
  selectionStart: number,
  selectionEnd: number,
  action: ChatFormatAction,
  linkUrl?: string,
): { value: string; selectionStart: number; selectionEnd: number } {
  const start = Math.min(selectionStart, selectionEnd);
  const end = Math.max(selectionStart, selectionEnd);

  switch (action) {
    case 'bold':
      return wrapInline(value, start, end, '**', '**');
    case 'italic':
      return wrapInline(value, start, end, '*', '*');
    case 'underline':
      return wrapInline(value, start, end, '__', '__');
    case 'strike':
      return wrapInline(value, start, end, '~~', '~~');
    case 'link': {
      const url = linkUrl?.trim();
      if (!url) {
        return { value, selectionStart: start, selectionEnd: end };
      }
      const selected = value.slice(start, end);
      const label = selected.length > 0 ? selected : 'link';
      const inserted = `[${label}](${url})`;
      const next = `${value.slice(0, start)}${inserted}${value.slice(end)}`;
      return {
        value: next,
        selectionStart: start,
        selectionEnd: start + inserted.length,
      };
    }
    case 'codeBlock': {
      const selected = value.slice(start, end);
      const inner = selected.length > 0 ? selected : 'code';
      const fence = `\`\`\`\n${inner}\n\`\`\``;
      const next = `${value.slice(0, start)}${fence}${value.slice(end)}`;
      if (selected.length > 0) {
        return {
          value: next,
          selectionStart: start,
          selectionEnd: start + fence.length,
        };
      }
      return {
        value: next,
        selectionStart: start + 4,
        selectionEnd: start + 4 + inner.length,
      };
    }
    case 'orderedList':
      return prefixSelectedLines(
        value,
        start,
        end,
        (index) => `${index + 1}. `,
      );
    case 'unorderedList':
      return prefixSelectedLines(value, start, end, () => '- ');
    case 'blockquote':
      return prefixSelectedLines(value, start, end, () => '> ');
    default: {
      const _exhaustive: never = action;
      return _exhaustive;
    }
  }
}
