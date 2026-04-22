# AutoFlow Studio

Multi-tenant automation management platform. Teams ingest webhook events, route them through configurable workflows (n8n-compatible), and observe every execution from a live dashboard — with SOC2-aligned audit trails, tier-based billing, and Enterprise SAML/SCIM.

Runs end-to-end in **fixture mode** with zero accounts, zero network calls, and zero configuration. Live mode (Phase 8+ wiring) swaps in real Supabase, Stripe, and WorkOS behind the same adapter interfaces.

---

## Why this exists

This repo is a working reference for the pattern most SaaS tutorials skip: how to ship a **multi-tenant, RLS-enforced, webhook-driven** platform with real security boundaries — not a CRUD app with an auth wrapper. Every table has RLS policies with `pgTAP` denial tests. Every webhook verifies HMAC signatures with timing-safe compares, replay windows, and idempotency keys. Every mutation emits an audit event. Every feature is gated by plan and role at the schema level — not just in the UI.

---

## Feature matrix

| Capability | Free | Pro | Enterprise |
|---|---|---|---|
| Monthly executions | 100 | 10,000 | Unlimited |
| Team seats | 3 | 20 | Unlimited |
| Audit log retention | 30 days | 365 days | Unlimited |
| Audit log CSV / JSON export | — | ✓ | ✓ |
| SAML SSO + SCIM provisioning | — | — | ✓ |
| Priority support | — | ✓ | ✓ |
| Custom private templates | — | ✓ | ✓ |
| 99.9% uptime SLA | — | — | ✓ |

---

## Architecture at a glance

```
┌────────────────────────────────────────────────────────────────────┐
│  Edge Proxy  (src/proxy.ts)                                        │
│  — default-deny session gate · public path allowlist               │
└──────────────┬─────────────────────────────────────┬───────────────┘
               │ authenticated                       │ public
               ▼                                     ▼
┌──────────────────────────────┐   ┌──────────────────────────────┐
│  Next.js 16 App Router       │   │  Webhook handlers            │
│  Server components           │   │  /api/webhooks/n8n           │
│  — dashboard, executions,    │   │  /api/webhooks/stripe        │
│    templates, members,       │   │  — HMAC verify + replay win  │
│    billing, sso, audit       │   │  — idempotency via UNIQUE    │
└──────────┬───────────────────┘   └──────────┬───────────────────┘
           │                                  │
           ▼                                  ▼
┌────────────────────────────────────────────────────────────────────┐
│  Adapter layer  (src/lib/{supabase,n8n,stripe,sso,auth}/adapter.ts)│
│  Fixture ⇄ Live selected by APP_MODE env                           │
└──────────┬─────────────────────────────────────────────────────────┘
           │ Live mode only
           ▼
┌────────────────────────────────────────────────────────────────────┐
│  Supabase Postgres                                                 │
│  — 9 migrations, RLS deny-by-default + FORCE RLS                   │
│  — is_organization_member() EXISTS-pattern helper                  │
│  — audit_events append-only (UPDATE/DELETE/TRUNCATE all blocked)   │
│  — pgTAP: 45 assertions covering cross-tenant + append-only        │
└────────────────────────────────────────────────────────────────────┘
```

The full diagram and sequence flows live in [`ARCHITECTURE.md`](./ARCHITECTURE.md).

---

## Security model (one-page summary)

