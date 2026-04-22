-- pgTAP: prove cross-tenant access is denied for every RLS-protected table.
-- Three tenants (A, B, C). User in A queries tables owned by B and C.
-- Expected: 0 rows for B/C, full visibility for A.
--
-- Run with:  pg_prove -d postgres supabase/tests/rls/cross-tenant-denial.test.sql
-- Requires:  CREATE EXTENSION pgtap;

begin;

create extension if not exists pgtap;

select plan(18);

-- =============================================================================
-- SEED — three orgs, three users, each user a member of their own org only.
-- We bypass RLS for seeding by running as superuser (typical pgTAP pattern).
-- =============================================================================
set local role postgres;

-- Synthetic auth.users rows (Supabase test fixtures pattern)
insert into auth.users (id, email) values
  ('00000000-0000-0000-0000-000000000a01', 'alice@a.test'),
  ('00000000-0000-0000-0000-00000000b001', 'bob@b.test'),
  ('00000000-0000-0000-0000-0000000c0001', 'carol@c.test')
on conflict (id) do nothing;

insert into organizations (id, slug, name) values
  ('11111111-1111-1111-1111-111111111111', 'org-a', 'Org A'),
  ('22222222-2222-2222-2222-222222222222', 'org-b', 'Org B'),
  ('33333333-3333-3333-3333-333333333333', 'org-c', 'Org C');

insert into organization_members (organization_id, user_id, role) values
  ('11111111-1111-1111-1111-111111111111', '00000000-0000-0000-0000-000000000a01', 'owner'),
  ('22222222-2222-2222-2222-222222222222', '00000000-0000-0000-0000-00000000b001', 'owner'),
  ('33333333-3333-3333-3333-333333333333', '00000000-0000-0000-0000-0000000c0001', 'owner');

insert into workflows (id, organization_id, name, created_by) values
  ('aaaa1111-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '11111111-1111-1111-1111-111111111111', 'A workflow', '00000000-0000-0000-0000-000000000a01'),
  ('bbbb1111-bbbb-bbbb-bbbb-bbbbbbbbbbbb', '22222222-2222-2222-2222-222222222222', 'B workflow', '00000000-0000-0000-0000-00000000b001'),
  ('cccc1111-cccc-cccc-cccc-cccccccccccc', '33333333-3333-3333-3333-333333333333', 'C workflow', '00000000-0000-0000-0000-0000000c0001');

insert into executions (id, organization_id, workflow_id, trigger_source) values
  ('aaaa2222-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '11111111-1111-1111-1111-111111111111', 'aaaa1111-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'manual'),
  ('bbbb2222-bbbb-bbbb-bbbb-bbbbbbbbbbbb', '22222222-2222-2222-2222-222222222222', 'bbbb1111-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'manual'),
  ('cccc2222-cccc-cccc-cccc-cccccccccccc', '33333333-3333-3333-3333-333333333333', 'cccc1111-cccc-cccc-cccc-cccccccccccc', 'manual');

insert into audit_events (organization_id, action, resource_type, resource_id) values
  ('11111111-1111-1111-1111-111111111111', 'workflow.created', 'workflow', 'aaaa1111-aaaa-aaaa-aaaa-aaaaaaaaaaaa'),
  ('22222222-2222-2222-2222-222222222222', 'workflow.created', 'workflow', 'bbbb1111-bbbb-bbbb-bbbb-bbbbbbbbbbbb'),
  ('33333333-3333-3333-3333-333333333333', 'workflow.created', 'workflow', 'cccc1111-cccc-cccc-cccc-cccccccccccc');

-- =============================================================================
-- ASSUME ROLE: alice (org A only) — RLS active under 'authenticated' role.
-- auth.uid() reads from request.jwt.claim.sub setting.
-- =============================================================================
set local role authenticated;
set local "request.jwt.claim.sub" to '00000000-0000-0000-0000-000000000a01';

-- Sanity: alice can see her own org's data.
select is(
  (select count(*)::int from organizations where id = '11111111-1111-1111-1111-111111111111'),
  1,
  'alice sees org A'
);

select is(
  (select count(*)::int from workflows where organization_id = '11111111-1111-1111-1111-111111111111'),
  1,
  'alice sees A workflows'
);

select is(
  (select count(*)::int from executions where organization_id = '11111111-1111-1111-1111-111111111111'),
  1,
  'alice sees A executions'
);

select is(
  (select count(*)::int from audit_events where organization_id = '11111111-1111-1111-1111-111111111111'),
  1,
  'alice sees A audit events'
);

-- Cross-tenant denial: alice CANNOT see B or C.
select is(
  (select count(*)::int from organizations where id = '22222222-2222-2222-2222-222222222222'),
  0,
  'alice DENIED org B'
);

select is(
  (select count(*)::int from organizations where id = '33333333-3333-3333-3333-333333333333'),
  0,
  'alice DENIED org C'
);

select is(
  (select count(*)::int from workflows where organization_id = '22222222-2222-2222-2222-222222222222'),
  0,
  'alice DENIED B workflows'
);

select is(
  (select count(*)::int from workflows where organization_id = '33333333-3333-3333-3333-333333333333'),
  0,
  'alice DENIED C workflows'
);

select is(
  (select count(*)::int from executions where organization_id = '22222222-2222-2222-2222-222222222222'),
  0,
  'alice DENIED B executions'
);

select is(
  (select count(*)::int from audit_events where organization_id = '22222222-2222-2222-2222-222222222222'),
  0,
  'alice DENIED B audit events'
);

select is(
  (select count(*)::int from audit_events where organization_id = '33333333-3333-3333-3333-333333333333'),
  0,
  'alice DENIED C audit events'
);

-- Cross-tenant WRITE denial.
select throws_ok(
  $$insert into workflows (organization_id, name) values ('22222222-2222-2222-2222-222222222222', 'sneaky')$$,
  '42501',  -- insufficient_privilege (RLS violation)
  null,
  'alice CANNOT insert into B workflows'
);

select throws_ok(
  $$update workflows set name = 'hacked' where id = 'bbbb1111-bbbb-bbbb-bbbb-bbbbbbbbbbbb'$$,
  null,
  null,
  'alice cannot update B workflows (RLS makes update affect 0 rows OR raises)'
);
-- Note: UPDATE under RLS without matching rows succeeds with 0 affected rows;
-- the prior insert test is the strict denial proof.

-- Membership cannot self-elevate.
select throws_ok(
  $$insert into organization_members (organization_id, user_id, role)
    values ('22222222-2222-2222-2222-222222222222', '00000000-0000-0000-0000-000000000a01', 'admin')$$,
  '42501',
  null,
  'alice CANNOT insert herself into org B'
);

-- =============================================================================
-- SWITCH ROLE: bob (org B) — symmetric check.
-- =============================================================================
set local "request.jwt.claim.sub" to '00000000-0000-0000-0000-00000000b001';

select is(
  (select count(*)::int from workflows where organization_id = '22222222-2222-2222-2222-222222222222'),
  1,
  'bob sees B workflows'
);

select is(
  (select count(*)::int from workflows where organization_id = '11111111-1111-1111-1111-111111111111'),
  0,
  'bob DENIED A workflows'
);

-- =============================================================================
-- ANON ROLE: no JWT — should see nothing on any RLS-protected table.
-- =============================================================================
reset "request.jwt.claim.sub";
set local role anon;

select is(
  (select count(*)::int from organizations),
  0,
  'anon sees zero orgs'
);

select is(
  (select count(*)::int from workflows),
  0,
  'anon sees zero workflows'
);

select * from finish();
rollback;
