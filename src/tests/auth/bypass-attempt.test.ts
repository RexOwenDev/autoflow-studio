/**
 * Auth bypass attempt suite.
 *
 * Goal: prove that in LIVE mode, every protected route enforces a session cookie
 * via the proxy (Edge layer). Public paths (auth flows, webhooks, internals) stay
 * reachable without a session.
 *
 * The fixture-mode bypass is intentional and tested separately — it MUST short-circuit
 * before the cookie check, otherwise local dev would require a live Supabase session.
 *
 * These tests run in Vitest's node environment and instantiate NextRequest directly
 * to invoke the proxy function in isolation.
 */

import { NextRequest } from "next/server";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { proxy } from "@/proxy";

const ORIGIN = "https://autoflow.test";

function buildRequest(
  path: string,
  init: { cookies?: Record<string, string>; method?: string } = {},
): NextRequest {
  const url = `${ORIGIN}${path}`;
  const req = new NextRequest(url, { method: init.method ?? "GET" });
  if (init.cookies) {
    for (const [name, value] of Object.entries(init.cookies)) {
      req.cookies.set(name, value);
    }
  }
  return req;
}

describe("proxy auth enforcement", () => {
  const originalAppMode = process.env["APP_MODE"];

  afterEach(() => {
    if (originalAppMode === undefined) {
      process.env["APP_MODE"] = undefined;
      delete process.env["APP_MODE"];
    } else {
      process.env["APP_MODE"] = originalAppMode;
    }
  });

  // ===== LIVE MODE — strict enforcement ===================================
  describe("APP_MODE=live (strict)", () => {
    beforeEach(() => {
      process.env["APP_MODE"] = "live";
    });

    it("redirects /dashboard to /auth/sign-in when no session cookie", () => {
      const res = proxy(buildRequest("/dashboard"));
      expect(res.status).toBe(307);
      const location = res.headers.get("location");
      expect(location).toContain("/auth/sign-in");
      expect(location).toContain("redirect=%2Fdashboard");
    });

    it("redirects /executions/123 to /auth/sign-in when no session cookie", () => {
      const res = proxy(buildRequest("/executions/123"));
      expect(res.status).toBe(307);
      expect(res.headers.get("location")).toContain("/auth/sign-in");
    });

    it("redirects /settings/members to /auth/sign-in when no session cookie", () => {
      const res = proxy(buildRequest("/settings/members"));
      expect(res.status).toBe(307);
      expect(res.headers.get("location")).toContain("/auth/sign-in");
    });

    it("preserves the original path in the redirect query", () => {
      const res = proxy(buildRequest("/workflows/abc-123/edit"));
      expect(res.headers.get("location")).toContain("redirect=%2Fworkflows%2Fabc-123%2Fedit");
    });

    it("allows /dashboard when sb-<ref>-auth-token cookie present", () => {
      const res = proxy(
        buildRequest("/dashboard", {
          cookies: { "sb-abcdefgh-auth-token": "any-value" },
        }),
      );
      expect(res.status).toBe(200);
    });

    it("allows /dashboard with legacy sb-access-token cookie", () => {
      const res = proxy(
        buildRequest("/dashboard", {
          cookies: { "sb-access-token": "any-value" },
        }),
      );
      expect(res.status).toBe(200);
    });

    it("does NOT accept arbitrary cookies starting with sb-", () => {
      // sb-something-else doesn't match either auth pattern — must redirect.
      const res = proxy(
        buildRequest("/dashboard", {
          cookies: { "sb-locale-pref": "en" },
        }),
      );
      expect(res.status).toBe(307);
    });

    it("does NOT accept the cookie name in a header value", () => {
      // Defense vs header smuggling: the cookie must be in the cookie store, not elsewhere.
      const url = `${ORIGIN}/dashboard`;
      const headers = new Headers();
      headers.set("authorization", "Bearer sb-access-token=fake");
      const req = new NextRequest(url, { method: "GET", headers });
      const res = proxy(req);
      expect(res.status).toBe(307);
    });

    // ===== PUBLIC PATHS — never blocked =====================================
    it.each([
      ["/", "marketing root"],
      ["/auth/sign-in", "sign-in page"],
      ["/auth/sign-up", "sign-up page"],
      ["/auth/magic-link", "magic-link page"],
      ["/auth/forgot-password", "forgot-password page"],
      ["/auth/accept-invite?token=foo", "accept-invite page"],
      ["/api/webhooks/n8n", "n8n webhook receiver"],
      ["/api/webhooks/stripe", "stripe webhook receiver"],
      ["/_next/static/chunks/main.js", "Next.js static asset"],
      ["/favicon.ico", "favicon"],
    ])("allows %s without a session (%s)", (path) => {
      const res = proxy(buildRequest(path));
      expect(res.status).toBe(200);
    });

    it("allows POST to /api/webhooks/n8n without a session (HMAC-verified at handler)", () => {
      const res = proxy(buildRequest("/api/webhooks/n8n", { method: "POST" }));
      expect(res.status).toBe(200);
    });
  });

  // ===== FIXTURE MODE — passes through (FixtureAuthAdapter issues session) ===
  describe("APP_MODE=fixture (auto-session)", () => {
    beforeEach(() => {
      process.env["APP_MODE"] = "fixture";
    });

    it("allows /dashboard without a session cookie", () => {
      const res = proxy(buildRequest("/dashboard"));
      expect(res.status).toBe(200);
    });

    it("allows /settings/members without a session cookie", () => {
      const res = proxy(buildRequest("/settings/members"));
      expect(res.status).toBe(200);
    });
  });
});
