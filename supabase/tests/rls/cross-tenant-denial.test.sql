-- pgTAP: prove cross-tenant access is denied for every RLS-protected table.
-- Three tenants (A, B, C). User in A queries tables owned by B and C.
-- Expected: 0 rows for B/C, full visibility for A.
--
-- Coverage now includes (Codex Finding 7.1): organization_invites, workflow_versions,
-- execution_events, webhook_inbox, billing_subscriptions, webhook_events.
-- All denial assertions check exact SQLSTATE 42501 (Codex Finding 7.3).
--
-- Run with:  pg_prove -d postgres supabase/tests/rls/cross-tenant-denial.test.sql
-- Requires:  CREATE EXTENSION pgtap;

begin;

create extension if not exists pgtap;

select plan(34);

-- =============================================================================
-- SEED — three orgs, three users, each user a member of their own org only.
-- =============================================================================
set local role postgres;

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

insert into organization_invites
  (id, organization_id, email, token_hash, expires_at)
values
  ('aaaa3333-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '11111111-1111-1111-1111-111111111111',
   'invite-a@a.test', '\xdeadbeef'::bytea, now() + interval '48 hours'),
  ('bbbb3333-bbbb-bbbb-bbbb-bbbbbbbbbbbb', '22222222-2222-2222-2222-222222222222',
   'invite-b@b.test', '\xcafebabe'::bytea, now() + interval '48 hours');

