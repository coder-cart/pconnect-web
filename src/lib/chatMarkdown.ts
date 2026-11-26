import { ReactNode, createElement } from 'react';
import { isSafeChatHref } from '@/lib/safeChatHref';
import { expandEmojiShortcutsInText } from '@/lib/emoji-catalog';

const URL_PATTERN = /(https?:\/\/[^\s<]+)/g;

function isHttpUrl(text: string) {
  return /^https?:\/\//.test(text);
}

function safeHref(href: string): string | null {
  const trimmed = href.trim();
  if (!isSafeChatHref(trimmed)) {
    return null;
  }
  return trimmed;
}

function renderInlineMarkdown(text: string, keyPrefix: string): ReactNode[] {
  const pattern =
    /(@\[[^\]]+\]\([^)]+\)|\*\*[^*]+\*\*|__[^_]+__|~~[^~]+~~|`[^`]+`|(?<!\*)\*(?!\*)[^*]+\*(?!\*)|\[[^\]]+\]\([^)]+\))/g;
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
    } else if (token.startsWith('__') && token.endsWith('__')) {
      nodes.push(
        createElement('u', { key, className: 'underline' }, token.slice(2, -2)),
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
        const href = safeHref(linkMatch[2]);
        if (href) {
          nodes.push(
            createElement(
              'a',
              {
                key,
                href,
                target: '_blank',
                rel: 'noopener noreferrer',
                className:
                  'text-[var(--primary)] underline-offset-2 hover:underline',
              },
              linkMatch[1],
            ),
          );
        } else {
          nodes.push(linkMatch[1]);
        }
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

  return parts.map((part, partIndex) => {
    if (isHttpUrl(part) && safeHref(part)) {
      return createElement(
        'a',
        {
          key: `${keyPrefix}-url-${partIndex}`,
          href: part,
          target: '_blank',
          rel: 'noopener noreferrer',
          className: 'text-[var(--primary)] underline-offset-2 hover:underline',
        },
        part,
      );
    }
    return createElement(
      'span',
      { key: `${keyPrefix}-txt-${partIndex}` },
      expandEmojiShortcutsInText(part),
    );
  });
}

/** Plain-text surfaces: `@[Name](id)` → `@Name` (notifications, activity, previews). */
export function formatMentionPlainText(text: string): string {
  return text.replace(/@\[([^\]]+)\]\([^)]+\)/g, '@$1');
}

function isHeadingLine(line: string): RegExpMatchArray | null {
  return /^(#{1,6})\s+(.+)$/.exec(line);
}

function isTableSeparator(line: string): boolean {
  return /^\s*\|?[\s:|-]+\|[\s:|-|]*\|?\s*$/.test(line) && /---/.test(line);
}

function isTableRow(line: string): boolean {
  return line.includes('|') && line.trim().length > 0;
}

function splitTableRow(line: string): string[] {
  const trimmed = line.trim().replace(/^\|/, '').replace(/\|$/, '');
  return trimmed.split('|').map((cell) => cell.trim());
}

function headingClass(level: number): string {
  switch (level) {
    case 1:
      return 'text-base font-semibold';
    case 2:
      return 'text-sm font-semibold';
    default:
      return 'text-sm font-medium';
  }
}

function isBlockStart(line: string): boolean {
  return (
    line.startsWith('```') ||
    line.startsWith('> ') ||
    /^\d+\.\s/.test(line) ||
    line.startsWith('- ') ||
    Boolean(isHeadingLine(line)) ||
    (isTableRow(line) && line.includes('|'))
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

    const heading = isHeadingLine(line);
    if (heading) {
      const level = Math.min(heading[1].length, 6);
      const tag = `h${level}` as 'h1' | 'h2' | 'h3' | 'h4' | 'h5' | 'h6';
      blocks.push(
        createElement(
          tag,
          {
            key: `h-${index}`,
            className: headingClass(level),
          },
          renderInlineMarkdown(heading[2], `h-${index}`),
        ),
      );
      index += 1;
      continue;
    }

    if (
      isTableRow(line) &&
      index + 1 < lines.length &&
      isTableSeparator(lines[index + 1])
    ) {
      const headerCells = splitTableRow(line);
      index += 2;
      const bodyRows: string[][] = [];
      while (index < lines.length && isTableRow(lines[index]) && !isTableSeparator(lines[index])) {
        bodyRows.push(splitTableRow(lines[index]));
        index += 1;
      }
      blocks.push(
        createElement(
          'div',
          {
            key: `table-wrap-${index}`,
            className: 'overflow-x-auto',
          },
          createElement(
            'table',
            {
              className:
                'w-full border-collapse text-left text-xs [&_td]:border [&_td]:border-[var(--border)] [&_td]:px-2 [&_td]:py-1 [&_th]:border [&_th]:border-[var(--border)] [&_th]:bg-[var(--surface-muted)] [&_th]:px-2 [&_th]:py-1 [&_th]:font-medium',
            },
            createElement(
              'thead',
              null,
              createElement(
                'tr',
                null,
                headerCells.map((cell, cellIndex) =>
                  createElement(
                    'th',
                    { key: `th-${cellIndex}` },
                    renderInlineMarkdown(cell, `th-${index}-${cellIndex}`),
                  ),
                ),
              ),
            ),
            createElement(
              'tbody',
              null,
              bodyRows.map((row, rowIndex) =>
                createElement(
                  'tr',
                  { key: `tr-${rowIndex}` },
                  row.map((cell, cellIndex) =>
                    createElement(
                      'td',
                      { key: `td-${rowIndex}-${cellIndex}` },
                      renderInlineMarkdown(
                        cell,
                        `td-${index}-${rowIndex}-${cellIndex}`,
                      ),
                    ),
                  ),
                ),
              ),
            ),
          ),
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
      blocks.push(
        createElement('div', {
          key: `gap-${index}`,
          className: 'h-2',
          'aria-hidden': true,
        }),
      );
      index += 1;
      continue;
    }

    const paragraphLines: string[] = [line];
    index += 1;
    while (
      index < lines.length &&
      lines[index].trim().length > 0 &&
      !isBlockStart(lines[index])
    ) {
      // Do not swallow table header+separator as paragraph text.
      if (
        isTableRow(lines[index]) &&
        index + 1 < lines.length &&
        isTableSeparator(lines[index + 1])
      ) {
        break;
      }
      paragraphLines.push(lines[index]);
      index += 1;
    }

    blocks.push(
      createElement(
        'p',
        {
          key: `p-${index}`,
          // Reset UA paragraph margins so reactions sit tight under short messages.
          className: 'm-0 whitespace-pre-wrap break-words',
        },
        paragraphLines.flatMap((paragraphLine, paragraphIndex) => {
          const nodes = renderInlineMarkdown(
            paragraphLine,
            `p-${index}-${paragraphIndex}`,
          );
          if (paragraphIndex < paragraphLines.length - 1) {
            return [
              ...nodes,
              createElement('br', { key: `br-${index}-${paragraphIndex}` }),
            ];
          }
          return nodes;
        }),
      ),
    );
  }

  return createElement('div', { className: 'space-y-1 text-sm' }, blocks);
}

