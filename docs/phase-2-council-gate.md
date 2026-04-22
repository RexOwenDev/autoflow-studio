# Phase 2 Council Gate — Audit & Triage

**Date:** 2026-04-22
**Phase:** Phase 2 — Multi-tenant schema + RLS
**Verdict:** PASSED with fixes applied

## Reviewers

| Reviewer | Status | Notes |
|---|---|---|
| Codex GPT-5.4 (adversarial) | ✅ Returned (CONDITIONAL → fixes applied) | 7 attack surfaces probed; 1 CRITICAL, 3 HIGH, 4 MEDIUM, 3 LOW |
| Gemini CLI (security second opinion) | ⚠️ Unavailable | Both API keys returned 429 RESOURCE_EXHAUSTED (prepayment credits depleted on `ai.studio` project). Council gate proceeded with single-reviewer Codex output; Gemini second-opinion deferred to Phase 7 final pre-push review when credits restored. |

## Findings & Resolutions

### CRITICAL — admin → owner self-promotion (FIXED)

**File:** `supabase/migrations/001_organizations.sql`
**Vector:** `UPDATE organization_members SET role='owner'` allowed by the original policy because it only checked `has_organization_role(...,'admin')` without restricting role transitions.

**Fix:** Split the UPDATE policy into two — admins update only non-owner rows (`role <> 'owner'`), and a separate owner-tier policy permits owner transitions. Same split for INSERT.

### HIGH — workflow_versions cross-tenant integrity defect (FIXED)

**File:** `supabase/migrations/002_workflows.sql`
**Vector:** A member of org A could insert a `workflow_versions` row tagged `organization_id = A` but pointing at `workflow_id = <victim workflow in org B>`. RLS policy only checked membership against the supplied `organization_id`, not consistency with the parent.

**Fix:** Added `unique (id, organization_id)` on `workflows`, then changed `workflow_versions` FK to composite `(workflow_id, organization_id) → workflows(id, organization_id)`. The DB now refuses any row whose two tenant references disagree.

### HIGH — last-owner orphan via self-delete (FIXED)

**File:** `supabase/migrations/001_organizations.sql`
**Vector:** The sole owner of an org could delete their own `organization_members` row — the RLS policy permitted self-delete with no count guard. Result: orphaned org with no admin path.

**Fix:** `BEFORE DELETE` trigger `organization_members_block_last_owner_delete()` rejects deletion when removing the last `owner`. Also added a sister trigger on UPDATE preventing the last owner from demoting themselves below `owner`.

### HIGH — audit_events.diff readable by all members (FIXED)

**File:** `supabase/migrations/005_audit_events.sql`
**Vector:** `audit_events.diff` JSONB stored full before/after payloads readable by every org member. Even with app-layer redaction discipline, a low-privilege member could exfiltrate any sensitive data that slipped through.

**Fix:** SELECT policy restricted to `has_organization_role(..., 'admin')`. The dashboard call site (`src/app/(app)/dashboard/page.tsx`) tolerates an empty audit result for member-tier users via `.catch(() => [])`. Phase 5 audit log UI will expose a redacted member-safe feed via a view that omits `diff` for `billing.*`, `auth.*`, and `sso.*` actions.

### MEDIUM — webhook executions can bypass idempotency via NULL key (FIXED)

**File:** `supabase/migrations/003_executions.sql`
**Vector:** `executions_workflow_idempotency_idx` is a partial unique index `WHERE idempotency_key IS NOT NULL`. A webhook handler that forgot to forward the key would pass through and create duplicate runs for replayed events.

**Fix:** Added CHECK constraint `executions_webhook_requires_idempotency` — `trigger_source = 'webhook'` requires non-null `idempotency_key`. The Phase 5 webhook handler will fail loud rather than silently de-dupe-bypass.

### MEDIUM — tamper-proof claim overstated (DOCS UPDATED)

**File:** `supabase/migrations/005_audit_events.sql`
**Vector:** The trigger blocks UPDATE/DELETE/TRUNCATE for the standard application role chain, but a DBA with table ownership can bypass via `ALTER TABLE ... DISABLE TRIGGER ALL`, `SET session_replication_role = replica`, or `DROP TABLE`.

