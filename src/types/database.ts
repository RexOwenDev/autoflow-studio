/**
 * Database row types matching supabase/migrations/*.sql.
 *
 * Hand-authored for fixture-first development. Phase 7+ may regenerate via
 * `supabase gen types typescript --project-id ... > src/types/database.generated.ts`
 * and remap if drift becomes a problem; for now the migration files are the
 * canonical schema and these types track them by hand.
 */

// =============================================================================
// ENUMS (mirror migration enum types)
// =============================================================================

export type OrganizationRole = "owner" | "admin" | "member";
export type OrganizationPlan = "free" | "pro" | "enterprise";
export type InviteStatus = "pending" | "accepted" | "revoked" | "expired";

export type WorkflowStatus = "draft" | "active" | "paused" | "archived";

export type ExecutionStatus =
  | "queued"
  | "running"
  | "success"
  | "failed"
  | "retrying"
  | "cancelled";

export type ExecutionEventKind =
  | "started"
  | "node_completed"
  | "node_failed"
  | "retry_scheduled"
  | "retry_attempted"
  | "succeeded"
  | "failed"
  | "cancelled";

export type WebhookSource = "n8n" | "generic";
export type WebhookProcessingStatus = "received" | "processed" | "rejected" | "duplicate";

export type AuditAction =
  | "org.created"
  | "org.updated"
  | "org.deleted"
  | "member.invited"
  | "member.joined"
  | "member.role_changed"
  | "member.removed"
  | "workflow.created"
  | "workflow.updated"
  | "workflow.deleted"
  | "workflow.published"
  | "workflow.archived"
  | "execution.retried"
  | "execution.cancelled"
  | "billing.plan_changed"
  | "billing.subscription_cancelled"
  | "auth.sign_in"
  | "auth.sign_in_failed"
  | "auth.sign_out"
  | "sso.configured"
  | "audit.exported";

export type SubscriptionStatus =
  | "trialing"
  | "active"
  | "past_due"
  | "canceled"
  | "incomplete"
  | "incomplete_expired"
  | "unpaid"
  | "paused";

// =============================================================================
// TABLE ROW TYPES
// =============================================================================

export interface Organization {
  id: string;
  slug: string;
  name: string;
  plan: OrganizationPlan;
  created_at: string;
  updated_at: string;
}

export interface OrganizationMember {
  organization_id: string;
  user_id: string;
  role: OrganizationRole;
  created_at: string;
}

export interface OrganizationInvite {
  id: string;
  organization_id: string;
  email: string;
  role: OrganizationRole;
  status: InviteStatus;
  invited_by: string | null;
  expires_at: string;
  accepted_at: string | null;
  accepted_by: string | null;
  created_at: string;
}

export interface Workflow {
  id: string;
  organization_id: string;
  name: string;
  description: string | null;
  status: WorkflowStatus;
  template_slug: string | null;
  current_version_id: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
  archived_at: string | null;
}

export interface WorkflowVersion {
  id: string;
  workflow_id: string;
  organization_id: string;
  version: number;
  config: Record<string, unknown>;
  created_by: string | null;
  created_at: string;
}

export interface Execution {
  id: string;
  organization_id: string;
  workflow_id: string;
  workflow_version_id: string | null;
  status: ExecutionStatus;
  trigger_source: string;
  idempotency_key: string | null;
  started_at: string | null;
  finished_at: string | null;
  duration_ms: number | null;
  error_message: string | null;
  created_at: string;
}

export interface ExecutionEvent {
  id: string;
  execution_id: string;
  organization_id: string;
  kind: ExecutionEventKind;
  node_id: string | null;
  payload: Record<string, unknown>;
  occurred_at: string;
}

export interface WebhookInbox {
  id: string;
  organization_id: string | null;
  source: WebhookSource;
  idempotency_key: string;
  signature: string;
  signature_timestamp: string | null;
  payload: Record<string, unknown>;
  status: WebhookProcessingStatus;
  rejected_reason: string | null;
  received_at: string;
  processed_at: string | null;
}

export interface AuditEvent {
  id: string;
  organization_id: string;
  actor_user_id: string | null;
  actor_label: string | null;
  action: AuditAction;
  resource_type: string;
  resource_id: string | null;
  diff: Record<string, unknown>;
  ip_address: string | null;
  user_agent: string | null;
  occurred_at: string;
}

export interface BillingSubscription {
  id: string;
  organization_id: string;
  stripe_customer_id: string;
  stripe_subscription_id: string | null;
  plan: OrganizationPlan;
  status: SubscriptionStatus;
  current_period_start: string | null;
  current_period_end: string | null;
  cancel_at_period_end: boolean;
  trial_ends_at: string | null;
  seats: number;
  metered_usage_current: number;
  created_at: string;
  updated_at: string;
}

export interface WebhookEvent {
  id: string;
  provider: string;
  event_id: string;
  event_type: string;
  organization_id: string | null;
  payload: Record<string, unknown>;
  processed: boolean;
  processing_error: string | null;
  received_at: string;
  processed_at: string | null;
}
