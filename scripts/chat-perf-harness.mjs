/**
 * Live browser measurements for /dev/chat-perf via Playwright.
 *
 * Preferred: production build with NEXT_PUBLIC_ENABLE_CHAT_PERF=1 (stable hydration).
 * Fallback: existing server at baseUrl (dev often fails HMR/hydration under headless).
 *
 * Usage:
 *   node scripts/chat-perf-harness.mjs
 *   node scripts/chat-perf-harness.mjs http://127.0.0.1:6001
 */
import { chromium } from 'playwright';
import { spawn } from 'node:child_process';
import { writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { setTimeout as delay } from 'node:timers/promises';

const explicitBaseUrl = process.argv[2]?.replace(/\/$/, '');
const sizes = [50, 500, 1000, 2000, 5000];
const PORT = process.env.CHAT_PERF_PORT || '6011';
const managedBaseUrl = `http://127.0.0.1:${PORT}`;

function run(command, args, env = {}) {
  return new Promise((resolvePromise, reject) => {
    const child = spawn(command, args, {
      cwd: resolve('.'),
      env: { ...process.env, ...env },
      stdio: 'inherit',
      shell: process.platform === 'win32',
    });
    child.on('exit', (code) => {
      if (code === 0) resolvePromise();
      else reject(new Error(`${command} ${args.join(' ')} exited ${code}`));
    });
  });
}

async function waitForHttp(url, timeoutMs = 120_000) {
  const started = Date.now();
  while (Date.now() - started < timeoutMs) {
    try {
      const response = await fetch(url, { redirect: 'manual' });
      if (response.status > 0) return;
    } catch {
      // retry
    }
    await delay(500);
  }
  throw new Error(`Timed out waiting for ${url}`);
}

async function ensureServer() {
  if (explicitBaseUrl) {
    await waitForHttp(`${explicitBaseUrl}/dev/chat-perf?n=50`);
    return { baseUrl: explicitBaseUrl, stop: async () => undefined };
  }

  // NEXT_PUBLIC_ENABLE_CHAT_PERF must be present at build time.
  if (process.env.CHAT_PERF_SKIP_BUILD !== '1') {
    console.error('Building Next.js with chat-perf enabled…');
    await run('npm', ['run', 'build'], {
      NEXT_PUBLIC_ENABLE_CHAT_PERF: '1',
    });
  } else {
    console.error('Skipping build (CHAT_PERF_SKIP_BUILD=1).');
  }

  console.error(`Starting next start on :${PORT}…`);
  const child = spawn(
    'npx',
    ['next', 'start', '-p', PORT, '-H', '127.0.0.1'],
    {
      cwd: resolve('.'),
      env: {
        ...process.env,
        NEXT_PUBLIC_ENABLE_CHAT_PERF: '1',
        PORT,
      },
      stdio: ['ignore', 'pipe', 'pipe'],
      shell: process.platform === 'win32',
    },
  );
  child.stdout.on('data', (chunk) => process.stderr.write(chunk));
  child.stderr.on('data', (chunk) => process.stderr.write(chunk));

  await waitForHttp(`${managedBaseUrl}/dev/chat-perf?n=50`, 180_000);
  return {
    baseUrl: managedBaseUrl,
    stop: async () => {
      if (!child.killed) {
        child.kill('SIGTERM');
      }
    },
  };
}

async function assertHarnessReachable(page, baseUrl) {
  const probe = await page.goto(`${baseUrl}/dev/chat-perf?n=50`, {
    waitUntil: 'domcontentloaded',
    timeout: 180_000,
  });
  const finalUrl = page.url();
  if (finalUrl.includes('/login')) {
    throw new Error(
      `Harness redirected to login (${finalUrl}). Ensure /dev/chat-perf is public in proxy.ts.`,
    );
  }
  if (!probe || (!probe.ok() && probe.status() !== 304)) {
    throw new Error(
      `Harness HTTP ${probe?.status() ?? 'unknown'} at ${finalUrl}`,
    );
  }
  await page.waitForFunction(
    () =>
      document
        .querySelector('[data-testid="chat-perf-ready"]')
        ?.textContent?.trim() === 'ready',
    undefined,
    { timeout: 180_000 },
  );
}

async function measureAt(page, baseUrl, n) {
  const url = `${baseUrl}/dev/chat-perf?n=${n}`;
  const started = Date.now();
  await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 180_000 });
  if (page.url().includes('/login')) {
    throw new Error(`Login redirect while measuring n=${n}`);
  }
  await page.waitForFunction(
    () =>
      document
        .querySelector('[data-testid="chat-perf-ready"]')
        ?.textContent?.trim() === 'ready' &&
      typeof window.__CHAT_PERF__?.measure === 'function' &&
      document.querySelector(
        '[data-testid="chat-perf-root"] [data-virtuoso-scroller]',
      ),
    undefined,
    { timeout: 180_000 },
  );
  await page.waitForTimeout(800);
  const initial = await page.evaluate(() => window.__CHAT_PERF__.measure());
  const initialMs = Date.now() - started;

  const scroller = page.locator('[data-virtuoso-scroller]').first();
  const box = await scroller.boundingBox();
  if (box) {
    await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
    for (let i = 0; i < 12; i += 1) {
      await page.mouse.wheel(0, -900);
      await page.waitForTimeout(50);
    }
    await page.waitForTimeout(400);
  }
  const afterScrollUp = await page.evaluate(() => window.__CHAT_PERF__.measure());

  if (box) {
    for (let i = 0; i < 12; i += 1) {
      await page.mouse.wheel(0, 900);
      await page.waitForTimeout(50);
    }
    await page.waitForTimeout(400);
  }
  const afterScrollDown = await page.evaluate(() =>
    window.__CHAT_PERF__.measure(),
  );

  return {
    n,
    initialRenderMs: initialMs,
    initial,
    afterScrollUp,
    afterScrollDown,
  };
}

const server = await ensureServer();
const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({
  viewport: { width: 1440, height: 900 },
});
const results = [];
const errors = [];

page.on('pageerror', (err) => {
  errors.push(String(err));
});
page.on('console', (msg) => {
  if (msg.type() !== 'error') return;
  const text = msg.text();
  // Favicon / optional assets are noise for this harness.
  if (text.includes('ERR_CONNECTION_REFUSED')) return;
  if (text.includes('Failed to load resource')) return;
  errors.push(text);
});

try {
  await assertHarnessReachable(page, server.baseUrl);
  for (const n of sizes) {
    results.push(await measureAt(page, server.baseUrl, n));
  }
} finally {
  await browser.close();
  await server.stop();
}

const report = {
  measuredAt: new Date().toISOString(),
  baseUrl: server.baseUrl,
  tool: 'playwright chromium + /dev/chat-perf',
  results,
  consoleErrors: errors,
};

const outPath = resolve('scripts/chat-perf-results.json');
writeFileSync(outPath, JSON.stringify(report, null, 2));
console.log(JSON.stringify(report, null, 2));
console.error(`Wrote ${outPath}`);
