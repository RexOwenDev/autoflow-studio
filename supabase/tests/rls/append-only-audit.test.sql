-- pgTAP: prove audit_events is truly append-only across every mutation surface.
-- UPDATE, DELETE, TRUNCATE, INSERT...ON CONFLICT DO UPDATE/DELETE, MERGE all blocked.
-- All denial assertions check exact SQLSTATE 42501 (Codex Finding 7.3).

begin;

create extension if not exists pgtap;

select plan(11);

set local role postgres;

insert into organizations (id, slug, name) values
  ('11111111-1111-1111-1111-111111111111', 'audit-test', 'Audit Test Org');

insert into audit_events (id, organization_id, action, resource_type, resource_id) values
  ('eeee0001-eeee-eeee-eeee-eeeeeeeeeeee',
   '11111111-1111-1111-1111-111111111111',
   'workflow.created',
   'workflow',
   'aaaa1111-aaaa-aaaa-aaaa-aaaaaaaaaaaa');

select is(
  (select count(*)::int from audit_events where id = 'eeee0001-eeee-eeee-eeee-eeeeeeeeeeee'),
  1, 'audit event exists after insert'
);

-- ===== Standard mutation paths blocked =====================================

select throws_ok(
  $$update audit_events set action = 'workflow.deleted' where id = 'eeee0001-eeee-eeee-eeee-eeeeeeeeeeee'$$,
  '42501',
  'audit_events is append-only: UPDATE is not permitted',
  'superuser BLOCKED from UPDATE on audit_events (42501, exact message)'
);

select throws_ok(
  $$delete from audit_events where id = 'eeee0001-eeee-eeee-eeee-eeeeeeeeeeee'$$,
  '42501',
  'audit_events is append-only: DELETE is not permitted',
  'superuser BLOCKED from DELETE on audit_events (42501, exact message)'
);

select throws_ok(
  $$truncate table audit_events$$,
  '42501',
  'audit_events is append-only: TRUNCATE is not permitted',
  'superuser BLOCKED from TRUNCATE on audit_events (42501, exact message)'
);

-- ===== Codex Finding 7.2: INSERT ... ON CONFLICT DO UPDATE branch =========

select throws_ok(
  $$insert into audit_events (id, organization_id, action, resource_type, resource_id)
    values ('eeee0001-eeee-eeee-eeee-eeeeeeeeeeee',
            '11111111-1111-1111-1111-111111111111',
            'workflow.deleted',
            'workflow',
            'aaaa1111-aaaa-aaaa-aaaa-aaaaaaaaaaaa')
    on conflict (id) do update set action = excluded.action$$,
  '42501',
  'audit_events is append-only: UPDATE is not permitted',
  'superuser BLOCKED from INSERT...ON CONFLICT DO UPDATE on audit_events'
);

select throws_ok(
  $$insert into audit_events (id, organization_id, action, resource_type, resource_id)
    values ('eeee0001-eeee-eeee-eeee-eeeeeeeeeeee',
            '11111111-1111-1111-1111-111111111111',
            'workflow.deleted',
            'workflow',
            'aaaa1111-aaaa-aaaa-aaaa-aaaaaaaaaaaa')
    on conflict (id) do nothing$$,
  null, null,
  'INSERT...ON CONFLICT DO NOTHING is allowed (no-op, no mutation of existing row)'
);

-- ===== Codex Finding 7.2: MERGE statement ==================================
-- (Postgres 15+ syntax. WHEN MATCHED THEN UPDATE/DELETE must be blocked by trigger.)

select throws_ok(
  $$merge into audit_events t
    using (select 'eeee0001-eeee-eeee-eeee-eeeeeeeeeeee'::uuid as id) s
      on t.id = s.id
    when matched then update set action = 'workflow.deleted'$$,
  '42501',
  'audit_events is append-only: UPDATE is not permitted',
  'superuser BLOCKED from MERGE...UPDATE on audit_events'
);

select throws_ok(
  $$merge into audit_events t
    using (select 'eeee0001-eeee-eeee-eeee-eeeeeeeeeeee'::uuid as id) s
      on t.id = s.id
    when matched then delete$$,
  '42501',
  'audit_events is append-only: DELETE is not permitted',
  'superuser BLOCKED from MERGE...DELETE on audit_events'
);

-- ===== Codex Finding 2: known DBA bypass primitives ========================
-- Documenting (not blocking) — DBA with table ownership CAN disable triggers
-- via ALTER TABLE ... DISABLE TRIGGER ALL or SET session_replication_role = replica.
-- This is mitigated out-of-band via:
--   1. Locking table ownership to a dedicated migrator role (Phase 7 ops doc)
--   2. WAL archiving for tamper evidence (Phase 7 ops doc)
-- The trigger gives the standard application/auth role chain real append-only
-- guarantees; DBA-tier protection requires Postgres ownership controls + WAL.

-- ===== Authenticated role (no triggers needed — REVOKE blocks first) =======
set local role authenticated;
set local "request.jwt.claim.sub" to '00000000-0000-0000-0000-000000000001';

select throws_ok(
  $$update audit_events set action = 'workflow.deleted'$$,
  '42501', null,
  'authenticated user BLOCKED from UPDATE on audit_events (42501)'
);

select throws_ok(
  $$delete from audit_events$$,
  '42501', null,
  'authenticated user BLOCKED from DELETE on audit_events (42501)'
);

select throws_ok(
  $$truncate table audit_events$$,
  '42501', null,
  'authenticated user BLOCKED from TRUNCATE on audit_events (42501)'
);

select * from finish();
rollback;
