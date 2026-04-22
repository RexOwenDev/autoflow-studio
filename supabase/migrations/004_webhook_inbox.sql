-- Migration 004: Webhook inbox (n8n + generic inbound)
-- Idempotency at DB level via UNIQUE (source, idempotency_key).
-- Replay window check done at app layer with received_at vs signature timestamp.

-- =============================================================================
-- ENUMS
-- =============================================================================
create type webhook_source as enum ('n8n', 'generic');
create type webhook_processing_status as enum ('received', 'processed', 'rejected', 'duplicate');

-- =============================================================================
-- TABLES
-- =============================================================================

create table webhook_inbox (
  id                  uuid primary key default gen_random_uuid(),
  organization_id     uuid references organizations(id) on delete set null,  -- nullable: may not resolve until after lookup
  source              webhook_source not null,
  idempotency_key     text not null,
  signature           text not null,                -- HMAC-SHA256 hex — verified before insert
  signature_timestamp timestamptz,                  -- extracted from payload/header for replay window check
  payload             jsonb not null,
  status              webhook_processing_status not null default 'received',
  rejected_reason     text,
  received_at         timestamptz not null default now(),
  processed_at        timestamptz,
  constraint webhook_inbox_idempotency_unique unique (source, idempotency_key),
  constraint webhook_inbox_rejected_reason_consistency check (
    (status = 'rejected' and rejected_reason is not null)
    or (status <> 'rejected')
  )
);

create index webhook_inbox_received_idx on webhook_inbox (received_at desc);
create index webhook_inbox_status_idx on webhook_inbox (status) where status = 'received';

-- =============================================================================
-- ROW LEVEL SECURITY
-- =============================================================================
alter table webhook_inbox enable row level security;
alter table webhook_inbox force row level security;

-- Read access for org admins (debugging replay attacks, incident review).
create policy webhook_inbox_select_admin
  on webhook_inbox for select
  to authenticated
  using (
    organization_id is not null
    and has_organization_role(organization_id, 'admin')
  );

-- No INSERT/UPDATE/DELETE policies for authenticated users.
-- Service role (webhook handler) bypasses RLS for writes.
