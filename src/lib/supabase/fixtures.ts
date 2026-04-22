import "server-only";
import type {
  AuditEvent,
  BillingSubscription,
  Execution,
  ExecutionEvent,
  Organization,
  OrganizationInvite,
  OrganizationMember,
  Workflow,
} from "@/types/database";

/**
 * Deterministic fixture data for APP_MODE=fixture.
 * Two orgs ("Acme Corp" and "Beta Logistics") prove tenant isolation visually.
 *
 * Timestamps are anchored to a fixed epoch so screenshots and tests are reproducible.
 */

const NOW = "2026-04-22T12:00:00.000Z";
const minutesAgo = (n: number): string =>
  new Date(new Date(NOW).getTime() - n * 60_000).toISOString();
const hoursAgo = (n: number): string => minutesAgo(n * 60);
const daysAgo = (n: number): string => hoursAgo(n * 24);

export const FIXTURE_USER_ID = "00000000-0000-0000-0000-000000000001";
export const FIXTURE_ORG_A_ID = "11111111-1111-1111-1111-111111111111";
export const FIXTURE_ORG_B_ID = "22222222-2222-2222-2222-222222222222";

// =============================================================================
// ORGS + MEMBERS
// =============================================================================

export const FIXTURE_ORGS: readonly Organization[] = [
  {
    id: FIXTURE_ORG_A_ID,
    slug: "acme-corp",
    name: "Acme Corp",
    plan: "pro",
    created_at: daysAgo(45),
    updated_at: daysAgo(2),
  },
  {
    id: FIXTURE_ORG_B_ID,
    slug: "beta-logistics",
    name: "Beta Logistics",
    plan: "free",
    created_at: daysAgo(7),
    updated_at: daysAgo(1),
  },
];

export const FIXTURE_MEMBERS: readonly OrganizationMember[] = [
  {
    organization_id: FIXTURE_ORG_A_ID,
    user_id: FIXTURE_USER_ID,
    role: "owner",
    created_at: daysAgo(45),
  },
  {
    organization_id: FIXTURE_ORG_A_ID,
    user_id: "00000000-0000-0000-0000-000000000a02",
    role: "admin",
    created_at: daysAgo(20),
  },
  {
    organization_id: FIXTURE_ORG_A_ID,
    user_id: "00000000-0000-0000-0000-000000000a03",
    role: "member",
    created_at: daysAgo(10),
  },
];

// Display labels for the fixture co-members (Phase 7 will join auth.users for real names).
export const FIXTURE_MEMBER_DISPLAY: Record<string, { name: string; email: string }> = {
  [FIXTURE_USER_ID]: { name: "Rex Quintenta", email: "rex@acme.test" },
  "00000000-0000-0000-0000-000000000a02": {
    name: "Jamie Chen",
    email: "jamie@acme.test",
  },
  "00000000-0000-0000-0000-000000000a03": {
    name: "Priya Patel",
    email: "priya@acme.test",
  },
};

export const FIXTURE_INVITES: readonly OrganizationInvite[] = [
  {
    id: "inv-001",
    organization_id: FIXTURE_ORG_A_ID,
    email: "marcus@acme.test",
    role: "member",
    status: "pending",
    invited_by: FIXTURE_USER_ID,
    expires_at: daysAgo(-1), // ~24h from now
    accepted_at: null,
    accepted_by: null,
    created_at: daysAgo(1),
  },
];

// =============================================================================
// WORKFLOWS (Acme only — Beta is empty to prove tenant isolation visually)
// =============================================================================

const WF_LEAD_CAPTURE = "aaaa1111-1111-1111-1111-111111111111";
const WF_SLACK_NOTIFIER = "aaaa1111-2222-2222-2222-222222222222";
const WF_DAILY_DIGEST = "aaaa1111-3333-3333-3333-333333333333";
const WF_WEBHOOK_EMAIL = "aaaa1111-4444-4444-4444-444444444444";
const WF_CSV_SHEETS = "aaaa1111-5555-5555-5555-555555555555";

