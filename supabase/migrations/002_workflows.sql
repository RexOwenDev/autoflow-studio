-- Migration 002: Workflows + workflow versions
-- Soft-deletable workflows; versions are append-only (audit trail).

-- =============================================================================
-- ENUMS
-- =============================================================================
create type workflow_status as enum ('draft', 'active', 'paused', 'archived');

-- =============================================================================
-- TABLES
-- =============================================================================

create table workflows (
  id                uuid primary key default gen_random_uuid(),
  organization_id   uuid not null references organizations(id) on delete cascade,
  name              text not null,
  description       text,
  status            workflow_status not null default 'draft',
  template_slug     text,  -- references template library; nullable for custom workflows
  current_version_id uuid, -- updated after version insert (FK added later to avoid cycle)
  created_by        uuid references auth.users(id) on delete set null,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now(),
  archived_at       timestamptz,
  constraint workflows_name_not_empty check (length(trim(name)) > 0),
  -- Codex HIGH fix: composite uniqueness lets workflow_versions enforce tenant integrity via FK.
  constraint workflows_id_org_unique unique (id, organization_id)
);

create index workflows_org_status_idx on workflows (organization_id, status) where archived_at is null;
create index workflows_org_updated_idx on workflows (organization_id, updated_at desc);

create table workflow_versions (
  id                uuid primary key default gen_random_uuid(),
  workflow_id       uuid not null,
  organization_id   uuid not null references organizations(id) on delete cascade,
  version           integer not null,
  config            jsonb not null,     -- validated at app layer (Zod) before insert
  config_hash       bytea not null,     -- SHA-256 of canonical config; dedupes no-op saves
  created_by        uuid references auth.users(id) on delete set null,
  created_at        timestamptz not null default now(),
  unique (workflow_id, version),
  constraint workflow_versions_version_positive check (version > 0),
  -- Codex HIGH fix: tenant integrity — workflow_id and organization_id MUST refer to the same tenant.
  -- The composite FK closes the bypass where a member of org A inserts a version row tagged with
  -- org A but pointing at org B's workflow_id.
  constraint workflow_versions_workflow_org_fk
    foreign key (workflow_id, organization_id)
    references workflows(id, organization_id)
    on delete cascade
);

create index workflow_versions_workflow_idx on workflow_versions (workflow_id, version desc);

-- Now that workflow_versions exists, add the FK on workflows.current_version_id
alter table workflows
  add constraint workflows_current_version_fk
    foreign key (current_version_id) references workflow_versions(id) on delete set null;

-- =============================================================================
-- TRIGGERS
-- =============================================================================
create trigger workflows_set_updated_at
  before update on workflows
  for each row execute function set_updated_at();

-- =============================================================================
-- ROW LEVEL SECURITY
-- =============================================================================
alter table workflows         enable row level security;
alter table workflow_versions enable row level security;

alter table workflows         force row level security;
alter table workflow_versions force row level security;

-- --- workflows ------------------------------------------------------------
create policy workflows_select_member
  on workflows for select
  to authenticated
  using (is_organization_member(organization_id));

create policy workflows_insert_member
  on workflows for insert
  to authenticated
  with check (is_organization_member(organization_id));

create policy workflows_update_member
  on workflows for update
  to authenticated
  using (is_organization_member(organization_id))
  with check (is_organization_member(organization_id));

create policy workflows_delete_admin
  on workflows for delete
  to authenticated
  using (has_organization_role(organization_id, 'admin'));

-- --- workflow_versions (append-only from the user's perspective) ---------
create policy workflow_versions_select_member
  on workflow_versions for select
  to authenticated
  using (is_organization_member(organization_id));

create policy workflow_versions_insert_member
  on workflow_versions for insert
  to authenticated
  with check (is_organization_member(organization_id));

-- UPDATE + DELETE not allowed — versions are immutable (audit trail).
