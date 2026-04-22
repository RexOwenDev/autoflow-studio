# Contributing to AutoFlow Studio

## Getting set up

```bash
git clone <repo>
cd autoflow-studio
npm install
APP_MODE=fixture npm run dev
```

`http://localhost:3000/dashboard` loads signed in as Rex Quintenta (Owner of Acme Corp) with 100 seeded executions. No external accounts needed.

### Optional: gitleaks

```bash
# macOS
brew install gitleaks

# Windows (winget)
winget install zricethezav.gitleaks

# Manual
# https://github.com/gitleaks/gitleaks/releases
```

The pre-commit hook warns if gitleaks isn't installed but lets the commit through. CI catches any leak that slips past local.

---

## Project conventions

- **Adapter-first.** Any call to Supabase, Stripe, n8n, WorkOS, or Auth goes through `getXAdapter()`. Never import a vendor SDK directly outside the adapter file.
- **Server-only data access.** Files under `src/lib/db/` and `src/lib/{auth,audit,sso,stripe}` import `server-only`. Do not import them from client components — the build will fail.
- **RLS is the boundary.** Every new table needs a migration with RLS enabled, FORCE enabled, and at least one pgTAP assertion in `supabase/tests/rls/`.
- **Zod at every boundary.** Every server action starts with `z.object({...}).safeParse(formData)`. Every webhook validates body shape before business logic.
- **Fixture-first.** Any new data surface ships with a fixture alongside the interface. Fixture data is deterministic; use the existing mulberry32 PRNG pattern from `scripts/seed-executions.ts` when you need more than a handful of rows.

---

## Adding a migration

1. Create `supabase/migrations/XXX_<name>.sql` (sequential number; check existing files).
2. Enable RLS + FORCE RLS on every new table.
3. Add at least one policy per access pattern you want to allow; missing policy = no access.
4. If the table needs tenant scoping, use `is_organization_member(organization_id)` or `has_organization_role(organization_id, 'admin')` — not JWT claims.
5. Add a pgTAP test in `supabase/tests/rls/` proving at minimum that cross-tenant access returns 0 rows.
6. Update `src/types/database.ts` with the matching row type.
7. Update the `SupabaseAdapter` interface + `FixtureSupabaseAdapter`.

Migrations are forward-only. Never edit a published migration — add a new one.

---

## Adding a feature gated by plan

1. Add a field to `PLAN_DEFINITIONS[plan].features` in `src/lib/billing/plans.ts`.
2. Call `planAllowsFeature(plan, "your_feature")` at the enforcement site (server action or route handler) — return 402 upgrade_required if false.
3. In the UI, read the same flag to show upgrade CTAs.

No hardcoded limits or feature checks outside `plans.ts`.

---

## Running tests

```bash
# Vitest — unit + integration (runs in node environment, server-only shimmed)
npm test

# Single file
npm test -- src/tests/webhooks/n8n-route.test.ts

# Watch mode
npm run test:watch

# Coverage
npm run test:coverage

# Playwright E2E (scaffolded, specs added in follow-on work)
npm run test:e2e

# pgTAP (requires local Postgres with pgtap extension installed)
psql -d <dbname> -f supabase/tests/rls/cross-tenant-denial.test.sql
psql -d <dbname> -f supabase/tests/rls/append-only-audit.test.sql
```

### Writing Vitest tests

- Tests live in `src/tests/<domain>/<subject>.test.ts`.
- The `server-only` guard is shimmed in `src/tests/shims/server-only.ts`, so tests can import from `src/lib/db/`, `src/lib/auth/`, etc.
- Use the `NextRequest` constructor directly for route handler tests — see `src/tests/webhooks/n8n-route.test.ts`.
- Always test the failure-parity claim: if the route returns 401 for multiple reasons, assert the response shape is identical across them.

---

## Commit style

Format:

```
<type>(<phase>): <summary>

<optional body>

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>
```

- `<type>` ∈ `feat`, `fix`, `docs`, `refactor`, `test`, `chore`.
- `<phase>` is the phase number for substantive work (`feat(phase5): ...`) or omitted for one-off fixes.
- Body documents WHY the change was necessary, especially for security work — reference the council finding or test it unlocks.
- Commit via a heredoc or a temp file; `git commit -m` is fine for small changes.

Tag each phase's closing commit as `vX.Y.0-phaseN`. Hotfixes following a phase gate use `vX.Y.Z-phaseN-fixes`.

---

## Phase gate workflow

Each phase ends with:

1. **Full QA:** `npm run typecheck && npm run lint:ci && npm test && npm run build`. All four must be green.
2. **Council review (when available):**
   - **Codex adversarial** (always, phase-dependent): finds privilege escalation, timing leaks, injection surfaces.
   - **Gemini second-opinion** (when credits available; deferred otherwise): long-context audit over the full diff plus cumulative repo state.
3. **Triage:** CRITICAL/HIGH fixes inline in a follow-on commit. MEDIUM/LOW either fixed or documented with rationale in `PROJECT-MEMORY.md` + the next phase's constraints.
4. **Commit + tag.**
5. **Update `PROJECT-MEMORY.md`** phase status, tick checklist boxes, note deferrals.

See `docs/phase-2-council-gate.md` for the canonical format.

---

## AI Council orchestration

This repo is built by an AI Council — three models with distinct lanes:

- **Claude Opus 4.7 (1M ctx)** — GM. Plans, gates phases, orchestrates. Never writes production code directly; writes dispatch briefs, reviews diffs, triages findings.
- **Claude Sonnet 4.6** — Primary coder. UI, product logic, MCP-heavy work.
- **Codex GPT-5.4** — Co-implementer. API, DB, security, tests. Performs adversarial review at phase gates. Use `spark` routing for routine work, `gpt-5.4` for anything touching auth/RLS/migrations/billing.
- **Gemini CLI (2M ctx)** — Long-context auditor. Architecture challenger, independent security second opinion. Never writes code.

Tandem work (Sonnet + Codex in parallel) is the default on build phases. Serialized only when a phase is atomic and small (<2h, single surface).

If you're contributing without an AI Council, that's fine — just be aware the commit history and `PROJECT-MEMORY.md` reference dispatch briefs and council gates.

---

## Reporting security issues

See [`SECURITY.md`](./SECURITY.md). Do not open public GitHub issues for vulnerabilities; email `owenquintenta@gmail.com`.

---

## License

MIT. By contributing you agree your work is licensed under the same terms.
