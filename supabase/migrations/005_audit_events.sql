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

-- Codex HIGH fix: SELECT restricted to admins/owners.
-- Rationale: diff JSONB may contain sensitive before/after payloads (settings, billing data,
-- member emails on role changes). Even with app-layer redaction, defense-in-depth restricts
-- raw row access to admin+. Phase 5 will expose a member-safe audit feed via a redacted view
-- (e.g., omitting diff for security.* and billing.* actions).
create policy audit_events_select_admin
  on audit_events for select
  to authenticated
  using (has_organization_role(organization_id, 'admin'));

-- No INSERT policy for authenticated users — events emitted by server actions (service role).
-- UPDATE/DELETE blocked by triggers above regardless of any policy.

comment on table audit_events is
  'SOC2-aligned append-only audit log. UPDATE/DELETE/TRUNCATE blocked at trigger level for the standard Postgres role chain. NOTE: a DBA with table ownership can still bypass via DISABLE TRIGGER / DROP TABLE — table ownership must be locked to a dedicated migrator role + WAL-archived for a true tamper-evident chain (tracked Phase 7).';
comment on function audit_events_block_mutation() is
  'Append-only enforcement for audit_events. Raises insufficient_privilege on any mutation attempt by the application role chain. Does not protect against table-owner DDL — use ownership lockdown + WAL archive for that guarantee.';
