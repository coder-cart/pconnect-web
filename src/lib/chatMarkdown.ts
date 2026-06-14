import { ReactNode, createElement } from 'react';

const URL_PATTERN = /(https?:\/\/[^\s<]+)/g;

function isHttpUrl(text: string) {
  return /^https?:\/\//.test(text);
}

function renderInlineMarkdown(text: string, keyPrefix: string): ReactNode[] {
  const pattern =
    /(@\[[^\]]+\]\([^)]+\)|\*\*[^*]+\*\*|~~[^~]+~~|`[^`]+`|(?<!\*)\*(?!\*)[^*]+\*(?!\*)|\[[^\]]+\]\([^)]+\))/g;
  const nodes: ReactNode[] = [];
  let lastIndex = 0;
  let match: RegExpExecArray | null;
  let index = 0;

  while ((match = pattern.exec(text)) !== null) {
    if (match.index > lastIndex) {
      nodes.push(
        ...renderPlainTextWithLinks(
          text.slice(lastIndex, match.index),
          `${keyPrefix}-plain-${index}`,
        ),
      );
    }

    const token = match[0];
    const key = `${keyPrefix}-md-${index}`;

    if (token.startsWith('@[')) {
      const mentionMatch = token.match(/^@\[([^\]]+)\]\(([^)]+)\)$/);
      if (mentionMatch) {
        nodes.push(
          createElement(
            'span',
            {
              key,
              className:
                'rounded bg-[var(--primary-soft)] px-1 py-0.5 font-medium text-[var(--primary)]',
            },
            `@${mentionMatch[1]}`,
          ),
        );
      } else {
        nodes.push(token);
      }
    } else if (token.startsWith('**') && token.endsWith('**')) {
      nodes.push(
        createElement(
          'strong',
          { key, className: 'font-semibold' },
          token.slice(2, -2),
        ),
      );
    } else if (token.startsWith('~~') && token.endsWith('~~')) {
      nodes.push(
        createElement('s', { key, className: 'line-through' }, token.slice(2, -2)),
      );
    } else if (token.startsWith('`') && token.endsWith('`')) {
      nodes.push(
        createElement(
          'code',
          {
            key,
            className:
              'rounded bg-[var(--surface-muted)] px-1 py-0.5 font-mono text-[0.85em]',
          },
          token.slice(1, -1),
        ),
      );
    } else if (token.startsWith('*') && token.endsWith('*')) {
      nodes.push(
        createElement('em', { key, className: 'italic' }, token.slice(1, -1)),
      );
    } else if (token.startsWith('[')) {
      const linkMatch = token.match(/^\[([^\]]+)\]\(([^)]+)\)$/);
      if (linkMatch) {
        nodes.push(
          createElement(
            'a',
            {
              key,
              href: linkMatch[2],
              target: '_blank',
              rel: 'noopener noreferrer',
              className: 'text-[var(--primary)] underline-offset-2 hover:underline',
            },
            linkMatch[1],
          ),
        );
      } else {
        nodes.push(token);
      }
    } else {
      nodes.push(token);
    }

    lastIndex = pattern.lastIndex;
    index += 1;
  }

  if (lastIndex < text.length) {
    nodes.push(
      ...renderPlainTextWithLinks(text.slice(lastIndex), `${keyPrefix}-tail`),
    );
  }

  return nodes;
}

function renderPlainTextWithLinks(text: string, keyPrefix: string): ReactNode[] {
  const parts = text.split(URL_PATTERN).filter((part) => part.length > 0);

  return parts.map((part, partIndex) =>
    isHttpUrl(part)
      ? createElement(
          'a',
          {
            key: `${keyPrefix}-url-${partIndex}`,
            href: part,
            target: '_blank',
            rel: 'noopener noreferrer',
            className: 'text-[var(--primary)] underline-offset-2 hover:underline',
          },
          part,
        )
      : createElement('span', { key: `${keyPrefix}-txt-${partIndex}` }, part),
  );
}

export function renderMarkdownBody(text: string): ReactNode {
  const lines = text.replace(/\r\n/g, '\n').split('\n');
  const blocks: ReactNode[] = [];
  let index = 0;

  while (index < lines.length) {
    const line = lines[index];

    if (line.startsWith('```')) {
      const codeLines: string[] = [];
      index += 1;
      while (index < lines.length && !lines[index].startsWith('```')) {
        codeLines.push(lines[index]);
        index += 1;
      }
      index += 1;
      blocks.push(
        createElement(
          'pre',
          {
            key: `code-${index}`,
            className:
              'overflow-x-auto rounded-[var(--radius-md)] bg-[var(--surface-muted)] p-3 font-mono text-xs',
          },
          createElement('code', null, codeLines.join('\n')),
        ),
      );
      continue;
    }

    if (line.startsWith('> ')) {
      blocks.push(
        createElement(
          'blockquote',
          {
            key: `quote-${index}`,
            className:
              'border-l-2 border-[var(--border)] pl-3 text-[var(--muted-foreground)]',
          },
          renderInlineMarkdown(line.slice(2), `quote-${index}`),
        ),
      );
      index += 1;
      continue;
    }

    if (/^\d+\.\s/.test(line)) {
      const items: ReactNode[] = [];
      while (index < lines.length && /^\d+\.\s/.test(lines[index])) {
        items.push(
          createElement(
            'li',
            { key: `ol-${index}` },
            renderInlineMarkdown(
              lines[index].replace(/^\d+\.\s/, ''),
              `ol-${index}`,
            ),
          ),
        );
        index += 1;
      }
      blocks.push(
        createElement(
          'ol',
          { key: `ol-block-${index}`, className: 'list-decimal space-y-1 pl-5' },
          items,
        ),
      );
      continue;
    }

    if (line.startsWith('- ')) {
      const items: ReactNode[] = [];
      while (index < lines.length && lines[index].startsWith('- ')) {
        items.push(
          createElement(
            'li',
            { key: `ul-${index}` },
            renderInlineMarkdown(lines[index].slice(2), `ul-${index}`),
          ),
        );
        index += 1;
      }
      blocks.push(
        createElement(
          'ul',
          { key: `ul-block-${index}`, className: 'list-disc space-y-1 pl-5' },
          items,
        ),
      );
      continue;
    }

    if (line.trim().length === 0) {
      index += 1;
      continue;
    }

    blocks.push(
      createElement(
        'p',
        { key: `p-${index}`, className: 'whitespace-pre-wrap break-words' },
        renderInlineMarkdown(line, `p-${index}`),
      ),
    );
    index += 1;
  }

  return createElement('div', { className: 'space-y-2 text-sm' }, blocks);
}