- **Deny by default.** Every migrated table has `ENABLE` + `FORCE ROW LEVEL SECURITY`. Policies grant SELECT/INSERT/UPDATE/DELETE via explicit `EXISTS` checks against `organization_members`, not scalar JWT claims. Missing policy = no access.
- **Admin can't self-promote to owner.** `UPDATE organization_members SET role = 'owner'` is blocked by a split policy — admins manage only non-owner rows. Pinned by a pgTAP assertion.
- **Last owner can't orphan an org.** `BEFORE DELETE` trigger rejects the last owner's removal; `BEFORE UPDATE` blocks demotion.
- **Workflow versions can't cross tenants.** Composite FK `(workflow_id, organization_id) → workflows(id, organization_id)` rejects rows whose two tenant references disagree.
- **Audit log is append-only at the trigger level.** Three triggers block UPDATE, DELETE, and TRUNCATE — even for superuser, by design. Plus `REVOKE` belt-and-braces. DBA-tier tamper resistance requires out-of-band controls (documented, Phase 8+ ops).
- **Webhook signatures are timing-safe.** HMAC-SHA256 verify uses `timingSafeEqual`. All auth failures return an identical response shape — no oracle reveals which control tripped.
- **Webhook bodies are idempotency-bound.** Executions require `idempotency_key` when `trigger_source = 'webhook'`. `webhook_inbox` UNIQUE on `(source, lower(idempotency_key))` — case-insensitive dedup prevents replay under case variants.
- **Billing IDs are owner-gated.** `billing_subscriptions` SELECT restricted to owner; members see plan/usage via `billing_subscription_member_view` (security_invoker) without leaking `stripe_customer_id`.
- **Secrets never echo in errors.** Template validator scrubs secret-field error messages. Audit diff emitter redacts keys matching `/token|password|secret|key|authorization/i` before persisting.
- **CSV exports are formula-injection safe.** Cells starting with `= + - @ TAB CR` are prefixed with a single quote (OWASP).

Full threat model: [`docs/threat-model.md`](./docs/threat-model.md). Phase 2 council gate findings + resolutions: [`docs/phase-2-council-gate.md`](./docs/phase-2-council-gate.md).

---

## Tech stack

| Layer | Choice | Why |
|---|---|---|
| Framework | Next.js 16 (App Router, proxy) | RSC-first, Edge-aware proxy, file-based routing matches teams' mental model |
| Language | TypeScript (strict++) | `noUncheckedIndexedAccess`, `exactOptionalPropertyTypes`, `noImplicitOverride`, `forceConsistentCasingInFileNames` |
| Styling | Tailwind v4 + CSS custom properties | Token-based design system, dark-first with light-mode overrides |
| Database | Postgres + Supabase RLS | RLS is the security boundary, not app code |
| Schema validation | Zod | One schema for DB/Server Actions/client forms |
| Webhook crypto | Node `crypto` | HMAC-SHA256 + `timingSafeEqual` |
| Auth (Phase 7+ live) | Supabase Auth + WorkOS SAML/SCIM (Enterprise) | Matches real SaaS tier structure |
| Billing (Phase 7+ live) | Stripe (test + live) | Signed webhooks, metered usage |
| Observability | OpenTelemetry + `@vercel/otel` | 10% sampled in prod |
| Test | Vitest (120 tests) + pgTAP (45 assertions) | Unit + integration + RLS |
| Lint / format | Biome v2 | Faster than ESLint, single config |
| CI | GitHub Actions | typecheck → lint → test → build → security |

---

## Running locally

No accounts. No keys. One command:

```bash
npm install
APP_MODE=fixture npm run dev
```

Open `http://localhost:3000/dashboard`. You're signed in as Rex Quintenta, Owner of Acme Corp, with 100 seeded executions and a Pro plan.

**Fixture mode is the default.** Everything works offline — Supabase queries route to `FixtureSupabaseAdapter`, Stripe to `FixtureStripeAdapter`, WorkOS to `FixtureWorkOSAdapter`. Live mode is gated by `APP_MODE=live` + environment variables; see `.env.example`.

### Regenerating seed data

```bash
npm run seed:executions   # 100 deterministic runs over 72h, mulberry32(seed=42)
```

### Tests

```bash
npm test                  # Vitest: 120 tests across webhooks, auth bypass, templates, audit export, rate limiter
```

### Build + type-check + lint

```bash
npm run typecheck
npm run lint:ci
npm run build
```

---

## Phase timeline

Every phase shipped as a signed git tag. Council gates (Codex adversarial review; Gemini second-opinion where credits available) documented in `PROJECT-MEMORY.md`.

