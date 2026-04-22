-- Migration 009: SSO connections + SCIM tokens (Enterprise plan)
-- Plan gate is enforced at the app layer (src/lib/sso/plan-gate.ts). The DB does not
-- check the org's plan because plan state lives in billing_subscriptions and joining
-- from RLS policies adds latency to every SSO read. App-layer gate is sufficient.

-- =============================================================================
-- ENUMS
-- =============================================================================
create type sso_provider as enum (
  'okta',
  'azure-ad',
  'google',
  'onelogin',
  'jumpcloud',
  'generic-saml'
);

create type sso_connection_status as enum ('pending', 'active', 'inactive', 'error');

-- =============================================================================
-- TABLES
-- =============================================================================

create table sso_connections (
  id                uuid primary key default gen_random_uuid(),
  organization_id   uuid not null unique references organizations(id) on delete cascade,
  provider          sso_provider not null,
  display_name      text not null,
  status            sso_connection_status not null default 'pending',
  metadata_url      text,
  domains           text[] not null default '{}',
  created_at        timestamptz not null default now(),
  last_tested_at    timestamptz,
  last_error        text,
  constraint sso_connections_metadata_url_format
    check (metadata_url is null or metadata_url ~ '^https?://'),
  constraint sso_connections_display_name_length
    check (char_length(display_name) between 1 and 80)
);

-- Domain lookup: one org per domain — prevents two orgs claiming the same email domain.
-- A GIN index on the array + unique constraint via trigger would be ideal, but Postgres
-- can't express UNIQUE across array elements natively. App layer enforces uniqueness
-- on write; this index makes SSO-by-email lookup fast.
create index sso_connections_domains_idx on sso_connections using gin (domains);

create table scim_tokens (
  id                uuid primary key default gen_random_uuid(),
  organization_id   uuid not null references organizations(id) on delete cascade,
  name              text not null,
  token_prefix      text not null,               -- first 16 chars for display in UI
  token_hash        bytea not null unique,       -- SHA-256 of raw token; raw never stored
  created_at        timestamptz not null default now(),
  created_by        uuid references auth.users(id) on delete set null,
  last_used_at      timestamptz,
  revoked_at        timestamptz,
  constraint scim_tokens_name_length check (char_length(name) between 1 and 80),
  constraint scim_tokens_prefix_length check (char_length(token_prefix) = 16)
);

create index scim_tokens_org_idx on scim_tokens (organization_id) where revoked_at is null;

-- =============================================================================
-- ROW LEVEL SECURITY — owner-only reads + writes at user tier
-- Service role (background sync jobs) bypasses RLS.
-- =============================================================================
alter table sso_connections enable row level security;
alter table scim_tokens     enable row level security;

alter table sso_connections force row level security;
alter table scim_tokens     force row level security;

-- SSO connections: all members can see that SSO exists (for the workspace switcher
-- badge) but only owners can read the full config including metadata_url + domains.
-- For simplicity, Phase 7 restricts SELECT to owners entirely; a future member-safe
-- view can expose just (status, provider) if needed.
create policy sso_connections_select_owner
  on sso_connections for select
  to authenticated
  using (has_organization_role(organization_id, 'owner'));

-- INSERT/UPDATE/DELETE reserved for server actions using service role.

-- SCIM tokens: OWNER-only. token_prefix is the only field shown in UI.
create policy scim_tokens_select_owner
  on scim_tokens for select
  to authenticated
  using (has_organization_role(organization_id, 'owner'));

-- Never INSERT/UPDATE from authenticated role — server actions use service role.

comment on table sso_connections is
  'SSO/SAML connections for Enterprise-plan orgs. Plan gate enforced at app layer — the DB does not join to billing_subscriptions to avoid RLS read overhead.';
comment on table scim_tokens is
  'SCIM bearer tokens. Raw secret never stored — only SHA-256 hash + 16-char prefix for UI display. Raw returned exactly once on create.';
