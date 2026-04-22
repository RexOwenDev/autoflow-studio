-- Migration 003: Workflow executions + per-run events
-- Executions are the hot path for the dashboard. Index for (org, started_at DESC).

-- =============================================================================
-- ENUMS
-- =============================================================================
create type execution_status as enum (
  'queued',
  'running',
  'success',
  'failed',
  'retrying',
  'cancelled'
);

create type execution_event_kind as enum (
  'started',
  'node_completed',
  'node_failed',
  'retry_scheduled',
  'retry_attempted',
  'succeeded',
  'failed',
  'cancelled'
);

-- =============================================================================
-- TABLES
-- =============================================================================

create table executions (
  id                  uuid primary key default gen_random_uuid(),
  organization_id     uuid not null references organizations(id) on delete cascade,
  workflow_id         uuid not null references workflows(id) on delete cascade,
  workflow_version_id uuid references workflow_versions(id) on delete set null,
  status              execution_status not null default 'queued',
  trigger_source      text not null,           -- 'webhook' | 'schedule' | 'manual' | 'retry'
  idempotency_key     text,                    -- Set by webhook ingest; unique per workflow
  started_at          timestamptz,
  finished_at         timestamptz,
  duration_ms         integer generated always as (
    case
      when started_at is not null and finished_at is not null
      then (extract(epoch from (finished_at - started_at)) * 1000)::integer
      else null
    end
  ) stored,
  error_message       text,
  created_at          timestamptz not null default now(),
  constraint executions_finish_after_start check (
    finished_at is null or started_at is null or finished_at >= started_at
  ),
  -- Codex MEDIUM fix: webhook-triggered executions MUST carry an idempotency key so the
  -- partial unique index actually dedupes. NULL-key webhooks would otherwise create
  -- duplicate runs for replayed events.
  constraint executions_webhook_requires_idempotency check (
    trigger_source <> 'webhook' or idempotency_key is not null
  )
);

create index executions_org_started_idx
  on executions (organization_id, started_at desc nulls last);
create index executions_workflow_idx
  on executions (workflow_id, created_at desc);
create index executions_status_idx
  on executions (organization_id, status) where status in ('queued', 'running', 'retrying');
create unique index executions_workflow_idempotency_idx
  on executions (workflow_id, idempotency_key) where idempotency_key is not null;

create table execution_events (
  id              uuid primary key default gen_random_uuid(),
  execution_id    uuid not null references executions(id) on delete cascade,
  organization_id uuid not null references organizations(id) on delete cascade,
  kind            execution_event_kind not null,
  node_id         text,          -- workflow node identifier (nullable for lifecycle events)
  payload         jsonb not null default '{}'::jsonb,
  occurred_at     timestamptz not null default now()
);

create index execution_events_execution_idx
  on execution_events (execution_id, occurred_at);

-- =============================================================================
-- ROW LEVEL SECURITY
-- =============================================================================
alter table executions       enable row level security;
alter table execution_events enable row level security;

alter table executions       force row level security;
alter table execution_events force row level security;

-- --- executions -----------------------------------------------------------
create policy executions_select_member
  on executions for select
  to authenticated
  using (is_organization_member(organization_id));

-- INSERT/UPDATE/DELETE reserved for service role (webhook handlers, workers, retry endpoint).
-- No authenticated-user policy = deny.

-- --- execution_events -----------------------------------------------------
create policy execution_events_select_member
  on execution_events for select
  to authenticated
  using (is_organization_member(organization_id));

-- INSERT reserved for service role (worker emits events). No user-mode writes.
