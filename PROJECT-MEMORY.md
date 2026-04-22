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

**Status:** `IN-PROGRESS`
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
- [ ] Gemini Phase 0 audit: charter + threat model against SOC2-readiness checklist

#### Phase Log
```
2026-04-22 — Phase 0 started. Repo initialized at RexOwenDev/autoflow-studio.
             Decisions: private until v1.0.0, fixture-only API mocking,
             Supabase Auth default + WorkOS Enterprise tier.
```

---

### Phase 1: Foundation

**Status:** `PENDING`
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

**Hard constraints:**
- `runtime: "nodejs"` on all webhook routes (raw body preservation)
- No `"use client"` on data-fetching components
- OTel must not instrument fixture adapters

**QA Checklist:**
- [ ] `pnpm typecheck` clean
- [ ] `pnpm lint` clean
- [ ] `pnpm test` green
- [ ] `pnpm build` succeeds

---

### Phase 2: Multi-Tenant Schema + RLS

**Status:** `PENDING`
**Goal:** Full Postgres schema with RLS. Cross-tenant access provably denied.

#### Dispatch Brief

**Codex lane (gpt-5.4 — security-critical):**
- [ ] `supabase/migrations/001_organizations.sql` — org + org_members + invites + RLS
- [ ] `supabase/migrations/002_workflows.sql` — workflows + workflow_versions + RLS
- [ ] `supabase/migrations/003_executions.sql` — executions + execution_events + RLS
- [ ] `supabase/migrations/004_webhook_inbox.sql` — webhook_inbox + replay_guard + RLS
- [ ] `supabase/migrations/005_audit_events.sql` — audit_events (append-only) + RLS
- [ ] `supabase/migrations/006_billing.sql` — billing_subscriptions + webhook_events + RLS
- [ ] `tests/rls/cross-tenant-denial.test.ts` — pgTAP: 3 tenants, prove A cannot read B
- [ ] `tests/rls/append-only-audit.test.ts` — prove UPDATE/DELETE on audit_events denied

**Sonnet lane:**
- [ ] `src/lib/supabase/adapter.ts` — PGliteAdapter + LiveSupabaseAdapter
- [ ] `src/types/database.ts` — generated DB types (Supabase CLI)
- [ ] `src/lib/db/` — org, workflow, execution, audit query helpers (`server-only`)

**Integration:** Codex schema → Sonnet types generated → Sonnet query helpers use types.

**Hard constraints:**
- RLS DENY by default on all tables — no policy = no access
- `audit_events` must have a trigger preventing UPDATE/DELETE at DB level
- Cross-tenant denial test MUST exist before Phase 2 can close

**Council Gate:**
- [ ] Gemini RLS second opinion (pipe all migration SQL)
- [ ] `/codex:adversarial-review` on migrations + RLS policies

---

### Phase 3: Auth & Workspaces

**Status:** `PENDING`
**Goal:** Supabase Auth wired, workspace switcher, member invite flow, role-based UI.

#### Dispatch Brief

**Sonnet lane:**
- [ ] `src/app/(auth)/` — sign-in, sign-up, magic link, forgot password pages
- [ ] `src/app/(app)/` — workspace shell, sidebar, workspace switcher
- [ ] Member invite UI + role pills (Owner / Admin / Member)
- [ ] `src/components/auth/` — auth guard HOC, session provider

**Codex lane (gpt-5.4):**
- [ ] `src/middleware.ts` — session guard, org-scope enforcement, redirect logic
- [ ] `src/lib/auth/` — Supabase Auth server helpers, session utils (`server-only`)
- [ ] `src/app/api/auth/` — invite token create/redeem server actions
- [ ] `supabase/migrations/007_invites.sql` — invite tokens table + expiry + RLS
- [ ] `tests/auth/bypass-attempt.test.ts` — direct URL access without session = 401/redirect

**Hard constraints:**
- Middleware must enforce org-scoping before every `(app)` route
- Invite tokens expire in 48h; single-use enforced at DB level

---

### Phase 4: Workflow Templates + Configuration

**Status:** `PENDING`
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

**Status:** `PENDING`
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

**Status:** `PENDING`
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

**Status:** `PENDING`
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

**Status:** `PENDING`
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

## Parked Questions

*(empty)*

---

## Context Checkpoints

### Checkpoint 2026-04-22 — Phase 0 start

**Current phase:** Phase 0 — in-progress (writing governance docs)
**Codex lane:** Not dispatched yet
**Next action:** Complete Phase 0 file set → Gemini Phase 0 audit → commit tag v0.1.0-phase0
**Key constraints:** No live API calls; no secrets; SECURITY.md + threat model before any code
**Parked questions:** None
