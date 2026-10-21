import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

const SESSION_COOKIE = 'pconnect_session';

// Routes reachable without a session. Everything else requires the marker
// cookie. Real authorization is still enforced by the API on every request;
// this is a first-line UX gate that avoids flashing protected shells.
const PUBLIC_PATHS = [
  '/login',
  '/sign-in',
  '/reset-password',
  '/forgot-password',
  '/magic-login',
  '/features',
  '/solutions',
  '/pricing',
  '/about',
  '/contact',
  '/book-a-demo',
  '/security',
  '/privacy',
  '/terms',
  '/health',
  '/sw.js',
  '/manifest.webmanifest',
];

function isPublicPath(pathname: string): boolean {
  if (pathname === '/') return true;
  return PUBLIC_PATHS.some(
    (path) => pathname === path || pathname.startsWith(`${path}/`),
  );
}

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const hasSession = request.cookies.get(SESSION_COOKIE)?.value === '1';
  const isApiOrSocketPath =
    pathname.startsWith('/api') || pathname.startsWith('/socket.io');

  if (isApiOrSocketPath) {
    return NextResponse.next();
  }

  if (isPublicPath(pathname)) {
    // Signed-in users shouldn't sit on the login screen.
    if (hasSession && (pathname === '/login' || pathname === '/')) {
      return NextResponse.redirect(new URL('/dashboard', request.url));
    }
    return NextResponse.next();
  }

  if (!hasSession) {
    const loginUrl = new URL('/login', request.url);
    loginUrl.searchParams.set('next', pathname);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  // Run on app routes only; skip API and socket proxy paths.
  matcher: [
    '/((?!api|socket\\.io|_next/static|_next/image|favicon.ico|sw\\.js|manifest\\.webmanifest|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|webmanifest)$).*)',
  ],
};
