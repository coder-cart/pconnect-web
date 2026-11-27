/**
 * Synthetic retention measurements (no browser).
 * Usage: npx tsx scripts/chat-retention-measure.mts
 */
import {
  CHANNEL_MESSAGE_MAX_RETAINED,
  CHANNEL_MESSAGE_PAGE_SIZE,
  retainChannelMessageWindow,
} from '../src/lib/messageWindowRetention';

function makeMessages(count: number) {
  return Array.from({ length: count }, (_, index) => ({
    id: `m${index + 1}`,
    body: `Hello world ${index} `.repeat(8),
    createdAt: new Date(Date.now() - (count - index) * 60_000).toISOString(),
  }));
}

function heapUsedMb() {
  return +(process.memoryUsage().heapUsed / 1024 / 1024).toFixed(2);
}

const sizes = [1000, 2000, 5000, 10000];
const rows = [];

for (const n of sizes) {
  const before = heapUsedMb();
  const messages = makeMessages(n);
  const t0 = performance.now();
  const result = retainChannelMessageWindow({
    messages,
    startDataIndex: Math.max(0, n - 120),
    maxRetained: CHANNEL_MESSAGE_MAX_RETAINED,
    pageSize: CHANNEL_MESSAGE_PAGE_SIZE,
  });
  const t1 = performance.now();
  const after = heapUsedMb();
  rows.push({
    input: n,
    retained: result.messages.length,
    removed: result.removedCount,
    hasMoreForced: result.hasMoreForced,
    retainMs: +(t1 - t0).toFixed(3),
    heapBeforeMb: before,
    heapAfterMb: after,
  });
}

console.log(
  JSON.stringify(
    {
      maxRetained: CHANNEL_MESSAGE_MAX_RETAINED,
      pageSize: CHANNEL_MESSAGE_PAGE_SIZE,
      note: 'Synthetic JS objects only; DOM/Virtuoso measured separately via chat-perf harness',
      rows,
    },
    null,
    2,
  ),
);