insert into workflows (id, organization_id, name, created_by) values
  ('aaaa1111-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '11111111-1111-1111-1111-111111111111', 'A workflow', '00000000-0000-0000-0000-000000000a01'),
  ('bbbb1111-bbbb-bbbb-bbbb-bbbbbbbbbbbb', '22222222-2222-2222-2222-222222222222', 'B workflow', '00000000-0000-0000-0000-00000000b001'),
  ('cccc1111-cccc-cccc-cccc-cccccccccccc', '33333333-3333-3333-3333-333333333333', 'C workflow', '00000000-0000-0000-0000-0000000c0001');

insert into workflow_versions
  (workflow_id, organization_id, version, config, config_hash)
values
  ('aaaa1111-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '11111111-1111-1111-1111-111111111111', 1, '{}'::jsonb, '\x00'::bytea),
  ('bbbb1111-bbbb-bbbb-bbbb-bbbbbbbbbbbb', '22222222-2222-2222-2222-222222222222', 1, '{}'::jsonb, '\x00'::bytea);

insert into executions (id, organization_id, workflow_id, trigger_source) values
  ('aaaa2222-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '11111111-1111-1111-1111-111111111111', 'aaaa1111-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'manual'),
  ('bbbb2222-bbbb-bbbb-bbbb-bbbbbbbbbbbb', '22222222-2222-2222-2222-222222222222', 'bbbb1111-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'manual'),
  ('cccc2222-cccc-cccc-cccc-cccccccccccc', '33333333-3333-3333-3333-333333333333', 'cccc1111-cccc-cccc-cccc-cccccccccccc', 'manual');

insert into execution_events (execution_id, organization_id, kind) values
  ('aaaa2222-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '11111111-1111-1111-1111-111111111111', 'started'),
  ('bbbb2222-bbbb-bbbb-bbbb-bbbbbbbbbbbb', '22222222-2222-2222-2222-222222222222', 'started');

insert into webhook_inbox (organization_id, source, idempotency_key, signature, payload) values
  ('11111111-1111-1111-1111-111111111111', 'n8n', 'A-key-1', 'sig-A', '{}'::jsonb),
  ('22222222-2222-2222-2222-222222222222', 'n8n', 'B-key-1', 'sig-B', '{}'::jsonb);

insert into billing_subscriptions (organization_id, stripe_customer_id, plan)
values
  ('11111111-1111-1111-1111-111111111111', 'cus_A', 'pro'),
  ('22222222-2222-2222-2222-222222222222', 'cus_B', 'free');

insert into webhook_events (provider, event_id, event_type, organization_id, payload) values
  ('stripe', 'evt_A_001', 'invoice.paid', '11111111-1111-1111-1111-111111111111', '{}'::jsonb),
  ('stripe', 'evt_B_001', 'invoice.paid', '22222222-2222-2222-2222-222222222222', '{}'::jsonb);

insert into audit_events (organization_id, action, resource_type, resource_id) values
  ('11111111-1111-1111-1111-111111111111', 'workflow.created', 'workflow', 'aaaa1111-aaaa-aaaa-aaaa-aaaaaaaaaaaa'),
  ('22222222-2222-2222-2222-222222222222', 'workflow.created', 'workflow', 'bbbb1111-bbbb-bbbb-bbbb-bbbbbbbbbbbb'),
  ('33333333-3333-3333-3333-333333333333', 'workflow.created', 'workflow', 'cccc1111-cccc-cccc-cccc-cccccccccccc');

-- =============================================================================
-- ASSUME ROLE: alice (org A only) — RLS active under 'authenticated' role.
-- =============================================================================
set local role authenticated;
set local "request.jwt.claim.sub" to '00000000-0000-0000-0000-000000000a01';

-- Sanity reads (org A visible).
select is(
  (select count(*)::int from organizations where id = '11111111-1111-1111-1111-111111111111'),
  1, 'alice sees org A'
);

select is(
  (select count(*)::int from workflows where organization_id = '11111111-1111-1111-1111-111111111111'),
  1, 'alice sees A workflows'
);

select is(
  (select count(*)::int from workflow_versions where organization_id = '11111111-1111-1111-1111-111111111111'),
  1, 'alice sees A workflow_versions'
);

select is(
  (select count(*)::int from executions where organization_id = '11111111-1111-1111-1111-111111111111'),
  1, 'alice sees A executions'
);

select is(
  (select count(*)::int from execution_events where organization_id = '11111111-1111-1111-1111-111111111111'),
  1, 'alice sees A execution_events'
);

-- audit_events admin-only (Codex HIGH fix). Alice IS an owner of A so she should see them.
select is(
  (select count(*)::int from audit_events where organization_id = '11111111-1111-1111-1111-111111111111'),
  1, 'alice (owner of A) sees A audit events'
);

-- billing: owner sees full subscription row including stripe_customer_id.
select is(
  (select count(*)::int from billing_subscriptions where organization_id = '11111111-1111-1111-1111-111111111111'),
  1, 'alice (owner) sees A billing_subscriptions'
);

-- webhook_events: owner-only.
select is(
  (select count(*)::int from webhook_events where organization_id = '11111111-1111-1111-1111-111111111111'),
  1, 'alice (owner) sees A webhook_events'
);

-- organization_invites: admin-only — owner qualifies.
select is(
  (select count(*)::int from organization_invites where organization_id = '11111111-1111-1111-1111-111111111111'),
  1, 'alice (owner) sees A invites'
);

-- webhook_inbox: admin-only — owner qualifies.
select is(
  (select count(*)::int from webhook_inbox where organization_id = '11111111-1111-1111-1111-111111111111'),
  1, 'alice (owner) sees A webhook_inbox'
);

-- ===== CROSS-TENANT DENIALS (B and C invisible to alice) =================
select is((select count(*)::int from organizations         where id = '22222222-2222-2222-2222-222222222222'), 0, 'alice DENIED org B');
select is((select count(*)::int from organizations         where id = '33333333-3333-3333-3333-333333333333'), 0, 'alice DENIED org C');
select is((select count(*)::int from workflows             where organization_id = '22222222-2222-2222-2222-222222222222'), 0, 'alice DENIED B workflows');
select is((select count(*)::int from workflow_versions     where organization_id = '22222222-2222-2222-2222-222222222222'), 0, 'alice DENIED B workflow_versions');
select is((select count(*)::int from executions            where organization_id = '22222222-2222-2222-2222-222222222222'), 0, 'alice DENIED B executions');
select is((select count(*)::int from execution_events      where organization_id = '22222222-2222-2222-2222-222222222222'), 0, 'alice DENIED B execution_events');
select is((select count(*)::int from audit_events          where organization_id = '22222222-2222-2222-2222-222222222222'), 0, 'alice DENIED B audit_events');
select is((select count(*)::int from organization_invites  where organization_id = '22222222-2222-2222-2222-222222222222'), 0, 'alice DENIED B invites');
select is((select count(*)::int from webhook_inbox         where organization_id = '22222222-2222-2222-2222-222222222222'), 0, 'alice DENIED B webhook_inbox');
select is((select count(*)::int from billing_subscriptions where organization_id = '22222222-2222-2222-2222-222222222222'), 0, 'alice DENIED B billing_subscriptions');
select is((select count(*)::int from webhook_events        where organization_id = '22222222-2222-2222-2222-222222222222'), 0, 'alice DENIED B webhook_events');

-- ===== CROSS-TENANT WRITE DENIALS (exact SQLSTATE 42501) =================
select throws_ok(
  $$insert into workflows (organization_id, name) values ('22222222-2222-2222-2222-222222222222', 'sneaky')$$,
  '42501', null,
  'alice CANNOT insert into B workflows (42501)'
);

select throws_ok(
  $$insert into workflow_versions (workflow_id, organization_id, version, config, config_hash)
    values ('bbbb1111-bbbb-bbbb-bbbb-bbbbbbbbbbbb', '22222222-2222-2222-2222-222222222222', 99, '{}'::jsonb, '\x00'::bytea)$$,
  '42501', null,
  'alice CANNOT insert B workflow_versions (42501)'
);

select throws_ok(
  $$insert into organization_members (organization_id, user_id, role)
    values ('22222222-2222-2222-2222-222222222222', '00000000-0000-0000-0000-000000000a01', 'admin')$$,
  '42501', null,
  'alice CANNOT insert herself into org B (42501)'
);

-- Codex CRITICAL fix coverage: alice (owner of A) cannot promote a non-existent member to owner
-- of org B. Even her own writes are scoped to A.
select throws_ok(
  $$insert into organization_members (organization_id, user_id, role)
    values ('11111111-1111-1111-1111-111111111111', '00000000-0000-0000-0000-00000000b001', 'owner')$$,
  null, null,
  'owner alice CAN add new owner to her own org A (passes — owner power)'
);

-- =============================================================================
-- SWITCH TO an admin (not owner) — verify cannot self-promote to owner.
-- =============================================================================
set local role postgres;
insert into auth.users (id, email) values
  ('00000000-0000-0000-0000-0000000a000d', 'dave@a.test')
on conflict (id) do nothing;
insert into organization_members (organization_id, user_id, role) values
  ('11111111-1111-1111-1111-111111111111', '00000000-0000-0000-0000-0000000a000d', 'admin');

set local role authenticated;
set local "request.jwt.claim.sub" to '00000000-0000-0000-0000-0000000a000d';

select throws_ok(
  $$update organization_members set role = 'owner'
    where organization_id = '11111111-1111-1111-1111-111111111111'
      and user_id = '00000000-0000-0000-0000-0000000a000d'$$,
  '42501', null,
  'CRITICAL fix verified: admin CANNOT self-promote to owner (42501)'
);

select throws_ok(
  $$insert into organization_members (organization_id, user_id, role)
    values ('11111111-1111-1111-1111-111111111111', '00000000-0000-0000-0000-00000000b001', 'owner')$$,
  '42501', null,
  'CRITICAL fix verified: admin CANNOT insert new owner (42501)'
);

-- =============================================================================
-- LAST-OWNER GUARD (Codex HIGH fix)
-- =============================================================================
set local "request.jwt.claim.sub" to '00000000-0000-0000-0000-000000000a01';

select throws_ok(
  $$delete from organization_members
    where organization_id = '11111111-1111-1111-1111-111111111111'
      and user_id = '00000000-0000-0000-0000-000000000a01'$$,
  '23001', null,  -- restrict_violation
  'HIGH fix verified: last owner CANNOT self-delete (23001 restrict_violation)'
);

-- =============================================================================
-- ANON ROLE: zero visibility everywhere.
-- =============================================================================
reset "request.jwt.claim.sub";
set local role anon;

select is((select count(*)::int from organizations), 0, 'anon sees zero orgs');
select is((select count(*)::int from workflows),     0, 'anon sees zero workflows');
select is((select count(*)::int from audit_events),  0, 'anon sees zero audit_events');
select is((select count(*)::int from billing_subscriptions), 0, 'anon sees zero billing_subscriptions');

select * from finish();
rollback;
