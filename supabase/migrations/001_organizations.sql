-- Migration 001: Organizations, members, invites
-- Multi-tenant foundation. RLS deny-by-default on every table.
-- Gemini HIGH: policies use EXISTS against organization_members — NOT scalar JWT claims.

-- =============================================================================
-- EXTENSIONS
-- =============================================================================
create extension if not exists "pgcrypto";  -- gen_random_uuid()
create extension if not exists "citext";    -- case-insensitive slug + email

-- =============================================================================
-- ENUMS
-- =============================================================================
create type organization_role as enum ('owner', 'admin', 'member');
create type organization_plan as enum ('free', 'pro', 'enterprise');
create type invite_status as enum ('pending', 'accepted', 'revoked', 'expired');

-- =============================================================================
-- TABLES
-- =============================================================================

create table organizations (
  id          uuid primary key default gen_random_uuid(),
  slug        citext not null unique,
  name        text not null,
  plan        organization_plan not null default 'free',
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  constraint organizations_slug_format check (slug ~ '^[a-z0-9][a-z0-9-]{1,61}[a-z0-9]$')
);

create table organization_members (
  organization_id  uuid not null references organizations(id) on delete cascade,
  user_id          uuid not null references auth.users(id) on delete cascade,
  role             organization_role not null default 'member',
  created_at       timestamptz not null default now(),
  primary key (organization_id, user_id)
);

create index organization_members_user_idx on organization_members (user_id);

create table organization_invites (
  id                uuid primary key default gen_random_uuid(),
  organization_id   uuid not null references organizations(id) on delete cascade,
  email             citext not null,
  role              organization_role not null default 'member',
  token_hash        bytea not null unique,  -- SHA-256 of one-time token; raw token never stored
  status            invite_status not null default 'pending',
  invited_by        uuid references auth.users(id) on delete set null,
  expires_at        timestamptz not null,
  accepted_at       timestamptz,
  accepted_by       uuid references auth.users(id) on delete set null,
  created_at        timestamptz not null default now(),
  constraint organization_invites_expiry_future check (expires_at > created_at),
  constraint organization_invites_accepted_consistency check (
    (status = 'accepted' and accepted_at is not null and accepted_by is not null)
    or (status <> 'accepted' and accepted_at is null and accepted_by is null)
  )
);

create unique index organization_invites_pending_unique
  on organization_invites (organization_id, email)
  where status = 'pending';

-- =============================================================================
-- UPDATED_AT TRIGGER
-- =============================================================================
create or replace function set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger organizations_set_updated_at
  before update on organizations
  for each row execute function set_updated_at();

-- =============================================================================
-- MEMBERSHIP HELPER (SECURITY DEFINER — used by RLS policies)
-- Gemini HIGH: EXISTS pattern against organization_members, not JWT claim.
-- Supports multi-org users + avoids stale-token bypass on membership eviction.
-- =============================================================================
create or replace function is_organization_member(target_org uuid)
returns boolean
language sql
security definer
set search_path = public, pg_temp
stable
as $$
  select exists (
    select 1
    from organization_members m
    where m.organization_id = target_org
      and m.user_id = auth.uid()
  );
$$;

create or replace function has_organization_role(target_org uuid, min_role organization_role)
returns boolean
language sql
security definer
set search_path = public, pg_temp
stable
as $$
  select exists (
    select 1
    from organization_members m
    where m.organization_id = target_org
      and m.user_id = auth.uid()
      and case min_role
            when 'member' then m.role in ('member', 'admin', 'owner')
            when 'admin'  then m.role in ('admin', 'owner')
            when 'owner'  then m.role = 'owner'
          end
  );
$$;

revoke all on function is_organization_member(uuid) from public;
revoke all on function has_organization_role(uuid, organization_role) from public;
grant execute on function is_organization_member(uuid) to authenticated;
grant execute on function has_organization_role(uuid, organization_role) to authenticated;

-- =============================================================================
-- ROW LEVEL SECURITY — deny by default
-- =============================================================================
alter table organizations          enable row level security;
alter table organization_members   enable row level security;
alter table organization_invites   enable row level security;

alter table organizations          force row level security;
alter table organization_members   force row level security;
alter table organization_invites   force row level security;

-- --- organizations --------------------------------------------------------
create policy organizations_select_member
  on organizations for select
  to authenticated
  using (is_organization_member(id));

create policy organizations_update_admin
  on organizations for update
  to authenticated
  using (has_organization_role(id, 'admin'))
  with check (has_organization_role(id, 'admin'));

-- INSERT + DELETE: server-only (service role / background jobs). No policy = deny.

-- --- organization_members -------------------------------------------------
create policy organization_members_select_self_or_peer
  on organization_members for select
  to authenticated
  using (
    user_id = auth.uid()
    or is_organization_member(organization_id)
  );

create policy organization_members_insert_admin
  on organization_members for insert
  to authenticated
  with check (has_organization_role(organization_id, 'admin'));

create policy organization_members_update_admin
  on organization_members for update
  to authenticated
  using (has_organization_role(organization_id, 'admin'))
  with check (has_organization_role(organization_id, 'admin'));

create policy organization_members_delete_admin_or_self
  on organization_members for delete
  to authenticated
  using (
    has_organization_role(organization_id, 'admin')
    or user_id = auth.uid()
  );

-- --- organization_invites -------------------------------------------------
create policy organization_invites_select_admin
  on organization_invites for select
  to authenticated
  using (has_organization_role(organization_id, 'admin'));

create policy organization_invites_insert_admin
  on organization_invites for insert
  to authenticated
  with check (has_organization_role(organization_id, 'admin'));

create policy organization_invites_update_admin
  on organization_invites for update
  to authenticated
  using (has_organization_role(organization_id, 'admin'))
  with check (has_organization_role(organization_id, 'admin'));

-- DELETE not allowed at the row level — invites are revoked via status change (audit trail).

comment on function is_organization_member(uuid) is
  'RLS helper: returns true if auth.uid() is a member of the given org. Gemini HIGH fix — replaces scalar JWT claim pattern.';
comment on function has_organization_role(uuid, organization_role) is
  'RLS helper: returns true if auth.uid() has at least the given role in the org (owner > admin > member).';
