import { htmlToMarkdown } from '@/lib/chatMarkdown';
import { normalizeOfficeHtml } from '@/lib/normalizeOfficeHtml';
import { sanitizeChatPasteHtml } from '@/lib/sanitizeChatPasteHtml';

/**
 * Convert clipboard HTML into Colabdeck chat markdown.
 * Returns both markdown (for storage path) and sanitized HTML (for WYSIWYG insert).
 */
export function clipboardHtmlToMarkdown(html: string): {
  markdown: string;
  safeHtml: string;
} {
  const sanitized = sanitizeChatPasteHtml(html);
  if (!sanitized.trim()) {
    return { markdown: '', safeHtml: '' };
  }

  if (typeof document === 'undefined') {
    return { markdown: '', safeHtml: sanitized };
  }

  const container = document.createElement('div');
  container.innerHTML = sanitized;
  normalizeOfficeHtml(container);
  const safeHtml = container.innerHTML;
  const markdown = htmlToMarkdown(container);
  return { markdown, safeHtml };
}