export const FIXTURE_WORKFLOWS: readonly Workflow[] = [
  {
    id: WF_LEAD_CAPTURE,
    organization_id: FIXTURE_ORG_A_ID,
    name: "Lead Capture",
    description: "HubSpot form → Slack #sales + CRM enrichment",
    status: "active",
    template_slug: "lead-capture",
    current_version_id: null,
    created_by: FIXTURE_USER_ID,
    created_at: daysAgo(30),
    updated_at: hoursAgo(6),
    archived_at: null,
  },
  {
    id: WF_SLACK_NOTIFIER,
    organization_id: FIXTURE_ORG_A_ID,
    name: "Slack Notifier",
    description: "Stripe payment events → #revenue channel",
    status: "active",
    template_slug: "slack-notifier",
    current_version_id: null,
    created_by: FIXTURE_USER_ID,
    created_at: daysAgo(20),
    updated_at: hoursAgo(2),
    archived_at: null,
  },
  {
    id: WF_DAILY_DIGEST,
    organization_id: FIXTURE_ORG_A_ID,
    name: "Daily Digest",
    description: "9am UTC daily summary email to leadership",
    status: "active",
    template_slug: "daily-digest",
    current_version_id: null,
    created_by: FIXTURE_USER_ID,
    created_at: daysAgo(15),
    updated_at: daysAgo(1),
    archived_at: null,
  },
  {
    id: WF_WEBHOOK_EMAIL,
    organization_id: FIXTURE_ORG_A_ID,
    name: "Webhook → Email",
    description: "Generic webhook receiver → Postmark transactional email",
    status: "paused",
    template_slug: "webhook-to-email",
    current_version_id: null,
    created_by: FIXTURE_USER_ID,
    created_at: daysAgo(10),
    updated_at: daysAgo(3),
    archived_at: null,
  },
  {
    id: WF_CSV_SHEETS,
    organization_id: FIXTURE_ORG_A_ID,
    name: "CSV → Sheets",
    description: "Parse uploaded CSV, append rows to Google Sheets",
    status: "draft",
    template_slug: "csv-to-sheets",
    current_version_id: null,
    created_by: FIXTURE_USER_ID,
    created_at: daysAgo(5),
    updated_at: daysAgo(5),
    archived_at: null,
  },
];

// =============================================================================
// EXECUTIONS — varied statuses for dashboard realism
// =============================================================================

export const FIXTURE_EXECUTIONS: readonly Execution[] = [
  {
    id: "ee000001-0001-0001-0001-000000000001",
    organization_id: FIXTURE_ORG_A_ID,
    workflow_id: WF_LEAD_CAPTURE,
    workflow_version_id: null,
    status: "success",
    trigger_source: "webhook",
    idempotency_key: "lead_2026_001",
    started_at: minutesAgo(2),
    finished_at: minutesAgo(2),
    duration_ms: 1200,
    error_message: null,
    created_at: minutesAgo(2),
  },
  {
    id: "ee000002-0002-0002-0002-000000000002",
    organization_id: FIXTURE_ORG_A_ID,
    workflow_id: WF_SLACK_NOTIFIER,
    workflow_version_id: null,
    status: "success",
    trigger_source: "webhook",
    idempotency_key: "stripe_evt_001",
    started_at: minutesAgo(5),
    finished_at: minutesAgo(5),
    duration_ms: 800,
    error_message: null,
    created_at: minutesAgo(5),
  },
  {
    id: "ee000003-0003-0003-0003-000000000003",
    organization_id: FIXTURE_ORG_A_ID,
    workflow_id: WF_DAILY_DIGEST,
    workflow_version_id: null,
    status: "failed",
    trigger_source: "schedule",
    idempotency_key: null,
    started_at: minutesAgo(12),
    finished_at: minutesAgo(12),
    duration_ms: 3100,
    error_message: "SMTP timeout connecting to mail.acme.com:587",
    created_at: minutesAgo(12),
  },
  {
    id: "ee000004-0004-0004-0004-000000000004",
    organization_id: FIXTURE_ORG_A_ID,
    workflow_id: WF_WEBHOOK_EMAIL,
    workflow_version_id: null,
    status: "success",
    trigger_source: "webhook",
    idempotency_key: "wh_2026_001",
    started_at: minutesAgo(18),
    finished_at: minutesAgo(18),
    duration_ms: 2400,
    error_message: null,
    created_at: minutesAgo(18),
  },
  {
    id: "ee000005-0005-0005-0005-000000000005",
    organization_id: FIXTURE_ORG_A_ID,
    workflow_id: WF_CSV_SHEETS,
    workflow_version_id: null,
    status: "retrying",
    trigger_source: "manual",
    idempotency_key: null,
    started_at: minutesAgo(21),
    finished_at: null,
    duration_ms: null,
    error_message: "Google Sheets API rate limit — retry 1/3",
    created_at: minutesAgo(21),
  },
];