function isBlockMarkdownElement(node: Node): boolean {
  if (node.nodeType !== Node.ELEMENT_NODE) return false;
  const tag = (node as HTMLElement).tagName.toLowerCase();
  return (
    tag === 'div' ||
    tag === 'p' ||
    tag === 'br' ||
    tag === 'li' ||
    tag === 'ul' ||
    tag === 'ol' ||
    tag === 'pre' ||
    tag === 'blockquote' ||
    tag === 'table' ||
    /^h[1-6]$/.test(tag)
  );
}

/**
 * Contenteditable often keeps the first line as a bare text node and later
 * lines as sibling <div>s. Join with newlines so "a" + <div>b</div> becomes
 * "a\nb" instead of "ab".
 */
export function htmlToMarkdown(root: HTMLElement): string {
  const parts: string[] = [];

  for (const node of Array.from(root.childNodes)) {
    const chunk = nodeToMarkdown(node);
    if (!chunk) continue;

    if (
      parts.length > 0 &&
      isBlockMarkdownElement(node) &&
      !parts[parts.length - 1]!.endsWith('\n')
    ) {
      parts.push('\n');
    }

    parts.push(chunk);
  }

  return parts.join('').replace(/\n{3,}/g, '\n\n').trim();
}

function escapeTableCell(text: string): string {
  return text.replace(/\|/g, '\\|').replace(/\n+/g, ' ').trim();
}

