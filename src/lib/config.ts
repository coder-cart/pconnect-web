export const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:6002/api';

export const WS_BASE_URL =
  process.env.NEXT_PUBLIC_WS_URL ?? 'http://localhost:6002';

export const WS_PATH =
  process.env.NEXT_PUBLIC_WS_PATH ??
  (process.env.NEXT_PUBLIC_NGROK_PROXY_API === 'true' ||
  process.env.NGROK_PROXY_API === 'true'
    ? '/api/socket.io'
    : '/socket.io');

// Realtime stays on for ngrok demos (socket.io is proxied via Next rewrites).
// Set NEXT_PUBLIC_DISABLE_REALTIME=true only to force-disable the client.
export const IS_REALTIME_ENABLED =
  process.env.NEXT_PUBLIC_DISABLE_REALTIME !== 'true';

export const AUTH_TOKEN_KEY = 'pconnect_access_token';
export const REFRESH_TOKEN_KEY = 'pconnect_refresh_token';

// Marker cookie read by Next middleware for route gating (no token value).
export const SESSION_COOKIE = 'pconnect_session';

export const STRIPE_PUBLISHABLE_KEY =
  process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY ?? '';
