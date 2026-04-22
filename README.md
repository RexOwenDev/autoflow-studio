<div align="center">

# AutoFlow Studio

**Multi-tenant automation management SaaS** — enterprise-ready, security-first, production-grade skeleton.

[![CI](https://img.shields.io/github/actions/workflow/status/RexOwenDev/autoflow-studio/ci.yml?branch=main&label=CI&style=flat-square)](https://github.com/RexOwenDev/autoflow-studio/actions)
[![Security Scan](https://img.shields.io/github/actions/workflow/status/RexOwenDev/autoflow-studio/security.yml?branch=main&label=Security&style=flat-square&color=green)](https://github.com/RexOwenDev/autoflow-studio/actions)
[![TypeScript](https://img.shields.io/badge/TypeScript-strict-blue?style=flat-square&logo=typescript)](https://www.typescriptlang.org/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow?style=flat-square)](LICENSE)

*A white-label automation platform where each client tenant manages their workflows — without ever touching the underlying automation engine.*

---

<!-- hero banner generated in Phase 8 -->
<!-- ![AutoFlow Studio](docs/hero-banner.jpg) -->

</div>

---

## Overview

AutoFlow Studio gives non-technical teams full control over their automation workflows: configure variables, monitor executions in real-time, retry failures, and track every action in a tamper-evident audit log — all within their own isolated workspace.

Built to demonstrate enterprise-grade SaaS architecture: **multi-tenancy via Supabase RLS**, **Stripe execution metering**, **n8n webhook integration**, **WorkOS SSO**, and **SOC2-aligned audit logging** — all running in a fully fixture-driven mode that requires zero external accounts to evaluate.

---

## Feature Matrix

| Feature | Free | Pro | Enterprise |
|---|:---:|:---:|:---:|
| Workflow template library | ✅ 5 templates | ✅ Unlimited | ✅ Unlimited |
| Executions per month | 100 | 10,000 | Unlimited |
| Real-time execution dashboard | ✅ | ✅ | ✅ |
| Retry failed runs | ✅ | ✅ | ✅ |
| Configuration panel (no n8n access) | ✅ | ✅ | ✅ |
| Tamper-evident audit log | — | ✅ | ✅ |
| Audit log export (CSV / JSON) | — | — | ✅ |
| SAML SSO + SCIM provisioning | — | — | ✅ |
| Multi-member workspace | 1 seat | 5 seats | Unlimited |
| Feature flags + kill-switches | — | ✅ | ✅ |
| OpenTelemetry observability | — | ✅ | ✅ |

---

## Architecture

<!-- Architecture diagram generated in Phase 8 -->
<!-- ![System Architecture](docs/architecture.svg) -->

```
┌─────────────────────────────────────────────────────┐
│                   AutoFlow Studio                    │
│                   (Next.js 16)                       │
├──────────────┬──────────────┬────────────────────────┤
│  Workspace   │  Execution   │  Billing               │
│  (tenant UI) │  Dashboard   │  (Stripe metered)      │
└──────┬───────┴──────┬───────┴──────┬─────────────────┘
       │              │              │
       ▼              ▼              ▼
┌─────────────────────────────────────────────────────┐
│              Adapter Interface Layer                 │
│   StripeAdapter · N8nAdapter · SupabaseAdapter       │
│   (fixture | live — selected via APP_MODE env)       │
└──────┬───────────────┬──────────────┬────────────────┘
       │               │              │
       ▼               ▼              ▼
  Supabase RLS      n8n webhooks   Stripe SDK
  (multi-tenant)   (HMAC verified) (test-mode)

Supabase Schema:
  organizations → organization_members
  workflows → workflow_versions
  executions → execution_events
  webhook_inbox (replay guard)
  audit_events (append-only, DB-level trigger)
  billing_subscriptions → webhook_events (idempotent)
```

---

## Security Model

AutoFlow Studio is built with a **deny-by-default** security posture.

| Guarantee | How it's enforced |
|---|---|
| **Tenant isolation** | Supabase RLS on every table; cross-tenant access denied at DB level |
| **Tamper-evident audit** | `audit_events` is append-only; UPDATE/DELETE blocked by DB trigger |
| **Webhook integrity** | HMAC signature verification + 5-minute replay window on all inbound webhooks |
| **Idempotent billing** | Stripe events deduplicated via `webhook_events.stripe_event_id UNIQUE` |
| **No secrets in repo** | `gitleaks` in CI on every push; `.env.example` only |
| **Zod-validated boundaries** | Every server action and API route handler validates input |
| **Enterprise SSO** | WorkOS SAML + SCIM — identity lifecycle managed externally |
| **CSP + HSTS** | Strict Content-Security-Policy, HSTS, SameSite=Strict cookies |

Full STRIDE threat model: [`docs/threat-model.md`](docs/threat-model.md)

---

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | Next.js 16 (App Router) · React 19 |
| Language | TypeScript (strict) |
| Styling | Tailwind CSS v4 |
| Database | Supabase (PostgreSQL + RLS + Realtime) |
| Auth | Supabase Auth (Free/Pro) · WorkOS SAML/SCIM (Enterprise) |
| Billing | Stripe SDK — metered + subscription |
| Automation | n8n webhook integration |
| Observability | OpenTelemetry (`otel-nextjs` pattern) · Sentry |
| Feature Flags | GrowthBook (`feature-flags-growthbook` pattern) |
| Testing | Vitest (unit) · Playwright (e2e) · pgTAP (RLS) |
| Linting | Biome |
| CI | GitHub Actions |

---

## Project Phases

Each phase ships as a tagged commit so you can walk the build history.

| Phase | Tag | Description |
|---|---|---|
| 0 | `v0.1.0-phase0` | Charter, governance, threat model |
| 1 | `v0.2.0-phase1` | Next.js scaffold, CI, OTel, Biome |
| 2 | `v0.3.0-phase2` | Multi-tenant schema + RLS (pgTAP verified) |
| 3 | `v0.4.0-phase3` | Auth, workspace switcher, member invites |
| 4 | `v0.5.0-phase4` | Workflow template library + config forms |
| 5 | `v0.6.0-phase5` | n8n webhook ingest + execution dashboard |
| 6 | `v0.7.0-phase6` | Stripe billing + plan tiers + feature flags |
| 7 | `v0.8.0-phase7` | Enterprise SSO, audit export, observability |
| 8 | `v1.0.0` | Docs, visuals, release — public |

---

## Running Locally

> **Zero accounts required.** `APP_MODE=fixture` (default) routes all SDK calls to deterministic fixture adapters. No Stripe keys, no Supabase project, no n8n instance.

```bash
git clone https://github.com/RexOwenDev/autoflow-studio.git
cd autoflow-studio
pnpm install
cp .env.example .env.local   # no values needed for fixture mode
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000).

To seed the execution dashboard with realistic fixture data:

```bash
pnpm seed:executions   # 100 fixture runs across 5 workflow templates
pnpm seed:billing      # mock subscription states + invoices
```

---

## Running Tests

```bash
pnpm typecheck          # TypeScript strict check
pnpm lint               # Biome lint + format
pnpm test               # Vitest unit tests (includes RLS pgTAP suite)
pnpm test:e2e           # Playwright end-to-end
```

---

## Environment Variables

See [`.env.example`](.env.example) for the full list. All variables are optional in fixture mode.

| Variable | Required (live mode) | Description |
|---|---|---|
| `APP_MODE` | No | `fixture` (default) or `live` |
| `NEXT_PUBLIC_SUPABASE_URL` | Live only | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Live only | Supabase anon key |
| `SUPABASE_SERVICE_ROLE_KEY` | Live only | Server-side Supabase key |
| `STRIPE_SECRET_KEY` | Live only | Stripe secret (never commit) |
| `STRIPE_WEBHOOK_SECRET` | Live only | Stripe webhook signing secret |
| `N8N_WEBHOOK_SECRET` | Live only | HMAC secret for n8n events |
| `WORKOS_API_KEY` | Enterprise only | WorkOS API key |
| `WORKOS_CLIENT_ID` | Enterprise only | WorkOS OAuth client ID |

---

## Documentation

- [`ARCHITECTURE.md`](ARCHITECTURE.md) — system design, adapter pattern, data flow
- [`SECURITY.md`](SECURITY.md) — security policy, disclosure, RLS guarantees
- [`docs/threat-model.md`](docs/threat-model.md) — STRIDE threat analysis
- [`docs/adr/`](docs/adr/) — architecture decision records
- [`CONTRIBUTING.md`](CONTRIBUTING.md) — contribution guide
- [`CHANGELOG.md`](CHANGELOG.md) — phase-by-phase changelog

---

## License

MIT © [Rex Owen Quintenta](https://github.com/RexOwenDev)
