import { type NextRequest, NextResponse } from "next/server";

/**
 * Default-deny middleware.
 *
 * Gemini Phase 0 audit (HIGH): middleware must exist from Phase 1 — not Phase 3.
 * Every route requires an authenticated session UNLESS explicitly allowlisted.
 *
 * Allowlisted paths (no session required):
 *   /                      — marketing root (redirects to /dashboard)
 *   /auth/*                — sign-in, sign-up, magic link, SSO callback
 *   /api/webhooks/*        — n8n and Stripe inbound webhooks (verified by HMAC/sig)
 *   /_next/*               — Next.js internals
 *   /favicon.ico           — browser default
 *
 * Phase 3 will replace the session stub below with real Supabase Auth checks.
 * The allowlist contract is enforced now so no unprotected routes accumulate.
 */

const PUBLIC_PATHS: RegExp[] = [
  /^\/$/, // marketing root
  /^\/auth(\/.*)?$/, // auth flows
  /^\/api\/webhooks(\/.*)?$/, // webhook receivers (auth via HMAC)
  /^\/_next(\/.*)?$/, // Next.js internals
  /^\/favicon\.ico$/, // browser default
];

function isPublic(pathname: string): boolean {
  return PUBLIC_PATHS.some((pattern) => pattern.test(pathname));
}

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (isPublic(pathname)) {
    return NextResponse.next();
  }

  // Phase 1: session stub — always pass (Phase 3 wires real Supabase Auth here)
  // The structure is correct and tested; auth logic drops in without allowlist changes.
  const sessionToken =
    request.cookies.get("sb-access-token")?.value ??
    request.headers.get("authorization")?.replace("Bearer ", "");

  // In fixture mode, bypass auth entirely so the UI renders with seed data
  if (process.env.APP_MODE === "fixture") {
    return NextResponse.next();
  }

  if (!sessionToken) {
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
