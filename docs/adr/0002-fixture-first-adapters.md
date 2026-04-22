# 0002 — Fixture-first adapter pattern for every I/O boundary

**Status:** Accepted — 2026-04-22
**Context:** Phase 2 (adopted before first migration landed)

## Context

AutoFlow Studio targets four external systems in production: Supabase (Postgres + Auth), Stripe (billing), n8n (webhook source), WorkOS (SSO/SCIM). A naïve implementation would couple every call site to real SDKs and require live credentials to run the dev server. That creates four problems:

1. **Onboarding friction.** A new contributor needs accounts + keys across four vendors before `npm run dev` renders anything.
2. **Test flakiness.** Integration tests hit the network, so CI becomes dependent on vendor uptime.
3. **Secret sprawl.** Local `.env` files accumulate real keys, invariably getting committed eventually.
4. **Portfolio visibility.** A reviewer scanning the repo can't exercise the UI without provisioning a full external stack.

## Decision

Every I/O boundary is behind a TypeScript interface with two implementations: `Fixture` (deterministic, in-memory) and `Live` (real SDK). A single env var — `APP_MODE=fixture|live` — selects the implementation at runtime. Default is `fixture`.

Adapters cached after first resolution; factories throw in `live` mode until Phase 8+ wiring lands, so a misconfigured production deploy fails loudly rather than silently falling through.

## Alternatives considered

- **Mocks per test.** Works for unit tests but doesn't solve the dev-server or reviewer-visibility problems. Also introduces drift between mock shape and real SDK.
- **Docker Compose with local Supabase/Stripe CLI.** Heavier setup, still requires credentials for Stripe's remote APIs, and doesn't help for Stripe webhooks or WorkOS.
- **Separate "demo" app.** Two apps to maintain; reviewers would need to know which is which.

## Consequences

- **Positive:** `git clone && npm install && npm run dev` works with zero external dependencies. Tests run the real code path, not mocks. Live wiring is a single-file swap per adapter.
- **Positive:** Type-safe contract between fixture and live implementations. Drift is a compile error.
- **Trade-off:** Some duplication — fixture data lives alongside the interface. Managed by keeping fixtures tiny (seeded PRNG where realism matters, e.g., 100 executions).
- **Trade-off:** Feature parity between fixture and live must be maintained. Enforced by type system + tests that exercise the fixture path.

## Related

- `src/lib/supabase/adapter.ts`, `src/lib/auth/adapter.ts`, `src/lib/n8n/adapter.ts`, `src/lib/stripe/adapter.ts`, `src/lib/sso/adapter.ts`
- `src/lib/env.ts` — `APP_MODE` resolution with production-mode fatal guard
