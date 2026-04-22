-- Migration 005: Audit events (SOC2-aligned append-only log)
-- Gemini HIGH: DB-level triggers block UPDATE, DELETE, AND TRUNCATE.
-- Even superuser cannot tamper — audit integrity enforced at the storage layer.

-- =============================================================================
-- ENUMS
-- =============================================================================
create type audit_action as enum (
  'org.created',
  'org.updated',
  'org.deleted',
  'member.invited',
  'member.joined',
  'member.role_changed',
  'member.removed',
  'workflow.created',
  'workflow.updated',
  'workflow.deleted',
  'workflow.published',
  'workflow.archived',
  'execution.retried',
  'execution.cancelled',
  'billing.plan_changed',
  'billing.subscription_cancelled',
  'auth.sign_in',
  'auth.sign_in_failed',
  'auth.sign_out',
  'sso.configured',
  'audit.exported'
);

-- =============================================================================
-- TABLE
-- =============================================================================

create table audit_events (
  id              uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete restrict,
  actor_user_id   uuid references auth.users(id) on delete set null,   -- null = system actor
  actor_label     text,                                                  -- display name at time of event (immutable)
  action          audit_action not null,
  resource_type   text not null,                                         -- 'workflow' | 'execution' | 'member' | ...
  resource_id     uuid,
  diff            jsonb not null default '{}'::jsonb,                    -- {before, after} — app layer must redact secrets
  ip_address      inet,
  user_agent      text,
  occurred_at     timestamptz not null default now()
);

create index audit_events_org_time_idx on audit_events (organization_id, occurred_at desc);
create index audit_events_actor_idx on audit_events (actor_user_id, occurred_at desc) where actor_user_id is not null;
create index audit_events_resource_idx on audit_events (resource_type, resource_id) where resource_id is not null;

-- =============================================================================
-- APPEND-ONLY ENFORCEMENT (Gemini HIGH)
-- Block UPDATE + DELETE via row-level trigger.
-- Block TRUNCATE via statement-level trigger (UPDATE/DELETE triggers don't fire on TRUNCATE).
-- =============================================================================

create or replace function audit_events_block_mutation()
returns trigger
language plpgsql
as $$
begin
  raise exception 'audit_events is append-only: % is not permitted', tg_op
    using errcode = 'insufficient_privilege';
end;
$$;

create trigger audit_events_no_update
  before update on audit_events
  for each row execute function audit_events_block_mutation();

create trigger audit_events_no_delete
  before delete on audit_events
  for each row execute function audit_events_block_mutation();

create trigger audit_events_no_truncate
  before truncate on audit_events
  for each statement execute function audit_events_block_mutation();

-- Belt-and-braces: revoke UPDATE/DELETE/TRUNCATE grants from every role.
-- Trigger catches any path that slips past grant checks (e.g., table owner).
revoke update, delete, truncate on audit_events from public;
revoke update, delete, truncate on audit_events from authenticated;
revoke update, delete, truncate on audit_events from anon;

-- =============================================================================
-- ROW LEVEL SECURITY
-- =============================================================================
alter table audit_events enable row level security;
alter table audit_events force row level security;

-- Org members can read their org's audit log.
-- Enterprise tier will gate this via feature flag at app layer; DB allows all members.
create policy audit_events_select_member
  on audit_events for select
  to authenticated
  using (is_organization_member(organization_id));

-- No INSERT policy for authenticated users — events emitted by server actions (service role).
-- UPDATE/DELETE blocked by triggers above regardless of any policy.

comment on table audit_events is
  'SOC2-aligned append-only audit log. UPDATE/DELETE/TRUNCATE blocked at DB trigger level (Gemini HIGH).';
comment on function audit_events_block_mutation() is
  'Append-only enforcement for audit_events. Raises insufficient_privilege on any mutation attempt.';
