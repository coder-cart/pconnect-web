import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import type { NextConfig } from 'next';

function readAppRelease(): string {
  try {
    const parsed = JSON.parse(
      readFileSync(join(process.cwd(), 'public', 'version.json'), 'utf8'),
    ) as { release?: unknown };
    if (typeof parsed.release === 'string' && parsed.release.trim()) {
      return parsed.release.trim();
    }
  } catch {
    // Dev and CI still boot if the release stamp has not been written yet.
  }
  return 'dev';
}

const appRelease = readAppRelease();

function resolveOrigin(url: string | undefined): string | null {
  if (!url || url.startsWith('/')) {
    return null;
  }

  try {
    return new URL(url).origin;
  } catch {
    return null;
  }
}

function buildConnectSrc(): string {
  const origins = new Set<string>([
    'http://localhost:3001',
    'http://127.0.0.1:3001',
  ]);

  for (const value of [
    process.env.NEXT_PUBLIC_API_URL,
    process.env.NEXT_PUBLIC_WS_URL,
  ]) {
    const origin = resolveOrigin(value);
    if (origin) {
      origins.add(origin);
    }
  }

  return ["'self'", ...origins, 'ws:', 'wss:'].join(' ');
}

function buildImgSrc(): string {
  const origins = new Set<string>(["'self'", 'data:', 'blob:', 'https://*.stripe.com']);
  const apiOrigin = resolveOrigin(process.env.NEXT_PUBLIC_API_URL);
  if (apiOrigin) origins.add(apiOrigin);
  origins.add('http://localhost:3001');
  origins.add('http://127.0.0.1:3001');
  origins.add('http://localhost:6002');
  origins.add('http://127.0.0.1:6002');
  return [...origins].join(' ');
}

function buildContentSecurityPolicy(options?: {
  allowFraming?: boolean;
}): string {
  return [
    "default-src 'self'",
    "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://js.stripe.com",
    "style-src 'self' 'unsafe-inline'",
    `img-src ${buildImgSrc()}`,
    "media-src 'self' blob:",
    "font-src 'self' data:",
    `connect-src ${buildConnectSrc()} https://api.stripe.com https://m.stripe.network`,
    "frame-src https://js.stripe.com https://hooks.stripe.com",
    options?.allowFraming
      ? 'frame-ancestors *'
      : "frame-ancestors 'none'",
    "base-uri 'self'",
    "form-action 'self'",
  ].join('; ');
}

const ngrokProxy = process.env.NGROK_PROXY_API === 'true';
const apiProxyTarget =
  process.env.API_PROXY_TARGET ?? 'http://127.0.0.1:6002';

const nextConfig: NextConfig = {
  output: 'standalone',
  poweredByHeader: false,
  env: {
    NEXT_PUBLIC_APP_RELEASE: appRelease,
  },
  // Keep `/api/socket.io/?EIO=…` from being 308'd to a slashless URL (Engine.IO).
  skipTrailingSlashRedirect: ngrokProxy,
  // Allow HMR when the dev server is accessed via ngrok (client demos).
  allowedDevOrigins: ['*.ngrok-free.dev', '*.ngrok-free.app', '*.ngrok.io'],
  async rewrites() {
    if (!ngrokProxy) {
      return [];
    }

    // Engine.IO only matches `/socket.io/` (trailing slash). Next also 308-redirects
    // `/api/socket.io/` → `/api/socket.io`, so destinations must keep the slash.
    return [
      {
        source: '/api/socket.io',
        destination: `${apiProxyTarget}/socket.io/`,
      },
      {
        source: '/api/socket.io/:path*',
        destination: `${apiProxyTarget}/socket.io/:path*`,
      },
      {
        source: '/socket.io',
        destination: `${apiProxyTarget}/socket.io/`,
      },
      {
        source: '/socket.io/:path*',
        destination: `${apiProxyTarget}/socket.io/:path*`,
      },
      {
        source: '/api/:path*',
        destination: `${apiProxyTarget}/api/:path*`,
      },
    ];
  },
  async headers() {
    const revalidate = [
      { key: 'Cache-Control', value: 'no-cache, no-store, must-revalidate' },
    ];
    return [
      { source: '/sw.js', headers: revalidate },
      { source: '/pwa-release.js', headers: revalidate },
      { source: '/version.json', headers: revalidate },
      {
        source: '/manifest.webmanifest',
        headers: [{ key: 'Cache-Control', value: 'no-cache, must-revalidate' }],
      },
      {
        // Public booking pages may be embedded on client websites.
        source: '/book/:path*',
        headers: [
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          {
            key: 'Permissions-Policy',
            value: 'camera=(), microphone=(), geolocation=()',
          },
          {
            key: 'Content-Security-Policy',
            value: buildContentSecurityPolicy({ allowFraming: true }),
          },
        ],
      },
      {
        source: '/:path*',
        headers: [
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          {
            key: 'Permissions-Policy',
            value: 'camera=(), microphone=(), geolocation=()',
          },
          {
            key: 'Content-Security-Policy',
            value: buildContentSecurityPolicy(),
          },
        ],
      },
    ];
  },
};

export default nextConfig;
