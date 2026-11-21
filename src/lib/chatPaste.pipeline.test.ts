import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { JSDOM } from 'jsdom';
import { clipboardHtmlToMarkdown } from './clipboardHtmlToMarkdown';
import { htmlToMarkdown, renderMarkdownBody } from './chatMarkdown';
import { sanitizeChatPasteHtml } from './sanitizeChatPasteHtml';

function withDom<T>(fn: () => T): T {
  const dom = new JSDOM('<!doctype html><html><body></body></html>');
  const g = globalThis as typeof globalThis & {
    window: unknown;
    document: unknown;
    Node: unknown;
    NodeFilter: unknown;
    HTMLElement: unknown;
    Element: unknown;
  };
  const previous = {
    window: g.window,
    document: g.document,
    Node: g.Node,
    NodeFilter: g.NodeFilter,
    HTMLElement: g.HTMLElement,
    Element: g.Element,
  };
  // isomorphic-dompurify / DOM APIs need browser globals.
  g.window = dom.window;
  g.document = dom.window.document;
  g.Node = dom.window.Node;
  g.NodeFilter = dom.window.NodeFilter;
  g.HTMLElement = dom.window.HTMLElement;
  g.Element = dom.window.Element;
  try {
    return fn();
  } finally {
    g.window = previous.window;
    g.document = previous.document;
    g.Node = previous.Node;
    g.NodeFilter = previous.NodeFilter;
    g.HTMLElement = previous.HTMLElement;
    g.Element = previous.Element;
  }
}

describe('chat rich-text paste pipeline', () => {
  it('preserves bold italic underline strike and links', () => {
    withDom(() => {
      const html = `
        <p><b>Bold</b> <i>Italic</i> <u>Under</u> <s>Strike</s>
        <a href="https://example.com">Link</a></p>`;
      const { markdown } = clipboardHtmlToMarkdown(html);
      assert.match(markdown, /\*\*Bold\*\*/);
      assert.match(markdown, /\*Italic\*/);
      assert.match(markdown, /__Under__/);
      assert.match(markdown, /~~Strike~~/);
      assert.match(markdown, /\[Link\]\(https:\/\/example\.com\)/);
    });
  });

  it('converts headings and paragraphs', () => {
    withDom(() => {
      const html = `<h2>Title</h2><p>Hello world</p>`;
      const { markdown } = clipboardHtmlToMarkdown(html);
      assert.match(markdown, /^## Title/m);
      assert.match(markdown, /Hello world/);
    });
  });

  it('converts Word-like list paragraphs into markdown lists', () => {
    withDom(() => {
      const html = `
        <p class="MsoListParagraph">• First</p>
        <p class="MsoListParagraph">• Second</p>`;
      const { markdown } = clipboardHtmlToMarkdown(html);
      assert.match(markdown, /^- First/m);
      assert.match(markdown, /^- Second/m);
    });
  });

  it('converts simple tables to GFM', () => {
    withDom(() => {
      const html = `
        <table>
          <tr><th>A</th><th>B</th></tr>
          <tr><td>1</td><td>2</td></tr>
        </table>`;
      const { markdown } = clipboardHtmlToMarkdown(html);
      assert.match(markdown, /\| A \| B \|/);
      assert.match(markdown, /\| --- \| --- \|/);
      assert.match(markdown, /\| 1 \| 2 \|/);
    });
  });

  it('strips scripts and javascript hrefs', () => {
    withDom(() => {
      const dirty = `
        <p>Hi<script>alert(1)</script></p>
        <a href="javascript:alert(1)">bad</a>
        <a href="https://safe.example">ok</a>`;
      const cleaned = sanitizeChatPasteHtml(dirty);
      assert.doesNotMatch(cleaned, /script/i);
      assert.doesNotMatch(cleaned, /javascript:/i);
      assert.match(cleaned, /https:\/\/safe\.example/);

      const { markdown } = clipboardHtmlToMarkdown(dirty);
      assert.doesNotMatch(markdown, /javascript:/i);
      assert.match(markdown, /\[ok\]\(https:\/\/safe\.example\)/);
    });
  });

  it('maps style-based bold from Docs-like spans', () => {
    withDom(() => {
      const html = `<p><span style="font-weight:700">Heavy</span></p>`;
      const { markdown } = clipboardHtmlToMarkdown(html);
      assert.match(markdown, /\*\*Heavy\*\*/);
    });
  });

  it('renders underline headings and tables from markdown', () => {
    const tree = renderMarkdownBody(
      '## Hello\n\n__under__\n\n| A | B |\n| --- | --- |\n| 1 | 2 |',
    );
    assert.ok(tree);
  });

  it('htmlToMarkdown keeps underline tags', () => {
    withDom(() => {
      const root = document.createElement('div');
      root.innerHTML = '<p><u>line</u></p>';
      assert.equal(htmlToMarkdown(root), '__line__');
    });
  });
});
