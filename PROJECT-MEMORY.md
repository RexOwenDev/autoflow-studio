# PROJECT-MEMORY — AutoFlow Studio

> Canonical truth for all models (Claude Opus, Sonnet, Codex, Gemini).
> Never assume conversation context — everything Codex or Gemini needs is written here.

---

## Charter

| Field | Value |
|---|---|
| **Project** | AutoFlow Studio |
| **Type** | Portfolio showcase — enterprise-grade SaaS skeleton |
| **Repo** | `RexOwenDev/autoflow-studio` (private → public at v1.0.0) |
| **Local path** | `C:\Users\owenq\RexOwenDev\autoflow-studio\` |
| **Live production impact** | NO — no live API connections; fixture-only runtime |
| **Created** | 2026-04-22 |
| **Stack** | Next.js 16 · React 19 · TypeScript strict · Supabase (RLS) · Stripe SDK · n8n webhook contract · Tailwind v4 · Vitest · Playwright · Biome |
| **Auth** | Supabase Auth (Free/Pro) + WorkOS SAML/SCIM (Enterprise tier, Phase 7) |
| **API mocking** | Fixture-only: `APP_MODE=fixture` (default). All SDKs behind adapter interfaces. `pnpm dev` runs on fresh clone, zero keys. |
| **Portfolio impact** | Closes: RocketAMS, 2X, OpenClaw, Guesty, Concinnity, Pearl Talent |

---

## AI Council Assignments

| Role | Model | Responsibilities |
|---|---|---|
| **General Manager** | Claude Opus 4.7 | Planning, routing, phase gates, Dispatch Briefs, work-split decisions |
| **Primary Coder** | Claude Sonnet 4.6 | UI, product logic, user-facing surfaces, component library |
| **Co-Implementer + Adversarial Reviewer** | Codex GPT-5.4 | API routes, DB schema, RLS policies, security, tests, middleware, config |
| **3rd Opinion** | Gemini CLI | Long-context audits, architecture challenges, security second-opinion |

**Tandem rule:** Sonnet and Codex lanes run in parallel every phase. Never serialized.

**Gemini invocation:**
```bash
# Phase audit
cat PROJECT-MEMORY.md docs/threat-model.md | gemini -p "$(cat ~/.gemini/personas/long-context-auditor.md)" --yolo

