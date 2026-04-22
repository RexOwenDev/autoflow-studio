-- Migration 006: Billing subscriptions + Stripe webhook idempotency
-- Stripe is the source of truth for subscription state; this table caches it.
-- webhook_events is the idempotency ledger for Stripe callbacks.

-- =============================================================================
-- ENUMS
-- =============================================================================
create type subscription_status as enum (
  'trialing',
  'active',
  'past_due',
  'canceled',
  'incomplete',
  'incomplete_expired',
  'unpaid',
  'paused'
);

-- =============================================================================
-- TABLES
-- =============================================================================

create table billing_subscriptions (
  id                       uuid primary key default gen_random_uuid(),
  organization_id          uuid not null unique references organizations(id) on delete cascade,
  stripe_customer_id       text not null,
  stripe_subscription_id   text unique,                   -- null during checkout.session.async_payment_* window
  plan                     organization_plan not null default 'free',
  status                   subscription_status not null default 'trialing',
  current_period_start     timestamptz,
  current_period_end       timestamptz,
  cancel_at_period_end     boolean not null default false,
  trial_ends_at            timestamptz,
  seats                    integer not null default 1,
  metered_usage_current    integer not null default 0,    -- executions this period
  created_at               timestamptz not null default now(),
  updated_at               timestamptz not null default now(),
  constraint billing_subscriptions_seats_positive check (seats >= 1),
  constraint billing_subscriptions_usage_non_negative check (metered_usage_current >= 0)
);

create index billing_subscriptions_customer_idx on billing_subscriptions (stripe_customer_id);
create index billing_subscriptions_status_idx on billing_subscriptions (status) where status in ('past_due', 'unpaid');

create table webhook_events (
  id                uuid primary key default gen_random_uuid(),
  provider          text not null,                         -- 'stripe' (future: 'workos', etc.)
  event_id          text not null,                         -- Stripe event id (evt_*)
  event_type        text not null,                         -- 'customer.subscription.updated', etc.
  organization_id   uuid references organizations(id) on delete set null,
  payload           jsonb not null,
  processed         boolean not null default false,
  processing_error  text,
  received_at       timestamptz not null default now(),
  processed_at      timestamptz,
  constraint webhook_events_provider_event_unique unique (provider, event_id),
  constraint webhook_events_processed_consistency check (
    (processed = true and processed_at is not null)
    or (processed = false)
  )
);

create index webhook_events_received_idx on webhook_events (received_at desc);
create index webhook_events_unprocessed_idx on webhook_events (received_at) where processed = false;

-- =============================================================================
-- TRIGGERS
-- =============================================================================
create trigger billing_subscriptions_set_updated_at
  before update on billing_subscriptions
  for each row execute function set_updated_at();

-- =============================================================================
-- ROW LEVEL SECURITY
-- =============================================================================
alter table billing_subscriptions enable row level security;
alter table webhook_events        enable row level security;

alter table billing_subscriptions force row level security;
alter table webhook_events        force row level security;

-- --- billing_subscriptions ------------------------------------------------
-- Codex LOW fix: full row (including stripe_customer_id, stripe_subscription_id) is owner-only.
-- Members get plan/usage via the redacted view billing_subscription_member_view defined below.
create policy billing_subscriptions_select_owner
  on billing_subscriptions for select
  to authenticated
  using (has_organization_role(organization_id, 'owner'));

-- INSERT/UPDATE/DELETE reserved for Stripe webhook handler (service role).

-- --- webhook_events -------------------------------------------------------
-- Owner-only read access (PII risk — Stripe payloads contain customer emails).
create policy webhook_events_select_owner
  on webhook_events for select
  to authenticated
  using (
    organization_id is not null
    and has_organization_role(organization_id, 'owner')
  );

-- No INSERT/UPDATE/DELETE policies — service role writes only.

comment on table webhook_events is
  'Stripe webhook idempotency ledger. UNIQUE (provider, event_id) prevents double-processing.';

-- =============================================================================
-- MEMBER-SAFE VIEW (Codex LOW fix follow-on)
-- Exposes plan/usage/period to all org members WITHOUT leaking Stripe identifiers.
-- security_invoker=on ensures the underlying RLS policies on organization_members
-- are evaluated against the calling user's auth.uid(), not the view owner.
-- =============================================================================
create view billing_subscription_member_view
with (security_invoker = on)
as
select
  s.organization_id,
  s.plan,
  s.status,
  s.current_period_start,
  s.current_period_end,
  s.cancel_at_period_end,
  s.trial_ends_at,
  s.seats,
  s.metered_usage_current
from billing_subscriptions s
where exists (
  select 1
  from organization_members m
  where m.organization_id = s.organization_id
    and m.user_id = auth.uid()
);

revoke all on billing_subscription_member_view from public;
grant select on billing_subscription_member_view to authenticated;

comment on view billing_subscription_member_view is
  'Member-safe projection of billing_subscriptions: plan/usage/period only, no Stripe identifiers. Use from server-only data layer for the dashboard plan-usage widget.';
