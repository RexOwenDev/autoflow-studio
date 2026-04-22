-- Migration 008: Global template library
-- Templates are NOT org-scoped — they are shipped with the platform. Enterprise tier
-- (Phase 7) will get a private per-org template registry that layers on top.

-- =============================================================================
-- ENUM (mirrors src/lib/templates/schema.ts TemplateCategory)
-- =============================================================================
create type template_category as enum (
  'ingestion',
  'notifications',
  'reporting',
  'data-ops',
  'integrations'
);

-- =============================================================================
-- TABLE
-- =============================================================================
create table workflow_templates (
  slug          text primary key,
  name          text not null,
  description   text not null,
  summary       text not null,
  category      template_category not null,
  icon          text not null,             -- lucide icon name
  version       text not null,             -- semver x.y.z
  deprecated    boolean not null default false,
  fields        jsonb not null,            -- validated via src/lib/templates/schema.ts parseTemplate
  steps         jsonb not null,            -- preview pane bullets (array of strings)
  created_at    timestamptz not null default now(),
  constraint workflow_templates_slug_format check (slug ~ '^[a-z][a-z0-9-]{1,62}[a-z0-9]$'),
  constraint workflow_templates_version_semver check (version ~ '^\d+\.\d+\.\d+$')
);

create index workflow_templates_category_idx on workflow_templates (category) where deprecated = false;

-- =============================================================================
-- ROW LEVEL SECURITY
-- Templates are public-read for authenticated users; nobody writes from the client.
-- Service role (admin panel / migration seed) handles the writes.
-- =============================================================================
alter table workflow_templates enable row level security;
alter table workflow_templates force row level security;

create policy workflow_templates_select_authenticated
  on workflow_templates for select
  to authenticated
  using (deprecated = false);

-- No INSERT/UPDATE/DELETE policies — managed out-of-band.

-- =============================================================================
-- SEED — 5 fixture templates
-- =============================================================================