| Tag | Phase | Scope |
|---|---|---|
| `v0.1.0-phase0` | Charter & governance | Threat model, SECURITY, CODEOWNERS, CI skeleton |
| `v0.2.0-phase1` | Foundation | Next.js scaffold, Tailwind v4, OTel, default-deny proxy |
| `v0.3.0-phase2` | Multi-tenant schema + RLS | 6 migrations, RLS helpers, 2 pgTAP suites |
| `v0.3.1-phase2-fixes` | Codex adversarial gate | 1 CRITICAL + 3 HIGH + 4 MEDIUM + 3 LOW fixes |
| `v0.4.0-phase3` | Auth + Workspaces | Sign-in/up, workspace switcher, member invites, 21 bypass tests |
| `v0.5.0-phase4` | Templates + config | 5 fixture templates, JSON-schema ConfigForm, fuzz tests |
| `v0.6.0-phase5` | n8n webhook + executions | HMAC verify, 100-run seed, executions table + detail, audit log UI |
| `v0.7.0-phase6` | Stripe billing | Fixture-only: pricing, plan switcher, usage meter, 14 route tests |
| `v0.8.0-phase7` | Enterprise tier | WorkOS SSO/SCIM, audit export (CSV/JSON), rate limiter, plan gates |
| `v1.0.0` | Release prep | Enterprise README, ARCHITECTURE, ADRs, CHANGELOG, CONTRIBUTING |

---

## Repository layout

```
src/
  app/
    (app)/              # Authenticated shell (sidebar + main)
      audit/            # Admin+ audit timeline
      dashboard/        # Metrics + recent executions + plan usage
      executions/       # Filtered table + per-run detail + retry
      settings/         # Members, billing, sso, audit export
      templates/        # Gallery + detail + configure flow
      workflows/        # Per-workflow pages (Phase 8+ expansion)
    auth/               # Sign-in, sign-up, magic-link, forgot-password, accept-invite
    api/
      webhooks/         # n8n + Stripe receivers
      audit/export/     # CSV/JSON download route
      auth/invites/     # Invite create/redeem/revoke server actions
      billing/          # Plan change + cancel server actions
      executions/       # Retry + cancel server actions
      sso/              # SCIM token server actions
      templates/        # Use-template + save-config server actions
    pricing/            # Public marketing page
  components/           # Button, Badge, Card, Input, Separator, ConfigForm, StatusPill, Sidebar
  lib/
    audit/              # Emitter + CSV/JSON serializer
    auth/               # AuthAdapter + session helpers
    billing/            # PLAN_DEFINITIONS, computeUsageStatus
    db/                 # Server-only query helpers
    n8n/                # N8nAdapter + HMAC primitive + seed data
    otel/               # Exporter factory + sampler
    sso/                # WorkOSAdapter
    stripe/             # StripeAdapter + Stripe-Signature wrapper
    supabase/           # SupabaseAdapter interface + FixtureSupabaseAdapter + fixtures
    templates/          # Zod schemas + validator + fixture library
  proxy.ts              # Edge session gate + public allowlist
  tests/                # Vitest suites (120 total) + pgTAP (in supabase/tests/)
supabase/
  migrations/           # 9 forward-only migrations
  tests/rls/            # pgTAP: cross-tenant-denial + append-only-audit
scripts/
  seed-executions.ts    # Deterministic execution generator
docs/
  adr/                  # Architecture decision records (0001–0006)
  phase-2-council-gate.md
  threat-model.md
```

---

## Status

**Phases 0–8 complete.** `v1.0.0` is the release-prep milestone: docs, ADRs, changelog. Repo stays private while the Gemini whole-repo audit remains queued (personal AI Studio credits depleted — will run before any public release).

Questions, findings, or engagement inquiries: see [`CONTRIBUTING.md`](./CONTRIBUTING.md) and [`SECURITY.md`](./SECURITY.md).

---

## License

MIT. See [`LICENSE`](./LICENSE).
