export const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:7001/api';

export const WS_BASE_URL =
  process.env.NEXT_PUBLIC_WS_URL ?? 'http://localhost:7001';

export const WS_PATH =
  process.env.NEXT_PUBLIC_WS_PATH ??
  (process.env.NGROK_PROXY_API === 'true' ? '/api/socket.io' : '/socket.io');

export const IS_REALTIME_ENABLED =
  process.env.NEXT_PUBLIC_DISABLE_REALTIME !== 'true' &&
  process.env.NGROK_PROXY_API !== 'true';

export const AUTH_TOKEN_KEY = 'pconnect_access_token';
export const REFRESH_TOKEN_KEY = 'pconnect_refresh_token';

// Marker cookie read by Next middleware for route gating (no token value).
export const SESSION_COOKIE = 'pconnect_session';

export const STRIPE_PUBLISHABLE_KEY =
  process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY ?? '';
