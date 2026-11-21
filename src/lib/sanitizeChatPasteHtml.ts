import DOMPurify from 'isomorphic-dompurify';
import { isSafeChatHref } from '@/lib/safeChatHref';

const ALLOWED_TAGS = [
  'p',
  'br',
  'div',
  'span',
  'b',
  'strong',
  'i',
  'em',
  'u',
  's',
  'strike',
  'del',
  'a',
  'ul',
  'ol',
  'li',
  'blockquote',
  'pre',
  'code',
  'h1',
  'h2',
  'h3',
  'h4',
  'h5',
  'h6',
  'table',
  'thead',
  'tbody',
  'tr',
  'th',
  'td',
];

const ALLOWED_ATTR = ['href', 'title', 'colspan', 'rowspan', 'class', 'style'];

/** Sanitize clipboard HTML for chat paste. Never trust clipboard content. */
export function sanitizeChatPasteHtml(html: string): string {
  if (!html.trim()) {
    return '';
  }

  const cleaned = DOMPurify.sanitize(html, {
    ALLOWED_TAGS,
    ALLOWED_ATTR,
    ALLOW_DATA_ATTR: false,
    FORBID_TAGS: ['script', 'style', 'iframe', 'object', 'embed', 'form', 'input'],
    FORBID_ATTR: [
      'onerror',
      'onload',
      'onclick',
      'onmouseover',
      'onfocus',
      'onblur',
    ],
  });

  if (typeof document === 'undefined') {
    return cleaned;
  }

  const wrapper = document.createElement('div');
  wrapper.innerHTML = cleaned;

  wrapper.querySelectorAll('a[href]').forEach((anchor) => {
    const href = anchor.getAttribute('href') ?? '';
    if (!isSafeChatHref(href)) {
      anchor.removeAttribute('href');
    }
  });

  // Drop inline colors / alignment; keep decoration hints for normalize step.
  wrapper.querySelectorAll('[style]').forEach((el) => {
    const style = el.getAttribute('style') ?? '';
    const keep: string[] = [];
    if (/font-weight\s*:\s*(bold|[6-9]00)/i.test(style)) {
      keep.push('font-weight:bold');
    }
    if (/font-style\s*:\s*italic/i.test(style)) {
      keep.push('font-style:italic');
    }
    if (/text-decoration[^;]*underline/i.test(style)) {
      keep.push('text-decoration:underline');
    }
    if (/text-decoration[^;]*line-through/i.test(style)) {
      keep.push('text-decoration:line-through');
    }
    if (keep.length > 0) {
      el.setAttribute('style', keep.join(';'));
    } else {
      el.removeAttribute('style');
    }
  });

  return wrapper.innerHTML;
}
