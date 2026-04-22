# ADR-0001: Multi-Tenant Isolation via Supabase RLS

**Status:** Accepted
**Date:** 2026-04-22
**Deciders:** Rex Owen Quintenta (General Manager / Opus)

---

## Context

AutoFlow Studio serves multiple independent client organizations ("tenants") from a single Postgres database. Each tenant's data (workflows, executions, audit logs, billing) must be completely isolated — no tenant should be able to read, write, or infer the existence of another tenant's data.

Two primary strategies exist for multi-tenant data isolation in a Postgres-backed SaaS:

1. **Schema-per-tenant** — each org gets its own schema; routing is done at the connection level
2. **Row-Level Security (RLS)** — all tenants share tables; isolation is enforced by Postgres policies using a JWT claim

---

## Decision

We use **Row-Level Security (RLS)** on a shared-schema model.

All tables include an `org_id` foreign key. RLS policies enforce that the executing role can only access rows where `org_id` matches the org embedded in the authenticated JWT.

```sql
-- Example policy pattern (organizations-scoped table)
CREATE POLICY "tenant_isolation" ON workflows
  USING (org_id = (auth.jwt() -> 'app_metadata' ->> 'org_id')::uuid);
```

The RLS posture is **deny by default**: enabling RLS on a table with no policies results in zero access for all roles. Every table must have explicit ALLOW policies for each operation (SELECT, INSERT, UPDATE, DELETE) where appropriate.

---

## Rationale

### Why RLS over schema-per-tenant

| Criterion | RLS (chosen) | Schema-per-tenant |
|---|---|---|
| Operational complexity | Low — one schema, standard migrations | High — N migrations per schema per change |
| Connection pooling | Simple — single pool | Complex — must route by tenant or use superuser |
| Cross-tenant reporting | Straightforward (service role bypasses RLS) | Requires UNION queries across schemas |
| Supabase compatibility | Native — Supabase Auth integrates directly with RLS via JWT | Requires custom connection routing |
| Proven at scale | Yes (Supabase, Neon, most hosted Postgres SaaS) | Less common; operational burden high |
| Portfolio demonstrability | Policies are readable SQL — reviewers can verify isolation | Hidden in connection routing — harder to demonstrate |

### Why not application-layer isolation alone

Application-layer tenant checking (e.g. `WHERE org_id = currentUser.orgId` in query code) is fragile:
- A missed WHERE clause leaks data silently
- Code bugs cannot be caught without full query coverage
- No defence-in-depth if the application layer is compromised

RLS enforces isolation at the database engine level. Even if application code has a bug, the Postgres policy prevents cross-tenant reads.

---

## Consequences

**Positive:**
- Tenant isolation is enforced at the deepest layer of the stack
- Policies are auditable SQL — Gemini and Codex can independently verify correctness
- pgTAP tests can prove denial across tenants without application involvement
- Supabase's anon/service role model maps naturally: anon key → RLS-scoped; service role → bypass (used only in trusted server code)

**Negative:**
- All tables must be designed with `org_id` from the start — retrofitting is painful
- RLS policies add complexity to migrations; must be reviewed carefully on every schema change (see CODEOWNERS)
- Performance: RLS adds a predicate to every query. Indexes on `org_id` are mandatory for all tenant-scoped tables

**Mitigations:**
- `supabase/migrations/` is gated in CODEOWNERS — every RLS change requires explicit review
- pgTAP cross-tenant denial test suite is mandatory at Phase 2 gate
- Gemini performs independent RLS audit at Phase 2 council gate

---

## Alternatives Considered

**Schema-per-tenant:** Rejected. Operational overhead too high for a portfolio project that needs to demonstrate clean, maintainable patterns. RLS is the industry standard for Supabase-based SaaS.

**Application-layer only:** Rejected. No defence-in-depth; a single missed WHERE clause is a data breach. Unacceptable for a security-first portfolio piece.

---

## Related

- `supabase/migrations/001_organizations.sql` — org schema + RLS
- `tests/rls/cross-tenant-denial.test.ts` — proves this ADR's guarantee
- `docs/threat-model.md` — Information Disclosure threats
- ADR-0002 (upcoming): Webhook idempotency strategy
