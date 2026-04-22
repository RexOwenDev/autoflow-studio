# 0003 — Enforce append-only audit at the database, not the application

**Status:** Accepted — 2026-04-22
**Context:** Phase 2 (migration 005); tightened in Phase 2 Codex council gate

## Context

SOC2 and equivalent frameworks require an audit log that's demonstrably tamper-resistant. Application-layer enforcement ("no UPDATE code path exists") fails the audit question *"what prevents a developer from running an UPDATE in a debug script?"*. The answer has to be structural.

## Decision

`audit_events` is append-only at the Postgres trigger layer:

- `BEFORE UPDATE` trigger raises SQLSTATE 42501 (`insufficient_privilege`).
- `BEFORE DELETE` trigger raises 42501.
- `BEFORE TRUNCATE` trigger raises 42501 — added in response to the Gemini Phase 0 audit. UPDATE and DELETE triggers don't fire on TRUNCATE.

Belt-and-braces: `REVOKE update, delete, truncate ON audit_events FROM public, authenticated, anon`. Any future role accidentally granted those would still hit the trigger first.

These triggers raise inside a single `RAISE EXCEPTION 'audit_events is append-only: % is not permitted', TG_OP`, which means even a `SECURITY DEFINER` function owned by a privileged role cannot silently succeed. The trigger must be explicitly disabled (`ALTER TABLE ... DISABLE TRIGGER ALL`) to bypass — an auditable DDL event.

## Alternatives considered

- **Revoke mutations + rely on role separation.** Easier to set up, but any role accidentally granted permissions bypasses the protection. Triggers catch grant drift.
- **Store audit in an append-only external sink (e.g., immutable S3).** Stronger tamper resistance but kills transactional consistency — an audit event could succeed while the corresponding app write failed (or vice versa).
- **Hash-chain verification on write.** Extra complexity; the trigger approach is sufficient for the SOC2-aligned threat model we documented.

## Consequences

- **Positive:** Even superuser cannot `UPDATE` or `DELETE` via normal DML.
- **Positive:** TRUNCATE is blocked — a subtle but real gap in trigger-only designs.
- **Positive:** Fail-closed. If the trigger is dropped as a migration, pgTAP tests catch it before the next release.
- **Trade-off / caveat:** A Postgres user with table ownership can still `ALTER TABLE ... DISABLE TRIGGER ALL` or `SET session_replication_role = replica`. This is documented in `SECURITY.md` — full DBA-tier tamper resistance requires ownership lockdown (dedicated migrator role) plus WAL archiving with offline hash verification. That's an ops concern, tracked for Phase 8+.

## Related

- `supabase/migrations/005_audit_events.sql`
- `supabase/tests/rls/append-only-audit.test.sql` — 11 assertions including INSERT-ON-CONFLICT-DO-UPDATE, MERGE
- `src/lib/audit/log.ts` — diff redaction as defense in depth against callers
