# Changelog

All notable changes to AutoFlow Studio are documented here. The format is based on
[Keep a Changelog](https://keepachangelog.com/en/1.1.0/). This project uses phase-tagged
semver: `v<major>.<minor>.<patch>-phase<N>` for phase releases, plain `v<major>.<minor>.<patch>`
for the 1.0 milestone.

## [1.0.0] — 2026-04-22

**Release prep.** No functional changes; documentation, ADRs, and changelog.

### Added
- Enterprise-focused `README.md` with feature matrix, architecture diagram, security model summary, tech stack, phase timeline, repo layout
- `ARCHITECTURE.md` — full system design, adapter pattern, request lifecycle, data model, deployment topology
- `SECURITY.md` refresh — accurate test counts, Codex council-gate fix summary, deferred Gemini gates documented
- ADRs `0002` – `0006`:
  - `0002-fixture-first-adapters`
  - `0003-append-only-audit-at-db-level`
  - `0004-hmac-webhook-pattern`
  - `0005-plan-gates-single-source`
  - `0006-biome-over-eslint-prettier`
- `CONTRIBUTING.md` — local dev, migration rules, commit style, phase gate workflow, AI Council explainer
- `CHANGELOG.md` — this file

### Status
- Repo remains **private**. Public release flip is deferred until the Gemini whole-repo audit runs (personal AI Studio credits depleted).
- Deferred Gemini gates (will run in one comprehensive pass before public):
  - Phase 2 RLS second opinion
  - Phase 5 webhook × RLS diff review
  - Phase 7 whole-repo audit
  - Phase 8 final adversarial pre-push

---

## [0.8.0-phase7] — 2026-04-22

Enterprise tier: WorkOS SSO/SCIM, audit export, rate limiting, plan gates.

### Added
- `src/lib/sso/adapter.ts` — `WorkOSAdapter` interface + `FixtureWorkOSAdapter`
- `supabase/migrations/009_sso_config.sql` — `sso_connections` + `scim_tokens` (owner-only RLS, SHA-256 hashed tokens)
- `src/lib/audit/export.ts` — CSV + JSON serializers with OWASP injection defense (prefix `= + - @ TAB CR` cells with `'`)
- `src/lib/rate-limit.ts` — in-memory token-bucket limiter (Phase 8+: Upstash swap)
- `src/app/api/audit/export/route.ts` — GET endpoint with admin+ role gate, Pro+ plan gate, 10/hour rate limit, 366-day range ceiling
- `src/app/api/sso/actions.ts` — `createScimToken`, `revokeScimToken` (owner + Enterprise plan gate)
- `src/app/(app)/settings/sso/page.tsx` — SAML connection display, SCIM token management with copy-once secret UX
- `src/app/(app)/settings/audit/page.tsx` — date range picker, CSV/JSON format selector, recent exports
- Sidebar: Enterprise plan Crown icon + SSO-active ShieldCheck indicator on active org; new nav entries for SSO and Audit Export
- OTel sampling docblock explaining production 10% rationale
- 27 new tests (audit export: 19, rate limiter: 5, +3 for bypass allowlist)

### Total test count: 120

---

## [0.7.0-phase6] — 2026-04-22

Stripe billing (fixture-only) — pricing page, plan switcher, usage meter, invoices.

### Added
- `src/lib/stripe/signature.ts` — Stripe-Signature HMAC verify (wraps the n8n primitive)
- `src/lib/stripe/adapter.ts` — `StripeAdapter` + `FixtureStripeAdapter` with 6 months of fixture invoices
- `src/app/api/webhooks/stripe/route.ts` — full pipeline: size guard, signature + replay, shape check, dedup synth, handled-event-type tracking
- `src/lib/billing/plans.ts` — single source of truth: `PLAN_DEFINITIONS` + `computeUsageStatus` + `planAllowsFeature`
- `src/app/api/billing/actions.ts` — `startPlanChange`, `cancelSubscription` (owner-only)
- `src/app/pricing/page.tsx` — public marketing page with 3-plan grid + feature matrix; added to proxy allowlist
- `src/app/(app)/settings/billing/page.tsx` — owner-only billing hub (usage meter, plan switcher, invoice list, subscription sidebar)
- 14 new Stripe route tests

### Total test count: 93

---

## [0.6.0-phase5] — 2026-04-22

n8n webhook ingest + executions dashboard + audit log + 100 seeded runs.

### Added
- `src/lib/n8n/signature.ts` — HMAC-SHA256 verify with `timingSafeEqual` + replay window
- `src/lib/n8n/adapter.ts` — `N8nAdapter` + `FixtureN8nAdapter`
- `src/app/api/webhooks/n8n/route.ts` — size guard → headers → signature → body shape → dedup; identical 401 shape for all auth failures
- `src/lib/audit/log.ts` — `emitAuditEvent` with `SENSITIVE_KEY_PATTERNS` diff redaction
- `src/app/api/executions/actions.ts` — `retryExecution`, `cancelExecution` (emits audit events)
- `scripts/seed-executions.ts` — deterministic mulberry32 generator, 100 runs + 195 events across 5 workflows
- `src/components/execution/StatusPill.tsx` — icon + color per `ExecutionStatus`
- `src/app/(app)/executions/page.tsx` — filter row (status / range / workflow), paginated table
- `src/app/(app)/executions/[id]/page.tsx` — header, metrics, error callout, retry/cancel, event timeline, context sidebar
- `src/app/(app)/audit/page.tsx` — admin-only timeline with category badges + diff expansion
- Biome overrides for `src/tests/**` + `scripts/**` (relaxed noNonNullAssertion, useLiteralKeys, noUnusedVariables)
- 27 new tests (n8n signature: 12, n8n route: 15)

### Total test count: 78

---

## [0.5.0-phase4] — 2026-04-22

Workflow Templates + Configuration — gallery, JSON-schema forms, 5 fixture templates.

### Added
- `src/lib/templates/schema.ts` — Zod schemas for `Template` + `ConfigField` discriminated union (`text/email/url/number/boolean/select/secret`)
- `supabase/migrations/008_template_seeds.sql` — `workflow_templates` table + 5 seed rows (Lead Capture, Slack Notifier, CSV-to-Sheets, Webhook-to-Email, Daily Digest)
- `src/lib/templates/validator.ts` — `validateTemplateConfig` with prototype-pollution defense, secret scrubbing, unknown-field stripping, boolean-default honoring
- `src/lib/templates/fixtures.ts` + `src/lib/db/templates.ts`
- `src/components/workflow/ConfigForm.tsx` — client component rendering fields from template schema with reveal/hide toggle for secrets
- `src/app/(app)/templates/page.tsx` — gallery with category filter pills
- `src/app/(app)/templates/[slug]/page.tsx` — detail page with overview, fields list, preview pane
- `src/app/(app)/workflows/new/page.tsx` — new-from-template form with ConfigForm + preview
- `src/app/api/templates/actions.ts` — `useTemplate` + `saveWorkflowConfig` with FormData coercion (checkbox-absent = false, numeric strings → Number)
- `src/tests/shims/server-only.ts` + vitest alias — shim `server-only` in node tests
- 30 schema fuzz tests covering adversarial templates + configs

### Total test count: 51

---

## [0.4.0-phase3] — 2026-04-22

Auth + Workspaces — sign-in/up, workspace switcher, member invites, bypass tests.

### Added
- 5 auth pages under real `auth/` segment: `sign-in`, `sign-up`, `magic-link`, `forgot-password`, `accept-invite` (moved from `(auth)` route group so URLs match proxy allowlist `/auth/*`)
- `src/lib/auth/adapter.ts` — `AuthAdapter` interface + `FixtureAuthAdapter` (auto-session as Rex Quintenta / Acme Owner)
- `src/lib/auth/session.ts` — server-only `getSession` / `requireSession` / `getCurrentUserOrganizations`
- `src/proxy.ts` hardened: session cookie pattern `sb-<ref>-auth-token` + legacy `sb-access-token`; no prefix abuse, no header smuggling
- Sidebar refactored to accept `activeOrg / availableOrgs / user` as props; interactive workspace switcher
- `src/app/(app)/settings/members/page.tsx` — team list with role pills, role-aware invite form, pending invites
- `src/app/api/auth/invites/actions.ts` — `sendInvite`, `revokeInvite`, `acceptInvite` with Zod + role-aware authz mirroring DB policy split
- Dashboard wired to `session.activeOrganizationId`
- `src/tests/auth/bypass-attempt.test.ts` — 21 assertions covering protected path redirects, cookie strictness, public path allowance, fixture bypass

### Total test count: 21

---

## [0.3.1-phase2-fixes] — 2026-04-22

Codex adversarial council gate — 11 findings applied.

### Fixed
- **CRITICAL** admin → owner self-promotion: split `organization_members` UPDATE + INSERT policies
- **HIGH** workflow_versions cross-tenant integrity: composite FK `(workflow_id, organization_id) → workflows(id, organization_id)`
- **HIGH** last-owner orphan: `BEFORE DELETE` + `BEFORE UPDATE` triggers (SQLSTATE 23001)
- **HIGH** audit_events.diff leak: SELECT restricted to admin+
- **MEDIUM** webhook executions NULL idempotency_key: CHECK constraint
- **MEDIUM** tamper-proof overstatement: comment corrected, Phase 8+ ops doc tracked
- **MEDIUM** pgTAP coverage: cross-tenant 18 → 34 assertions; append-only 7 → 11 (INSERT...ON CONFLICT DO UPDATE, MERGE)
- **LOW** webhook_inbox case-sensitivity: unique index on `(source, lower(idempotency_key))`
- **LOW** Stripe IDs to all members: SELECT restricted to owner + `billing_subscription_member_view` (security_invoker)
- **LOW** pgTAP NULL SQLSTATE: assertions now check exact 42501 / 23001

### Gemini gate
Deferred — both API keys (personal + DesignShopp) returned 429 on `ai.studio`. Rolls into Phase 7/8 final pass.

---

## [0.3.0-phase2] — 2026-04-22

Multi-tenant schema + RLS + Supabase adapter (fixture-first).

### Added
- 6 migrations (`001_organizations` through `006_billing`) — all RLS deny-by-default + FORCE RLS
- `is_organization_member(uuid)` + `has_organization_role(uuid, role)` SECURITY DEFINER helpers (EXISTS pattern, Gemini Phase 0 HIGH fix)
- `audit_events` triggers blocking UPDATE, DELETE, AND TRUNCATE + REVOKE belt-and-braces
- 2 pgTAP suites: cross-tenant denial (18 initial assertions), append-only audit (7 initial assertions)
- `SupabaseAdapter` interface + `FixtureSupabaseAdapter` (deterministic data, 2 orgs with Beta empty to prove tenant isolation visually)
- `src/types/database.ts` — hand-authored row types
- `src/lib/db/{orgs,workflows,executions,audit,billing}.ts` — server-only query helpers
- Dashboard rewired to real data layer via `Promise.all` parallel fetches

---

## [0.2.0-phase1] — 2026-04-22

Foundation — Next.js 16 scaffold, Tailwind v4, OTel, default-deny proxy, CI/CD.

### Added
- Next.js 16 + React 19 + TypeScript strict++
- Tailwind v4 design system with CSS custom properties
- Layout shell: Sidebar + dashboard + UI primitives (Button/Badge/Card/Separator/Input)
- Biome v2 (lint + format in one tool)
- Vitest + happy-dom + @testing-library/react; Playwright e2e scaffolded
- GitHub Actions: CI (typecheck/lint/test/build), security (gitleaks + npm audit level=moderate)
- Husky pre-commit: gitleaks + lint-staged
- Gemini Phase 0 audit HIGH items: `APP_MODE` boot-time guard, default-deny proxy, webhook body limits, gitleaks in pre-commit, OTel fixture bypass

---

## [0.1.0-phase0] — 2026-04-22

Charter & governance — threat model, SECURITY, CODEOWNERS, CI skeleton.

### Added
- `PROJECT-MEMORY.md` — charter, personas, phase gates, veto matrix
- `README.md` hero skeleton + `SECURITY.md` + `docs/threat-model.md` (STRIDE)
- `CODEOWNERS`, `LICENSE` (MIT), `.env.example`
- CI skeleton (`.github/workflows/{ci,security}.yml`)
- Gemini Phase 0 audit — 11 findings triaged, all promoted to Phase 1 / 2 constraints

---

[1.0.0]: #100--2026-04-22
[0.8.0-phase7]: #080-phase7--2026-04-22
[0.7.0-phase6]: #070-phase6--2026-04-22
[0.6.0-phase5]: #060-phase5--2026-04-22
[0.5.0-phase4]: #050-phase4--2026-04-22
[0.4.0-phase3]: #040-phase3--2026-04-22
[0.3.1-phase2-fixes]: #031-phase2-fixes--2026-04-22
[0.3.0-phase2]: #030-phase2--2026-04-22
[0.2.0-phase1]: #020-phase1--2026-04-22
[0.1.0-phase0]: #010-phase0--2026-04-22
