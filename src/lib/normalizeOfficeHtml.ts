/**
 * Normalize Word / Google Docs / Outlook HTML into semantic tags the
 * chat markdown converter understands.
 */
export function normalizeOfficeHtml(root: HTMLElement): void {
  // Unwrap Word `o:p` placeholders. Do not use querySelector('o:p') —
  // the colon is parsed as a CSS pseudo-class and throws SyntaxError.
  Array.from(root.getElementsByTagName('o:p')).forEach((node) => {
    node.replaceWith(...Array.from(node.childNodes));
  });

  root.querySelectorAll('span').forEach((span) => {
    const style = span.getAttribute('style') ?? '';
    const className = span.getAttribute('class') ?? '';
    if (
      !style &&
      !className &&
      !(span.textContent ?? '').replace(/\u00a0/g, ' ').trim()
    ) {
      span.replaceWith(...Array.from(span.childNodes));
    }
  });

  promoteStyledSpans(root);
  convertMsoListParagraphs(root);
}

function promoteStyledSpans(root: HTMLElement) {
  const candidates = Array.from(
    root.querySelectorAll('span, p, div, font, b, i'),
  ) as HTMLElement[];

  for (const el of candidates) {
    const style = (el.getAttribute('style') ?? '').toLowerCase();
    const tag = el.tagName.toLowerCase();

    const wantsBold =
      /font-weight\s*:\s*(bold|[6-9]00)/.test(style) ||
      tag === 'b' ||
      el.classList.contains('Bold');
    const wantsItalic =
      /font-style\s*:\s*italic/.test(style) ||
      tag === 'i' ||
      el.classList.contains('Italic');
    const wantsUnderline = /text-decoration[^;]*underline/.test(style);
    const wantsStrike = /text-decoration[^;]*line-through/.test(style);

    if (tag === 'span' || tag === 'font' || tag === 'p' || tag === 'div') {
      if (wantsBold && !el.querySelector('strong,b')) {
        wrapContents(el, 'strong');
      }
      if (wantsItalic && !el.querySelector('em,i')) {
        wrapContents(el, 'em');
      }
      if (wantsUnderline && !el.querySelector('u')) {
        wrapContents(el, 'u');
      }
      if (wantsStrike && !el.querySelector('s,strike,del')) {
        wrapContents(el, 's');
      }
    }

    el.removeAttribute('style');
  }
}

function wrapContents(el: HTMLElement, tagName: string) {
  if (!el.childNodes.length) {
    return;
  }
  const wrapper = el.ownerDocument.createElement(tagName);
  while (el.firstChild) {
    wrapper.appendChild(el.firstChild);
  }
  el.appendChild(wrapper);
}

/**
 * Word often emits paragraphs with class MsoListParagraph instead of ul/ol.
 * Convert consecutive list paragraphs into real lists when markers are present.
 */
function convertMsoListParagraphs(root: HTMLElement) {
  const blocks = Array.from(root.children) as HTMLElement[];
  let index = 0;

  while (index < blocks.length) {
    const el = blocks[index];
    if (!isMsoListParagraph(el)) {
      index += 1;
      continue;
    }

    const group: HTMLElement[] = [];
    while (index < blocks.length && isMsoListParagraph(blocks[index])) {
      group.push(blocks[index]);
      index += 1;
    }

    const ordered = group.every((item) => detectListKind(item) === 'ol');
    const list = root.ownerDocument.createElement(ordered ? 'ol' : 'ul');

    for (const item of group) {
      const li = root.ownerDocument.createElement('li');
      stripListMarker(item);
      while (item.firstChild) {
        li.appendChild(item.firstChild);
      }
      list.appendChild(li);
      item.remove();
    }

    const insertBefore = blocks[index] ?? null;
    if (insertBefore && insertBefore.parentElement === root) {
      root.insertBefore(list, insertBefore);
    } else {
      root.appendChild(list);
    }
  }
}

function isMsoListParagraph(el: HTMLElement): boolean {
  const className = el.getAttribute('class') ?? '';
  if (/msoListParagraph/i.test(className)) {
    return true;
  }
  const text = (el.textContent ?? '').replace(/\u00a0/g, ' ').trim();
  return /^([•·◦▪▫●○]|[-*]|\d+[.)])\s+/.test(text);
}

function detectListKind(el: HTMLElement): 'ul' | 'ol' {
  const text = (el.textContent ?? '').replace(/\u00a0/g, ' ').trim();
  if (/^\d+[.)]\s+/.test(text)) {
    return 'ol';
  }
  const style = (el.getAttribute('style') ?? '').toLowerCase();
  if (/mso-list/i.test(style) && /level\d+/i.test(style)) {
    // Word numbered lists still often use bullets in text; prefer ol when digit marker.
    return /^\d+[.)]/.test(text) ? 'ol' : 'ul';
  }
  return 'ul';
}

function stripListMarker(el: HTMLElement) {
  const walker = el.ownerDocument.createTreeWalker(el, NodeFilter.SHOW_TEXT);
  const first = walker.nextNode() as Text | null;
  if (!first?.textContent) {
    return;
  }
  first.textContent = first.textContent
    .replace(/^\s*([•·◦▪▫●○]|[-*]|\d+[.)])\s+/, '')
    .replace(/^\u00a0+/, '');
}