# RLS second opinion
cat supabase/migrations/*.sql | gemini -p "$(cat ~/.gemini/personas/security-second-opinion.md)" --yolo

# Pre-push final
git diff main | gemini -p "$(cat ~/.gemini/personas/adversarial-architecture.md)" --yolo
```

---

## Stack Patterns Applied

- [ ] `otel-nextjs` — OpenTelemetry (Phase 1)
- [ ] `audit-log-supabase` — SOC2-aligned append-only audit (Phase 5)
- [ ] `feature-flags-growthbook` — GrowthBook feature kill-switches (Phase 6)
- [ ] `saml-workos` — Enterprise SSO/SCIM (Phase 7)

Patterns at `C:\Users\owenq\RexOwenDev\rex-stack-patterns\`

**Reusable assets (do not reinvent):**
- `saas-billing-starter/supabase/migrations/001_organizations.sql` — RLS org/member skeleton
- `saas-billing-starter/src/app/api/webhooks/stripe/route.ts` — idempotent webhook handler
- `saas-billing-starter/src/lib/billing/{features,limits}.ts` — tier/feature gating
- `seobot/README.md` — hero/architecture/feature-table layout reference

---

## Adapter Interface Contract

Every external SDK is wrapped. The adapter is selected via `APP_MODE` env var (default `fixture`).

```
src/lib/
  stripe/adapter.ts       → StripeAdapter interface + FixtureStripeAdapter | LiveStripeAdapter
  n8n/adapter.ts          → N8nAdapter interface + FixtureN8nAdapter | LiveN8nAdapter
  supabase/adapter.ts     → SupabaseAdapter interface + PGliteAdapter | LiveSupabaseAdapter
```

**Hard constraint:** No file outside `src/lib/*/adapter.ts` may import the live SDK directly. Import the adapter interface only. Enforced by Biome import rules.

---

## Security Non-Negotiables (enforced every phase)

- RLS denies by default; every table has explicit ALLOW policy + pgTAP cross-tenant denial test
- `import 'server-only'` on all server modules
- Stripe + n8n webhooks: raw body preserved, HMAC/signature verify, idempotency table, 5-minute replay window check
- Zod validation at every server action and route handler boundary
- No secrets committed; `.env.example` only; `gitleaks` in CI on every push
- CSP headers (strict), HSTS, SameSite=Strict cookies, rate limiting on auth + webhook routes
- Dependabot + `pnpm audit --audit-level=high` in CI; lockfile pinned
- CODEOWNERS gates: Stripe webhook + auth middleware + RLS migrations require review
- STRIDE threat model updated each phase (see `docs/threat-model.md`)

---

## Phase Plan

### Phase 0: Charter & Repo

**Status:** `COMPLETE`
**Goal:** Establish repo structure, governance docs, threat model, Gemini Phase 0 audit.

#### Dispatch Brief
**Hard constraints:**
- No live API calls — fixture-only
- Git history must be clean (signed commits, no secrets)
- SECURITY.md and threat model must exist before any code lands

**Files (Opus lane — no tandem split for Phase 0):**
- [x] `PROJECT-MEMORY.md`
- [ ] `README.md` — hero skeleton
- [ ] `SECURITY.md` — disclosure policy
- [ ] `docs/threat-model.md` — STRIDE threat matrix
- [ ] `docs/adr/0001-multi-tenant-rls.md` — ADR
- [ ] `CODEOWNERS`
- [ ] `LICENSE`
- [ ] `.gitignore`
- [ ] `.env.example`
- [ ] `.github/workflows/ci.yml` — skeleton (Phase 1 fills body)

**Council Gate:**
- [x] Gemini Phase 0 audit: PASSED with 1 CRITICAL, 5 HIGH, 4 MEDIUM findings. All triaged and written to phase Dispatch Briefs above.

#### Phase Log
```
2026-04-22 — Phase 0 started. Repo initialized at RexOwenDev/autoflow-studio.
             Decisions: private until v1.0.0, fixture-only API mocking,
             Supabase Auth default + WorkOS Enterprise tier.
2026-04-22 — Phase 0 COMPLETE. Committed v0.1.0-phase0. Gemini audit complete.
             11 findings triaged: CRITICAL (service role RLS bypass) + HIGH items
             promoted to Phase 1 + Phase 2 hard constraints. Phase 1 ready to dispatch.