export function htmlToMarkdown(root: HTMLElement): string {
  return Array.from(root.childNodes)
    .map((node) => nodeToMarkdown(node))
    .join('')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

function nodeToMarkdown(node: Node): string {
  if (node.nodeType === Node.TEXT_NODE) {
    return node.textContent ?? '';
  }

  if (node.nodeType !== Node.ELEMENT_NODE) {
    return '';
  }

  const element = node as HTMLElement;
  const tag = element.tagName.toLowerCase();
  const childText = Array.from(element.childNodes).map(nodeToMarkdown).join('');

  switch (tag) {
    case 'strong':
    case 'b':
      return childText ? `**${childText}**` : '';
    case 'em':
    case 'i':
      return childText ? `*${childText}*` : '';
    case 's':
    case 'strike':
    case 'del':
      return childText ? `~~${childText}~~` : '';
    case 'code':
      return childText ? `\`${childText}\`` : '';
    case 'a': {
      const href = element.getAttribute('href') ?? '';
      return childText ? `[${childText}](${href})` : href;
    }
    case 'br':
      return '\n';
    case 'blockquote':
      return childText
        .split('\n')
        .filter((line) => line.length > 0)
        .map((line) => `> ${line}`)
        .join('\n');
    case 'ul':
      return Array.from(element.children)
        .map((item) => `- ${nodeToMarkdown(item).trim()}`)
        .join('\n');
    case 'ol':
      return Array.from(element.children)
        .map((item, itemIndex) => `${itemIndex + 1}. ${nodeToMarkdown(item).trim()}`)
        .join('\n');
    case 'li':
      return childText;
    case 'pre':
      return `\`\`\`\n${childText.trim()}\n\`\`\``;
    case 'span': {
      const mentionId = element.dataset.mentionId;
      const mentionName = element.dataset.mentionName;
      if (mentionId && mentionName) {
        return `@[${mentionName}](${mentionId})`;
      }
      return childText;
    }
    case 'div':
    case 'p':
      return childText.endsWith('\n') ? childText : `${childText}\n`;
    default:
      return childText;
  }
}

export function getMentionContext(editor: HTMLElement): {
  query: string;
  mentionRange: Range;
} | null {
  const selection = window.getSelection();
  if (!selection?.rangeCount || !selection.isCollapsed) {
    return null;
  }

  const cursorRange = selection.getRangeAt(0);
  if (!editor.contains(cursorRange.startContainer)) {
    return null;
  }

  const preRange = cursorRange.cloneRange();
  preRange.selectNodeContents(editor);
  preRange.setEnd(cursorRange.startContainer, cursorRange.startOffset);
  const textBefore = preRange.toString();

  const atIndex = textBefore.lastIndexOf('@');
  if (atIndex === -1) {
    return null;
  }

  const query = textBefore.slice(atIndex + 1);
  if (/[\s\n]/.test(query)) {
    return null;
  }

  const mentionRange = createRangeAtCharacterOffset(
    editor,
    atIndex,
    textBefore.length,
  );

  if (!mentionRange) {
    return null;
  }

  return { query, mentionRange };
}

function createRangeAtCharacterOffset(
  root: HTMLElement,
  start: number,
  end: number,
): Range | null {
  const range = document.createRange();
  let charIndex = 0;
  let startSet = false;

  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
    acceptNode: (node) => {
      const parent = node.parentElement;
      if (parent?.closest('[data-mention-id]')) {
        return NodeFilter.FILTER_REJECT;
      }
      return NodeFilter.FILTER_ACCEPT;
    },
  });

  let node: Text | null;
  while ((node = walker.nextNode() as Text | null)) {
    const nodeText = node.textContent ?? '';
    const nodeStart = charIndex;
    const nodeEnd = charIndex + nodeText.length;

    if (!startSet && start >= nodeStart && start <= nodeEnd) {
      range.setStart(node, start - nodeStart);
      startSet = true;
    }

    if (startSet && end >= nodeStart && end <= nodeEnd) {
      range.setEnd(node, end - nodeStart);
      return range;
    }

    charIndex = nodeEnd;
  }

  return null;
}

export function insertMentionSpan(
  editor: HTMLElement,
  mentionRange: Range,
  member: { id: string; fullName: string },
) {
  mentionRange.deleteContents();

  const span = document.createElement('span');
  span.contentEditable = 'false';
  span.dataset.mentionId = member.id;
  span.dataset.mentionName = member.fullName;
  span.className =
    'rounded bg-[var(--primary-soft)] px-1 py-0.5 font-medium text-[var(--primary)]';
  span.textContent = `@${member.fullName}`;

  const space = document.createTextNode('\u00a0');
  mentionRange.insertNode(space);
  mentionRange.insertNode(span);

  const selection = window.getSelection();
  const cursorRange = document.createRange();
  cursorRange.setStartAfter(space);
  cursorRange.collapse(true);
  selection?.removeAllRanges();
  selection?.addRange(cursorRange);

  editor.dispatchEvent(new Event('input', { bubbles: true }));
}

export function isEditorEmpty(element: HTMLElement | null): boolean {
  if (!element) return true;
  const text = element.innerText.replace(/\u00a0/g, ' ').trim();
  return text.length === 0;
}
