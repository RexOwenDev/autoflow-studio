-- pgTAP: prove audit_events is truly append-only.
-- UPDATE, DELETE, and TRUNCATE must all raise insufficient_privilege at trigger level.
-- Even superuser cannot tamper — this is the SOC2 / Gemini HIGH guarantee.

begin;

create extension if not exists pgtap;

select plan(7);

-- =============================================================================
-- SEED — one org, one audit event.
-- =============================================================================
set local role postgres;

insert into organizations (id, slug, name) values
  ('11111111-1111-1111-1111-111111111111', 'audit-test', 'Audit Test Org');

insert into audit_events (id, organization_id, action, resource_type, resource_id) values
  ('eeee0001-eeee-eeee-eeee-eeeeeeeeeeee',
   '11111111-1111-1111-1111-111111111111',
   'workflow.created',
   'workflow',
   'aaaa1111-aaaa-aaaa-aaaa-aaaaaaaaaaaa');

-- Sanity check: the row exists.
select is(
  (select count(*)::int from audit_events where id = 'eeee0001-eeee-eeee-eeee-eeeeeeeeeeee'),
  1,
  'audit event exists after insert'
);

-- =============================================================================
-- AS SUPERUSER: trigger blocks UPDATE.
-- (Superuser bypasses RLS but NOT triggers — this is the integrity guarantee.)
-- =============================================================================
select throws_ok(
  $$update audit_events set action = 'workflow.deleted' where id = 'eeee0001-eeee-eeee-eeee-eeeeeeeeeeee'$$,
  '42501',  -- insufficient_privilege raised by trigger
  'audit_events is append-only: UPDATE is not permitted',
  'superuser BLOCKED from UPDATE on audit_events (trigger)'
);

-- =============================================================================
-- AS SUPERUSER: trigger blocks DELETE.
-- =============================================================================
select throws_ok(
  $$delete from audit_events where id = 'eeee0001-eeee-eeee-eeee-eeeeeeeeeeee'$$,
  '42501',
  'audit_events is append-only: DELETE is not permitted',
  'superuser BLOCKED from DELETE on audit_events (trigger)'
);

-- =============================================================================
-- AS SUPERUSER: trigger blocks TRUNCATE (Gemini HIGH — UPDATE/DELETE triggers don't catch this).
-- =============================================================================
select throws_ok(
  $$truncate table audit_events$$,
  '42501',
  'audit_events is append-only: TRUNCATE is not permitted',
  'superuser BLOCKED from TRUNCATE on audit_events (statement trigger)'
);

-- =============================================================================
-- AS authenticated: REVOKE belt-and-braces blocks UPDATE/DELETE/TRUNCATE
-- before triggers even fire.
-- =============================================================================
set local role authenticated;
set local "request.jwt.claim.sub" to '00000000-0000-0000-0000-000000000001';

-- Authenticated user (not even an org member) attempting UPDATE — should fail
-- via either RLS, REVOKE, or trigger (any one suffices).
select throws_ok(
  $$update audit_events set action = 'workflow.deleted'$$,
  null,
  null,
  'authenticated user BLOCKED from UPDATE on audit_events'
);

select throws_ok(
  $$delete from audit_events$$,
  null,
  null,
  'authenticated user BLOCKED from DELETE on audit_events'
);

select throws_ok(
  $$truncate table audit_events$$,
  null,
  null,
  'authenticated user BLOCKED from TRUNCATE on audit_events'
);

select * from finish();
rollback;