```

---

### Phase 1: Foundation

**Status:** `COMPLETE` (v0.2.0-phase1)
**Goal:** Next.js 16 scaffold, CI, OTel, design tokens, layout shell.

#### Dispatch Brief
> Fill before dispatching Sonnet + Codex.

**Sonnet lane:**
- [ ] Next.js 16 app router scaffold — M — layout shell, Tailwind v4, design tokens, font setup
- [ ] Global error boundary + loading skeletons — S
- [ ] `src/components/ui/` — shadcn base components — M

**Codex lane (spark):**
- [ ] TypeScript strict config + Biome + Vitest + Playwright — S
- [ ] GitHub Actions CI matrix (typecheck, lint, test, e2e) — M
- [ ] Husky pre-commit (Biome format + lint-staged) — S
- [ ] Install `otel-nextjs` pattern from rex-stack-patterns — M
- [ ] `gitleaks` CI job — S

**Integration:** Codex CI runs against Sonnet's scaffold. Sonnet doesn't merge until CI green.

**Hard constraints (upgraded from Gemini Phase 0 audit):**
- `runtime: "nodejs"` on all webhook routes (raw body preservation)
- No `"use client"` on data-fetching components
- OTel must not instrument fixture adapters
- [CRITICAL from audit] Default-deny middleware stub MUST exist by end of Phase 1. Allowlist: `/api/webhooks/*`, `/auth/*`, `/`. All other routes → 401 redirect.
- [HIGH from audit] Webhook route config: `sizeLimit: '1mb'` on Stripe routes, `'5mb'` on n8n routes. Set in Phase 1.
- [HIGH from audit] Boot-time guard: if `NODE_ENV !== 'development'` and `APP_MODE` is undefined → throw fatal error.
- [HIGH from audit] Gitleaks in Husky pre-commit hook (not just CI).
- [MEDIUM from audit] `pnpm audit --audit-level=moderate` in CI (not high).

**QA Checklist:**
- [ ] `pnpm typecheck` clean
- [ ] `pnpm lint` clean
- [ ] `pnpm test` green
- [ ] `pnpm build` succeeds

---

### Phase 2: Multi-Tenant Schema + RLS

**Status:** `COMPLETE — council gate PASSED with fixes` (v0.3.0-phase2 → v0.3.1-phase2-fixes)
**Council gate:** see `docs/phase-2-council-gate.md`. Codex adversarial returned CONDITIONAL (1 CRITICAL + 3 HIGH + 4 MEDIUM + 3 LOW); all in-scope items fixed. Gemini second-opinion deferred to Phase 7 final pre-push (credits depleted on `ai.studio` project — Owen to top up before that gate).
**Goal:** Full Postgres schema with RLS. Cross-tenant access provably denied.

#### Dispatch Brief

**Codex lane (gpt-5.4 — security-critical):**
- [x] `supabase/migrations/001_organizations.sql` — org + org_members + invites + RLS (EXISTS pattern, helper fns is_organization_member + has_organization_role)
- [x] `supabase/migrations/002_workflows.sql` — workflows + workflow_versions (versions append-only)
- [x] `supabase/migrations/003_executions.sql` — executions + execution_events + idempotency unique idx
- [x] `supabase/migrations/004_webhook_inbox.sql` — webhook_inbox + idempotency unique + replay window column
- [x] `supabase/migrations/005_audit_events.sql` — append-only triggers (UPDATE + DELETE + TRUNCATE all blocked, REVOKE belt-and-braces)
- [x] `supabase/migrations/006_billing.sql` — billing_subscriptions + webhook_events idempotency ledger
- [x] `supabase/tests/rls/cross-tenant-denial.test.sql` — pgTAP, 3 tenants, 18 assertions
- [x] `supabase/tests/rls/append-only-audit.test.sql` — pgTAP, 7 assertions including TRUNCATE

**Sonnet lane:**
- [x] `src/lib/supabase/adapter.ts` — interface + factory; live throws (Phase 3 wires @supabase/ssr)
- [x] `src/lib/supabase/fixture-adapter.ts` + `fixtures.ts` — deterministic in-memory data, 2 orgs (Acme + Beta-empty proves isolation)
- [x] `src/types/database.ts` — hand-authored row types matching migrations
- [x] `src/lib/db/` — orgs, workflows, executions, audit, billing query helpers with `server-only` guard
- [x] Dashboard rewired to use real data layer via Promise.all parallel fetches

**Integration:** Codex schema → Sonnet types generated → Sonnet query helpers use types.

**Hard constraints (includes Gemini Phase 0 audit upgrades):**
- RLS DENY by default on all tables — no policy = no access
- `audit_events` must have a trigger preventing UPDATE/DELETE *and* TRUNCATE at DB level
- Cross-tenant denial test MUST exist before Phase 2 can close
- [CRITICAL from audit] All user-context queries use `createServerClient` with user session JWT. Service role key NEVER passed to user-context Supabase client — reserved for background jobs + webhook handlers only.
- [HIGH from audit] RLS policies MUST use `EXISTS (SELECT 1 FROM organization_members m WHERE m.user_id = auth.uid() AND m.org_id = [table].org_id)` — NOT the scalar `app_metadata.org_id` JWT claim. Supports multi-org users + avoids stale-token bypass.

**Council Gate:**
- [x] `/codex:adversarial-review` on migrations + RLS policies — CONDITIONAL → fixes applied (CRITICAL admin-promote, HIGH workflow_versions composite FK, HIGH last-owner trigger, HIGH audit admin-only, MEDIUM webhook idempotency CHECK, MEDIUM tamper-proof docs, MEDIUM pgTAP coverage 18→34 + 7→11, LOW case-insensitive idempotency, LOW Stripe IDs owner-only via member-safe view, LOW pgTAP exact SQLSTATE)
- [ ] Gemini RLS second opinion — DEFERRED to Phase 7 final pre-push (credits depleted, both keys returned 429)

---

### Phase 3: Auth & Workspaces

**Status:** `COMPLETE` (v0.4.0-phase3)
**Goal:** Supabase Auth wired, workspace switcher, member invite flow, role-based UI.

#### Dispatch Brief

**Sonnet lane:**
- [x] `src/app/auth/` — sign-in, sign-up, magic link, forgot-password, accept-invite (real segment, not route group — matches proxy allowlist `/auth/*`)
- [x] Sidebar refactored to accept `activeOrg / availableOrgs / user` props; workspace switcher dropdown with "new workspace" CTA
- [x] `src/app/(app)/settings/members/page.tsx` — member list with role pills (Owner/Admin/Member), role-aware invite form, pending invites list, revoke buttons
- [x] Session provider pattern via server-only helpers (`getSession`, `requireSession`, `getCurrentUserOrganizations`) — no client session provider needed; Next 15+ server components resolve per-request

**Codex lane (gpt-5.4):**
- [x] `src/proxy.ts` — session cookie guard (pattern matches `sb-<ref>-auth-token` + legacy `sb-access-token`), fixture-mode bypass, public path allowlist
- [x] `src/lib/auth/{adapter,session}.ts` — AuthAdapter interface + FixtureAuthAdapter (auto-session) + Live stub; server-only helpers
- [x] `src/app/api/auth/invites/actions.ts` — `sendInvite`, `revokeInvite`, `acceptInvite` server actions with Zod validation + role-aware authz mirroring DB policy split (admin can't grant owner)
- [x] No new migration — `organization_invites` already in `001_organizations.sql` with 48h expiry constraint + single-pending unique index
- [x] `src/tests/auth/bypass-attempt.test.ts` — 21 assertions: protected paths redirect to /auth/sign-in in live mode; public paths pass; cookie spec strict (no sb-* prefix abuse, no header smuggling); fixture mode bypass verified

**Hard constraints:**
- [x] Proxy enforces session cookie before every `(app)` route
- [x] Invite tokens expire in 48h (DB constraint `expires_at > created_at` + Phase 7 will enforce 48h at app layer)
- [x] Single-use enforced at DB level via `accepted_consistency` CHECK + `status` transition

---

### Phase 4: Workflow Templates + Configuration

**Status:** `COMPLETE` (v0.5.0-phase4)
**Goal:** Template gallery, JSON-schema config forms, 5 fixture templates.

#### Dispatch Brief

**Sonnet lane:**
- [ ] `src/app/(app)/templates/` — gallery page + template card grid
- [ ] `src/components/workflow/ConfigForm.tsx` — Zod+react-hook-form JSON-schema renderer
- [ ] `src/components/workflow/PreviewPane.tsx` — template preview sidebar
- [ ] `src/app/(app)/workflows/[id]/configure/` — workflow config page

**Codex lane (spark):**
- [ ] `src/lib/templates/schema.ts` — template Zod schema + versioning
- [ ] `supabase/migrations/008_template_seeds.sql` — 5 fixture templates:
  - Lead Capture Webhook
  - Slack Notifier
  - CSV-to-Sheets
  - Webhook-to-Email
  - Daily Digest
- [ ] `src/lib/templates/validator.ts` — template config validation
- [ ] `tests/templates/schema-fuzz.test.ts` — fuzz schema validation edge cases

---

### Phase 5: n8n Webhook Ingest + Execution Dashboard

**Status:** `COMPLETE` (v0.6.0-phase5) — Gemini diff review deferred to Phase 7 (credits)
**Goal:** Webhook receiver, execution dashboard (realtime), audit log installed.

#### Dispatch Brief

**Codex lane (gpt-5.4 — security-critical):**
- [ ] `src/app/api/webhooks/n8n/route.ts` — HMAC verify, idempotent insert into `webhook_inbox`, fan-out to `executions`, 5-min replay window, signed retry endpoint
- [ ] `src/lib/n8n/adapter.ts` — N8nAdapter interface + FixtureN8nAdapter
- [ ] `scripts/seed-executions.ts` — deterministic n8n event generator (100 fixture runs, varied statuses)
- [ ] `tests/webhooks/n8n-replay.test.ts` — replay attack blocked
- [ ] `tests/webhooks/n8n-hmac.test.ts` — bad signature → 401
- [ ] Install `audit-log-supabase` pattern — wire to workflow create/update/delete/activate

**Sonnet lane:**
- [ ] `src/app/(app)/executions/` — live execution table (Supabase Realtime)
- [ ] `src/components/execution/StatusPill.tsx` — success/running/failed/retrying
- [ ] `src/components/execution/RunDetailDrawer.tsx` — event timeline + retry button
- [ ] Filters: by workflow, status, date range
- [ ] `src/app/(app)/audit/` — audit log timeline UI

**Council Gate:**
- [ ] Gemini diff review (webhook ingest + RLS interaction)

---

### Phase 6: Stripe Billing

**Status:** `COMPLETE` (v0.7.0-phase6)
**Goal:** Metered execution billing, plan tiers, fixture-only (no live keys).

#### Dispatch Brief

**Codex lane (gpt-5.4):**
- [ ] Port `saas-billing-starter/src/app/api/webhooks/stripe/route.ts` — adapt for execution metering
- [ ] `src/lib/stripe/adapter.ts` — StripeAdapter + FixtureStripeAdapter
- [ ] `scripts/seed-stripe-fixtures.ts` — mock subscription states + invoices
- [ ] Plan tier enforcement: Free (100 runs/mo), Pro (10k/mo), Enterprise (unlimited + SSO)
- [ ] `tests/billing/webhook-idempotency.test.ts` — duplicate event ignored
- [ ] `tests/billing/signature-verify.test.ts` — bad sig → 401

**Sonnet lane:**
- [ ] `src/app/(marketing)/pricing/` — pricing page, feature matrix table
- [ ] `src/components/billing/PlanSwitcher.tsx` — plan upgrade modal
- [ ] `src/components/billing/UsageMeter.tsx` — execution count vs. limit bar
- [ ] `src/components/billing/InvoiceList.tsx` — invoice history (fixture data)
- [ ] Upgrade-required modal (plan-gated feature lock)
- [ ] Install `feature-flags-growthbook` — gate Pro+ features

**Hard constraints:**
- No Stripe secret key committed under any circumstances
- `APP_MODE=fixture` must make billing fully functional with zero external calls

---

### Phase 7: Enterprise Tier — SSO + Audit Export + Observability

**Status:** `COMPLETE` (v0.8.0-phase7) — Gemini whole-repo audit still deferred (credits)
**Goal:** WorkOS SAML/SCIM for Enterprise plan, audit export, OTel dashboards.

#### Dispatch Brief

**Codex lane (gpt-5.4):**
- [ ] Install `saml-workos` pattern — wire to Enterprise plan gate
- [ ] `src/app/api/audit/export/route.ts` — CSV + JSON export, org-scoped, rate-limited
- [ ] Retention policy: audit events older than 90 days archived (fixture only)
- [ ] OTel sampling config tuned for dashboard screenshots

**Sonnet lane:**
- [ ] `src/app/(app)/settings/sso/` — SSO config UI (SAML metadata upload, SCIM token)
- [ ] `src/app/(app)/settings/audit/` — audit log export UI (date range, format select)
- [ ] Enterprise badge + SSO active indicator in workspace switcher

**Council Gate:**
- [ ] Gemini whole-repo audit (full file list piped)

---

### Phase 8: Documentation, Visuals, Release

**Status:** `COMPLETE — docs ship, repo stays PRIVATE` (v1.0.0)
**Gemini visuals:** DEFERRED (personal AI Studio credits depleted). Phase 8 adversarial pre-push review also deferred until credits replenish — will run as a single comprehensive pass covering Phase 2/5/7/8 gates before any public flip.
**Public flip:** ON HOLD per Owen (2026-04-22). Repo remains private until Gemini gate closes.
**Goal:** Enterprise README, Gemini visual suite, v1.0.0 release, flip to public.

#### Dispatch Brief

**Gemini visual generation (12–15 assets):**
- Hero banner 1600×600 (dark, technical, SaaS aesthetic)
- System architecture diagram (Mermaid + rendered SVG)
- Sequence diagrams: n8n→AutoFlow→metering, SSO flow, audit trail
- Per-phase preview cards (8 cards)
- RLS security model diagram
- Execution dashboard screenshot mockup

**Opus lane (no code — docs only):**
- [ ] `README.md` — enterprise README (hero, architecture, feature matrix, RLS guarantees, API reference, deployment, security model, phase timeline)
- [ ] `ARCHITECTURE.md` — full system design, adapter pattern, data flow
- [ ] `SECURITY.md` — finalized threat model summary, RLS proofs, disclosure policy
- [ ] `docs/adr/` — ADRs 0001–0006 (one per major decision)
- [ ] `CONTRIBUTING.md` — contribution guide
- [ ] `CHANGELOG.md` — phase-by-phase changelog
- [ ] v1.0.0 GitHub release
- [ ] Flip repo to public

**Final Council Gate:**
- [ ] Gemini adversarial pre-push review (diff from initial commit to v1.0.0)
- [ ] `gitleaks detect --no-git` clean
- [ ] All CI checks green on main

---

## Gemini Phase 0 Audit Findings (2026-04-22)

All findings must be addressed before their respective phases close. CRITICAL/HIGH items upgraded to hard constraints in relevant phase Dispatch Briefs.

| Severity | Finding | Phase to fix |
|---|---|---|
| CRITICAL | Service role key bypasses RLS — Next.js server MUST use user session JWT (`createServerClient` from `@supabase/ssr`) for all user-context queries. Service role restricted to background jobs + webhooks only. | Phase 2 |
| HIGH | Webhook body limits deferred to Phase 5 — OOM vector. Move `sizeLimit: '1mb'` (Stripe) + `'5mb'` (n8n) to Phase 1 middleware/route config. | Phase 1 |
| HIGH | `APP_MODE` fail-open — if env var missing in prod, app silently boots in fixture mode. Fix: throw fatal error at boot if `APP_MODE` is undefined in non-development environments. | Phase 1 |
| HIGH | Middleware deferred to Phase 3 — build Phase 1 default-deny middleware stub immediately; allowlist only `/api/webhooks/*` and auth routes. Prevents unprotected routes accumulating before Phase 3. | Phase 1 |
| HIGH | RLS JWT single-org claim — scalar `app_metadata.org_id` breaks multi-org enterprise users + stale auth (1h token validity after eviction). Switch to `EXISTS (SELECT 1 FROM memberships WHERE user_id = auth.uid() AND org_id = table.org_id)` pattern. | Phase 2 |
| HIGH | Gitleaks only in CI — secret already committed by the time CI catches it. Add Gitleaks to Husky pre-commit hook. CI check stays as fallback. | Phase 1 |
| MEDIUM | Webhook replay TOCTOU — concurrent replay race on `SELECT` + `INSERT`. Fix: `UNIQUE(provider, event_id)` + catch Postgres `23505` unique_violation in adapter. | Phase 5 |
| MEDIUM | `audit_events` TRUNCATE bypass — add `BEFORE TRUNCATE` statement-level trigger. Document external SIEM streaming as enterprise requirement. | Phase 5 |
| MEDIUM | GrowthBook client-side flag tampering — all plan gate evaluations must run server-side (`server-only`). Billing plan re-checked against DB on every gated server action. | Phase 6 |
| MEDIUM | `pnpm audit --audit-level=moderate` (not high) — chains of moderate CVEs can be exploited. Add Socket.dev or Snyk for behavioral analysis. | Phase 1 |
| PORTFOLIO | React 19 `taint` APIs — use `experimental_taintUniqueValue` + `experimental_taintObjectReference` on sensitive Supabase objects to prevent SSR data leaks. Signals senior enterprise architecture knowledge. | Phase 3 |

---

## Parked Questions

*(empty)*

---

## Context Checkpoints

### Checkpoint 2026-04-22 — Phase 0 COMPLETE

**Current phase:** Phase 0 — COMPLETE. Moving to Phase 1.
**Codex lane:** Not yet dispatched (Phase 1 start)
**Next action:** Phase 1 — Sonnet (Next.js scaffold) + Codex (CI, Biome, OTel, default-deny middleware, gitleaks pre-commit) in parallel
**Key constraints from Gemini audit to preserve:**
- Default-deny middleware in Phase 1 (not Phase 3)
- Webhook body limits in Phase 1
- Boot-time APP_MODE guard in Phase 1
- RLS via memberships table (not JWT scalar claim) in Phase 2
- Service role key never in user-context queries
**Parked questions:** None