insert into workflow_templates (slug, name, description, summary, category, icon, version, fields, steps) values
(
  'lead-capture',
  'Lead Capture',
  'Pipe HubSpot form submissions into Slack with optional CRM enrichment.',
  'Triggered when a HubSpot form is submitted. Enriches the lead with Clearbit firmographic data, then posts a formatted alert to Slack #sales and creates a task in your CRM.',
  'ingestion',
  'FormInput',
  '1.0.0',
  '[
    {"kind":"text","name":"hubspot_portal_id","label":"HubSpot Portal ID","description":"Found in your HubSpot account settings.","required":true,"minLength":3,"maxLength":16},
    {"kind":"select","name":"slack_channel","label":"Slack channel","required":true,"options":[
      {"value":"#sales","label":"#sales"},
      {"value":"#revenue","label":"#revenue"},
      {"value":"#marketing-leads","label":"#marketing-leads"}
    ]},
    {"kind":"boolean","name":"enable_enrichment","label":"Enrich with Clearbit","description":"Requires a Clearbit API key.","defaultValue":true},
    {"kind":"secret","name":"clearbit_api_key","label":"Clearbit API key","required":false,"sensitive":true}
  ]'::jsonb,
  '["Receive HubSpot form webhook","Enrich lead with Clearbit firmographics","Post formatted alert to Slack","Create follow-up task in CRM"]'::jsonb
),
(
  'slack-notifier',
  'Slack Notifier',
  'Post formatted messages to Slack for any upstream event.',
  'A generic event → Slack relay. Accepts a webhook, renders a template, and posts to the configured channel. Perfect for Stripe invoices, deployment notifications, or CI failures.',
  'notifications',
  'MessageSquare',
  '1.0.0',
  '[
    {"kind":"secret","name":"slack_webhook_url","label":"Slack incoming webhook URL","required":true,"sensitive":true},
    {"kind":"text","name":"message_template","label":"Message template","description":"Use {{field}} syntax to reference event data.","required":true,"maxLength":2000,"defaultValue":"New event: {{title}}"},
    {"kind":"boolean","name":"include_timestamp","label":"Include timestamp","defaultValue":true},
    {"kind":"select","name":"color","label":"Attachment color","options":[
      {"value":"good","label":"Green (good)"},
      {"value":"warning","label":"Yellow (warning)"},
      {"value":"danger","label":"Red (danger)"},
      {"value":"default","label":"Default gray"}
    ],"defaultValue":"good"}
  ]'::jsonb,
  '["Receive upstream webhook","Render message template with event data","POST to Slack via incoming webhook"]'::jsonb
),
(
  'csv-to-sheets',
  'CSV to Google Sheets',
  'Append rows from uploaded CSVs to a Google Sheets tab.',
  'Triggered when a CSV is uploaded via the dashboard or API. Parses the file, validates the row shape against your header mapping, and appends rows to the configured Google Sheets tab.',
  'data-ops',
  'Sheet',
  '1.0.0',
  '[
    {"kind":"url","name":"sheets_url","label":"Google Sheets URL","required":true},
    {"kind":"text","name":"sheet_tab","label":"Tab name","required":true,"maxLength":80,"defaultValue":"Imports"},
    {"kind":"secret","name":"service_account_json","label":"Service account JSON","required":true,"sensitive":true},
    {"kind":"number","name":"batch_size","label":"Append batch size","min":1,"max":1000,"defaultValue":100}
  ]'::jsonb,
  '["Receive uploaded CSV","Validate row shape against header mapping","Append rows in batches to Google Sheets","Report rows appended + skipped"]'::jsonb
),
(
  'webhook-to-email',
  'Webhook to Email',
  'Turn any webhook event into a transactional email.',
  'A generic webhook → email relay using Postmark. Useful for sending customer receipts, onboarding emails, or internal ops alerts when an upstream event fires.',
  'notifications',
  'Mail',
  '1.0.0',
  '[
    {"kind":"secret","name":"postmark_server_token","label":"Postmark server token","required":true,"sensitive":true},
    {"kind":"email","name":"from_address","label":"From address","required":true,"maxLength":254},
    {"kind":"email","name":"to_address","label":"To address","description":"Use {{email}} syntax to pull from event data.","required":true,"maxLength":254},
    {"kind":"text","name":"subject_template","label":"Subject template","required":true,"maxLength":200},
    {"kind":"text","name":"body_template","label":"HTML body template","required":true,"maxLength":10000}
  ]'::jsonb,
  '["Receive upstream webhook","Render subject + body templates","Send transactional email via Postmark","Log delivery status"]'::jsonb
),
(
  'daily-digest',
  'Daily Digest',
  'Schedule a summary email to a team on a daily cadence.',
  'Runs on a cron schedule. Queries your configured data sources (HubSpot, Stripe, GitHub), renders a summary email, and sends it to the distribution list.',
  'reporting',
  'Calendar',
  '1.0.0',
  '[
    {"kind":"select","name":"schedule","label":"Schedule","required":true,"options":[
      {"value":"daily-09-utc","label":"Daily at 09:00 UTC"},
      {"value":"daily-17-utc","label":"Daily at 17:00 UTC"},
      {"value":"weekdays-09-utc","label":"Weekdays at 09:00 UTC"}
    ],"defaultValue":"daily-09-utc"},
    {"kind":"text","name":"recipient_list","label":"Recipients","description":"Comma-separated email addresses.","required":true,"maxLength":1000},
    {"kind":"boolean","name":"include_revenue","label":"Include revenue metrics","defaultValue":true},
    {"kind":"boolean","name":"include_pipeline","label":"Include pipeline summary","defaultValue":true},
    {"kind":"secret","name":"postmark_server_token","label":"Postmark server token","required":true,"sensitive":true}
  ]'::jsonb,
  '["Fire on cron schedule","Query configured data sources","Render HTML digest","Send email to distribution list","Log summary to audit_events"]'::jsonb
);

comment on table workflow_templates is
  'Global template library — not org-scoped. 5 fixture templates seed the gallery. Phase 7 enterprise tier adds private per-org templates.';
