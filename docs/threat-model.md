# Threat Model — AutoFlow Studio

> STRIDE analysis. Updated each phase. Last updated: 2026-04-22 (Phase 0).

## System Context

AutoFlow Studio is a multi-tenant SaaS. Multiple organizations share one Postgres instance, isolated via RLS. The application accepts inbound webhooks from n8n and Stripe. Clients interact via a Next.js web app.

**Trust boundaries:**
1. Public internet → Next.js app (authenticated routes require session)
2. n8n cloud → `/api/webhooks/n8n` (HMAC verified)
3. Stripe → `/api/webhooks/stripe` (Stripe-Signature verified)
4. Next.js server → Supabase (service role key, server-only)
5. Supabase RLS → per-row org-scoping for all client queries

---

## STRIDE Threat Matrix

### Spoofing

| Threat | Target | Mitigation | Status |
|---|---|---|---|
| Impersonate another tenant via forged JWT | Supabase RLS | RLS policies use `auth.uid()` — JWT is verified by Supabase, not application code | ✅ Mitigated |
| Forge n8n webhook payload | `/api/webhooks/n8n` | HMAC-SHA256 signature verification; reject without valid signature | ✅ Mitigated |
| Forge Stripe webhook | `/api/webhooks/stripe` | `stripe.webhooks.constructEvent()` with signing secret | ✅ Mitigated |
| Session fixation on invite redemption | Auth flow | Invite token single-use; session rotated after redemption | ✅ Mitigated |

### Tampering

| Threat | Target | Mitigation | Status |
|---|---|---|---|
| Modify another tenant's workflow via API | Server actions | All mutations scoped to `auth.uid()` org membership; RLS double-checks at DB | ✅ Mitigated |
| Delete or edit audit log entries | `audit_events` table | DB-level trigger blocks UPDATE/DELETE; service role cannot override trigger | ✅ Mitigated |
| Tamper webhook body in transit | n8n/Stripe inbound | TLS 1.2+ mandatory; signature covers full raw body | ✅ Mitigated |
| SQL injection via config forms | Workflow config | Supabase parameterized queries; Zod validates all input before DB touch | ✅ Mitigated |

### Repudiation

| Threat | Target | Mitigation | Status |
|---|---|---|---|
| User denies performing a workflow mutation | Audit trail | `audit_events` records actor, action, resource, timestamp (DB clock) | ✅ Mitigated |
| Dispute over which plan tier was active at billing event | Billing | Stripe events stored with timestamp; plan state snapshotted in `billing_subscriptions` | ✅ Mitigated |
| Webhook replay disputed | n8n execution | `webhook_inbox` stores received_at; replay window enforced | ✅ Mitigated |

### Information Disclosure

| Threat | Target | Mitigation | Status |
|---|---|---|---|
| Cross-tenant data leak via API | All data routes | RLS denies by default; pgTAP cross-tenant denial tests | ✅ Mitigated |
| Secrets exposed in error responses | API routes | Error handlers strip internal detail; Sentry captures server-side only | ✅ Mitigated |
| Environment variables leaked via client bundle | Next.js | `server-only` imports on all lib modules; `NEXT_PUBLIC_` prefix discipline | ✅ Mitigated |
| Webhook secret exposed in logs | Webhook handlers | Raw body + signature headers never logged; only event ID and type | ✅ Mitigated |
| Audit log accessible to wrong tenant | `audit_events` | RLS policy: `org_id = auth.jwt()->'org_id'`; only own org's events visible | ✅ Mitigated |

### Denial of Service

| Threat | Target | Mitigation | Status |
|---|---|---|---|
| Webhook flood from compromised n8n | `/api/webhooks/n8n` | Rate limiting: 100 req/min per source IP (Phase 1 middleware) | 🚧 Phase 1 |
| Execution table bloat per tenant | Supabase | Per-org execution retention policy (90 days default, configurable) | 🚧 Phase 5 |
| Billing meter manipulation via replayed events | Stripe webhook | Idempotency table deduplicates by `stripe_event_id` | ✅ Mitigated |
| Large webhook payload OOM | Webhook routes | Body size limit enforced at Next.js route config (`sizeLimit: '256kb'`) | 🚧 Phase 5 |

### Elevation of Privilege

| Threat | Target | Mitigation | Status |
|---|---|---|---|
| Member promotes self to Owner | Org membership | Role mutation requires current Owner session; DB constraint on role enum | ✅ Mitigated |
| Free plan user accesses Pro features | Plan-gated features | GrowthBook feature flags + server-side plan check on every feature access | 🚧 Phase 6 |
| Tenant accesses Enterprise SSO without paying | WorkOS SSO | SSO config UI and WorkOS API calls gated to Enterprise plan check in middleware | 🚧 Phase 7 |
| API route accessed without session | All `(app)` routes | Middleware enforces session + org membership before any route handler runs | ✅ Mitigated (Phase 3) |

---

## Data Classification

| Data | Classification | Retention | Location |
|---|---|---|---|
| Workflow configuration | Tenant-confidential | Until deleted by tenant | `workflows` table (RLS) |
| Execution logs | Tenant-operational | 90 days rolling | `executions`, `execution_events` (RLS) |
| Audit log | Tamper-evident / compliance | Configurable (default 90 days) | `audit_events` (append-only) |
| Billing data | Financial | Indefinite | `billing_subscriptions`, Stripe |
| Auth tokens | Session-critical | Session lifetime | Supabase Auth (httpOnly cookie) |
| Webhook payloads | Transit-only | Not stored (processed + discarded) | `webhook_inbox` (raw body not persisted) |

---

## Assumptions & Out-of-Scope

**Assumed secure:**
- Supabase infrastructure (Postgres, Auth, Realtime)
- Stripe infrastructure and payment processing
- n8n Cloud infrastructure
- WorkOS identity platform

**Out of scope for this portfolio skeleton:**
- DDoS mitigation at CDN/network layer (Cloudflare, AWS Shield)
- Physical security
- Insider threat (Supabase service role compromise)

---

## Update Log

| Date | Phase | Changes |
|---|---|---|
| 2026-04-22 | 0 | Initial STRIDE matrix. Threats marked 🚧 for future phases. |
