import { chromium } from 'playwright';

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage();
const responses = [];
page.on('console', (m) => console.log('CONSOLE', m.type(), m.text()));
page.on('pageerror', (e) => console.log('PAGEERROR', String(e)));
page.on('response', (res) => {
  const url = res.url();
  if (url.includes('chat-perf') || url.includes('ChatPerf') || url.includes('chunks/')) {
    responses.push(`${res.status()} ${url}`);
  }
});
page.on('requestfailed', (req) => {
  console.log('REQFAIL', req.failure()?.errorText, req.url());
});
const resp = await page.goto('http://127.0.0.1:6001/dev/chat-perf?n=50', {
  waitUntil: 'domcontentloaded',
  timeout: 180_000,
});
console.log('STATUS', resp?.status(), 'URL', page.url());
for (let i = 0; i < 20; i += 1) {
  await page.waitForTimeout(1000);
  const info = await page.evaluate(() => ({
    ready: document.querySelector('[data-testid="chat-perf-ready"]')?.textContent,
    hasPerf: typeof window.__CHAT_PERF__,
    hasScroller: Boolean(document.querySelector('[data-virtuoso-scroller]')),
    body: document.body?.innerText?.slice(0, 120),
  }));
  console.log(`t=${i + 1}s`, JSON.stringify(info));
  if (info.ready?.trim() === 'ready' && info.hasScroller) break;
}
console.log('RESPONSES\n' + responses.slice(-40).join('\n'));
await browser.close();