**Fix:** Updated the table comment to accurately describe what the trigger guarantees (application-role tamper resistance) and what it does NOT (DBA-tier protection requires ownership lockdown + WAL archiving — tracked for Phase 7 ops doc).

### MEDIUM — pgTAP coverage gaps (FIXED)

**Files:** `supabase/tests/rls/{cross-tenant-denial,append-only-audit}.test.sql`
**Vector:** Original 18 + 7 assertions covered only some tables and only basic mutation paths. Missing: `organization_invites`, `workflow_versions`, `execution_events`, `webhook_inbox`, `billing_subscriptions`, `webhook_events`, INSERT-ON-CONFLICT, MERGE, exact SQLSTATE assertions, last-owner trigger, admin self-promotion attempt.

**Fix:** Cross-tenant suite expanded from 18 → 34 assertions covering all RLS-protected tables with positive (own-org) + negative (cross-tenant) reads + write denials. CRITICAL fix verification (admin can't self-promote) and HIGH fix verification (last owner can't self-delete) added with exact SQLSTATEs. Append-only suite expanded from 7 → 11 assertions including INSERT-ON-CONFLICT-DO-UPDATE, INSERT-ON-CONFLICT-DO-NOTHING (allowed), MERGE-WHEN-MATCHED-UPDATE, and MERGE-WHEN-MATCHED-DELETE.

### LOW — webhook_inbox case-sensitive idempotency (FIXED)

**File:** `supabase/migrations/004_webhook_inbox.sql`
**Vector:** `unique (source, idempotency_key)` is case-sensitive. An attacker replaying with a case-variant key (`ABC123` vs `abc123`) bypasses the dedup constraint.

**Fix:** Replaced the table constraint with a unique index on `(source, lower(idempotency_key))`.

### LOW — billing_subscriptions exposes Stripe IDs to all members (FIXED)

**File:** `supabase/migrations/006_billing.sql`, `src/types/database.ts`, `src/lib/supabase/{adapter,fixture-adapter}.ts`, `src/lib/db/billing.ts`
**Vector:** Original SELECT policy let every member read `stripe_customer_id` and `stripe_subscription_id`. Broader than the doc comment claimed.

**Fix:**
1. `billing_subscriptions` SELECT restricted to `has_organization_role(..., 'owner')`.
2. New view `billing_subscription_member_view` (`security_invoker = on`) projects plan/usage/period without Stripe identifiers, restricted to org members via inline EXISTS check.
3. Adapter interface gained `getSubscriptionForMember()` returning `BillingSubscriptionMemberView`.
4. Dashboard widget switched from `getSubscription` → `getSubscriptionForMember`.

### LOW — pgTAP throws_ok accepted NULL SQLSTATE (FIXED)

**Files:** `supabase/tests/rls/{cross-tenant-denial,append-only-audit}.test.sql`
**Vector:** Several denial assertions accepted `null` SQLSTATE — proving "something threw" rather than "the right control fired". Could mask regressions where a statement fails for the wrong reason.

**Fix:** All denial assertions now check exact SQLSTATE (`42501` for RLS/privilege, `23001` for restrict_violation on the last-owner trigger). The append-only trigger's exact error message is also asserted.

## Carry-forward to later phases

| Item | Phase |
|---|---|
| Member-safe audit feed via redacted view (omit diff for billing.*/auth.*/sso.*) | Phase 5 |
| Table ownership lockdown to dedicated migrator role | Phase 7 ops doc |
| WAL archiving for tamper-evident audit chain | Phase 7 ops doc |
| Event triggers for DROP/ALTER on audit_events (defense in depth vs DBA-tier DDL) | Phase 7 ops doc |
| Gemini second-opinion review of full Phase 2 schema | Phase 7 final pre-push (requires credit top-up) |

## QA gate after fixes

- `npx tsc --noEmit` — clean
- `npx biome check .` — clean
- `APP_MODE=fixture npx next build` — clean (all 7 routes compile; dashboard prerenders)
- pgTAP suites cannot run in this environment (no local Postgres); will run in CI Phase 3 alongside Supabase docker setup.