function tableToMarkdown(element: HTMLElement): string {
  const rows = Array.from(element.querySelectorAll('tr'));
  if (rows.length === 0) {
    return Array.from(element.childNodes).map(nodeToMarkdown).join('');
  }

  const matrix = rows.map((row) =>
    Array.from(row.querySelectorAll('th,td')).map((cell) =>
      escapeTableCell(nodeToMarkdown(cell)),
    ),
  );

  const hasColspan = rows.some((row) =>
    Array.from(row.querySelectorAll('th,td')).some(
      (cell) => Number(cell.getAttribute('colspan') ?? '1') > 1,
    ),
  );

  if (hasColspan || matrix.some((row) => row.length === 0)) {
    return matrix.map((row) => row.join('\t')).join('\n') + '\n';
  }

  const width = Math.max(...matrix.map((row) => row.length));
  const normalized = matrix.map((row) => {
    const next = [...row];
    while (next.length < width) next.push('');
    return next;
  });

  const header = normalized[0];
  const body = normalized.slice(1);
  const separator = header.map(() => '---');
  const lines = [
    `| ${header.join(' | ')} |`,
    `| ${separator.join(' | ')} |`,
    ...body.map((row) => `| ${row.join(' | ')} |`),
  ];
  return `${lines.join('\n')}\n`;
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
    case 'u':
      return childText ? `__${childText}__` : '';
    case 's':
    case 'strike':
    case 'del':
      return childText ? `~~${childText}~~` : '';
    case 'code':
      return element.closest('pre')
        ? childText
        : childText
          ? `\`${childText}\``
          : '';
    case 'a': {
      const href = element.getAttribute('href') ?? '';
      const safe = safeHref(href);
      if (!safe) {
        return childText;
      }
      return childText ? `[${childText}](${safe})` : safe;
    }
    case 'br':
      return '\n';
    case 'h1':
    case 'h2':
    case 'h3':
    case 'h4':
    case 'h5':
    case 'h6': {
      const level = Number(tag.slice(1));
      const text = childText.replace(/\n+/g, ' ').trim();
      return text ? `${'#'.repeat(level)} ${text}\n` : '';
    }
    case 'blockquote':
      return childText
        .split('\n')
        .filter((line) => line.length > 0)
        .map((line) => `> ${line}`)
        .join('\n');
    case 'ul':
      return (
        Array.from(element.children)
          .map((item) => `- ${nodeToMarkdown(item).trim()}`)
          .join('\n') + '\n'
      );
    case 'ol':
      return (
        Array.from(element.children)
          .map(
            (item, itemIndex) =>
              `${itemIndex + 1}. ${nodeToMarkdown(item).trim()}`,
          )
          .join('\n') + '\n'
      );
    case 'li':
      return childText;
    case 'pre':
      return `\`\`\`\n${childText.trim()}\n\`\`\`\n`;
    case 'table':
      return tableToMarkdown(element);
    case 'thead':
    case 'tbody':
    case 'tr':
    case 'th':
    case 'td':
      return childText;
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