export const FIXTURE_EXECUTION_EVENTS: readonly ExecutionEvent[] = [
  {
    id: "evt-001",
    execution_id: "ee000001-0001-0001-0001-000000000001",
    organization_id: FIXTURE_ORG_A_ID,
    kind: "started",
    node_id: null,
    payload: {},
    occurred_at: minutesAgo(2),
  },
  {
    id: "evt-002",
    execution_id: "ee000001-0001-0001-0001-000000000001",
    organization_id: FIXTURE_ORG_A_ID,
    kind: "node_completed",
    node_id: "hubspot_lookup",
    payload: { records: 1 },
    occurred_at: minutesAgo(2),
  },
  {
    id: "evt-003",
    execution_id: "ee000001-0001-0001-0001-000000000001",
    organization_id: FIXTURE_ORG_A_ID,
    kind: "succeeded",
    node_id: null,
    payload: {},
    occurred_at: minutesAgo(2),
  },
];

// =============================================================================
// AUDIT EVENTS — proves the timeline UI in Phase 5
// =============================================================================

export const FIXTURE_AUDIT_EVENTS: readonly AuditEvent[] = [
  {
    id: "au-001",
    organization_id: FIXTURE_ORG_A_ID,
    actor_user_id: FIXTURE_USER_ID,
    actor_label: "Rex Quintenta",
    action: "workflow.published",
    resource_type: "workflow",
    resource_id: WF_SLACK_NOTIFIER,
    diff: { from: { status: "draft" }, to: { status: "active" } },
    ip_address: null,
    user_agent: null,
    occurred_at: hoursAgo(2),
  },
  {
    id: "au-002",
    organization_id: FIXTURE_ORG_A_ID,
    actor_user_id: FIXTURE_USER_ID,
    actor_label: "Rex Quintenta",
    action: "execution.retried",
    resource_type: "execution",
    resource_id: "ee000005-0005-0005-0005-000000000005",
    diff: { reason: "manual retry from dashboard" },
    ip_address: null,
    user_agent: null,
    occurred_at: minutesAgo(20),
  },
  {
    id: "au-003",
    organization_id: FIXTURE_ORG_A_ID,
    actor_user_id: null,
    actor_label: "system",
    action: "billing.plan_changed",
    resource_type: "billing_subscription",
    resource_id: null,
    diff: { from: { plan: "free" }, to: { plan: "pro" } },
    ip_address: null,
    user_agent: null,
    occurred_at: daysAgo(30),
  },
];

// =============================================================================
// BILLING
// =============================================================================

export const FIXTURE_SUBSCRIPTIONS: readonly BillingSubscription[] = [
  {
    id: "bs-001",
    organization_id: FIXTURE_ORG_A_ID,
    stripe_customer_id: "cus_fixture_acme",
    stripe_subscription_id: "sub_fixture_acme_pro",
    plan: "pro",
    status: "active",
    current_period_start: daysAgo(22),
    current_period_end: daysAgo(-8),
    cancel_at_period_end: false,
    trial_ends_at: null,
    seats: 5,
    metered_usage_current: 247,
    created_at: daysAgo(45),
    updated_at: daysAgo(22),
  },
];
