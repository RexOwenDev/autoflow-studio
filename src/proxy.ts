import { type NextRequest, NextResponse } from "next/server";

/**
 * Default-deny proxy (Next.js 16 middleware/proxy convention).
 *
 * Two-layer auth enforcement:
 *   1. THIS proxy — runs in Edge runtime; cheap cookie presence check.
 *      Missing cookie + protected path → redirect to /auth/sign-in.
 *   2. Server components / actions — call requireSession() from src/lib/auth/session.ts,
 *      which talks to the AuthAdapter (fixture or live). This is the source of truth.
 *
 * In fixture mode the proxy passes through; the FixtureAuthAdapter auto-issues a session
 * for server components so the dashboard renders without a real login flow.
 *
 * Allowlisted paths (no session required at proxy level):
 *   /                      — marketing root (redirects client-side to /dashboard)
 *   /auth/*                — sign-in, sign-up, magic link, SSO callback, accept-invite
 *   /api/webhooks/*        — n8n + Stripe inbound (auth via HMAC, not session)
 *   /_next/*               — Next.js internals
 *   /favicon.ico           — browser default
 */

const PUBLIC_PATHS: RegExp[] = [
  /^\/$/,
  /^\/auth(\/.*)?$/,
  /^\/pricing$/,
  /^\/api\/webhooks(\/.*)?$/,
  /^\/_next(\/.*)?$/,
  /^\/favicon\.ico$/,
];

// Supabase SSR cookie names — see https://supabase.com/docs/reference/javascript/auth-getsession
// Either of these indicates an authenticated session at the proxy layer.
const SESSION_COOKIE_PATTERNS: RegExp[] = [
  /^sb-[^-]+-auth-token$/, // @supabase/ssr cookie shape: sb-<project-ref>-auth-token
  /^sb-access-token$/, // legacy single-cookie form
];

function isPublic(pathname: string): boolean {
  return PUBLIC_PATHS.some((pattern) => pattern.test(pathname));
}

function hasSessionCookie(request: NextRequest): boolean {
  for (const cookie of request.cookies.getAll()) {
    if (SESSION_COOKIE_PATTERNS.some((pat) => pat.test(cookie.name))) {
      return true;
    }
  }
  return false;
}

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (isPublic(pathname)) {
    return NextResponse.next();
  }

  // Fixture mode auto-issues a session via FixtureAuthAdapter. The proxy passes through
  // and server components resolve the synthetic session on first call.
  if (process.env.APP_MODE === "fixture") {
    return NextResponse.next();
  }

  if (!hasSessionCookie(request)) {
    const loginUrl = new URL("/auth/sign-in", request.url);
    loginUrl.searchParams.set("redirect", pathname);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all paths EXCEPT:
     * - _next/static (static files)
     * - _next/image (image optimization)
     * - public folder files with extensions (images, fonts)
     */
    "/((?!_next/static|_next/image|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|woff2?)$).*)",
  ],
};
