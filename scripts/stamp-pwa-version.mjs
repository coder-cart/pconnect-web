import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

/**
 * Writes the release id the service worker and the client both read.
 * Dev stays on "dev" so local reloads do not look like a new deployment.
 * `npm run build` stamps a real id so each image installs a new worker.
 */
const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const releaseJsPath = join(root, 'public', 'pwa-release.js');
const versionPath = join(root, 'public', 'version.json');
const swPath = join(root, 'public', 'sw.js');
const swStampPattern = /const SW_RELEASE_STAMP = "(?:[^"\\]|\\.)*";/;
const lifecycle = process.env.npm_lifecycle_event || '';

function sanitizeRelease(value) {
  const trimmed = value.trim().slice(0, 64);
  if (/^[A-Za-z0-9._-]+$/.test(trimmed)) return trimmed;
  return '';
}

function resolveRelease() {
  const fromEnv = sanitizeRelease(
    process.env.APP_RELEASE ||
      process.env.RENDER_GIT_COMMIT ||
      process.env.VERCEL_GIT_COMMIT_SHA ||
      process.env.GITHUB_SHA ||
      '',
  );
  if (fromEnv) return fromEnv.slice(0, 12);
  return `build-${Date.now().toString(36)}`;
}

function writeRelease(release) {
  const builtAt = release === 'dev' ? null : new Date().toISOString();
  writeFileSync(
    releaseJsPath,
    `self.PWA_RELEASE = ${JSON.stringify(release)};\n`,
  );
  writeFileSync(
    versionPath,
    `${JSON.stringify({ release, builtAt }, null, 2)}\n`,
  );

  const worker = readFileSync(swPath, 'utf8');
  if (!swStampPattern.test(worker)) {
    throw new Error('public/sw.js is missing SW_RELEASE_STAMP');
  }
  writeFileSync(
    swPath,
    worker.replace(
      swStampPattern,
      `const SW_RELEASE_STAMP = ${JSON.stringify(release)};`,
    ),
  );
}

const productionBuild = lifecycle === 'build';
writeRelease(productionBuild ? resolveRelease() : 'dev');
