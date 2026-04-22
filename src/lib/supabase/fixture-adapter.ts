import "server-only";
import type {
  AuditEvent,
  BillingSubscription,
  BillingSubscriptionMemberView,
  Execution,
  ExecutionEvent,
  Organization,
  OrganizationInvite,
  OrganizationMember,
  Workflow,
} from "@/types/database";
import type { SupabaseAdapter } from "./adapter";
import {
  FIXTURE_AUDIT_EVENTS,
  FIXTURE_EXECUTION_EVENTS,
  FIXTURE_EXECUTIONS,
  FIXTURE_INVITES,
  FIXTURE_MEMBERS,
  FIXTURE_ORGS,
  FIXTURE_SUBSCRIPTIONS,
  FIXTURE_WORKFLOWS,
} from "./fixtures";

/**
 * In-memory adapter backed by deterministic fixture data.
 * No network, no DB, no APP_MODE branching at the call site.
 *
 * Tenant isolation here mirrors what Postgres RLS guarantees in live mode:
 * every read filters by organization_id (or user_id for cross-org lookups).
 */
export function createFixtureAdapter(): SupabaseAdapter {
  return {
    mode: "fixture",

    async listOrganizationsForUser(userId: string): Promise<Organization[]> {
      const orgIds = new Set(
        FIXTURE_MEMBERS.filter((m) => m.user_id === userId).map((m) => m.organization_id),
      );
      return FIXTURE_ORGS.filter((o) => orgIds.has(o.id));
    },

    async getOrganizationBySlug(slug: string): Promise<Organization | null> {
      return FIXTURE_ORGS.find((o) => o.slug === slug) ?? null;
    },

    async listMembers(organizationId: string): Promise<OrganizationMember[]> {
      return FIXTURE_MEMBERS.filter((m) => m.organization_id === organizationId);
    },

    async listPendingInvites(organizationId: string): Promise<OrganizationInvite[]> {
      return FIXTURE_INVITES.filter(
        (i) => i.organization_id === organizationId && i.status === "pending",
      );
    },

    async listWorkflows(organizationId: string): Promise<Workflow[]> {
      return FIXTURE_WORKFLOWS.filter((w) => w.organization_id === organizationId).sort((a, b) =>
        b.updated_at.localeCompare(a.updated_at),
      );
    },

    async getWorkflow(workflowId: string): Promise<Workflow | null> {
      return FIXTURE_WORKFLOWS.find((w) => w.id === workflowId) ?? null;
    },

    async listExecutions(organizationId: string, limit = 50): Promise<Execution[]> {
      return FIXTURE_EXECUTIONS.filter((e) => e.organization_id === organizationId)
        .sort((a, b) => (b.started_at ?? "").localeCompare(a.started_at ?? ""))
        .slice(0, limit);
    },

    async getExecution(executionId: string): Promise<Execution | null> {
      return FIXTURE_EXECUTIONS.find((e) => e.id === executionId) ?? null;
    },

    async listExecutionEvents(executionId: string): Promise<ExecutionEvent[]> {
      return FIXTURE_EXECUTION_EVENTS.filter((e) => e.execution_id === executionId).sort((a, b) =>
        a.occurred_at.localeCompare(b.occurred_at),
      );
    },

    async listAuditEvents(organizationId: string, limit = 100): Promise<AuditEvent[]> {
      return FIXTURE_AUDIT_EVENTS.filter((e) => e.organization_id === organizationId)
        .sort((a, b) => b.occurred_at.localeCompare(a.occurred_at))
        .slice(0, limit);
    },

    async getSubscription(organizationId: string): Promise<BillingSubscription | null> {
      return FIXTURE_SUBSCRIPTIONS.find((s) => s.organization_id === organizationId) ?? null;
    },

    async getSubscriptionForMember(
      organizationId: string,
    ): Promise<BillingSubscriptionMemberView | null> {
      const sub = FIXTURE_SUBSCRIPTIONS.find((s) => s.organization_id === organizationId);
      if (!sub) return null;
      // Project to the member-safe shape — no Stripe identifiers.
      return {
        organization_id: sub.organization_id,
        plan: sub.plan,
        status: sub.status,
        current_period_start: sub.current_period_start,
        current_period_end: sub.current_period_end,
        cancel_at_period_end: sub.cancel_at_period_end,
        trial_ends_at: sub.trial_ends_at,
        seats: sub.seats,
        metered_usage_current: sub.metered_usage_current,
      };
    },
  };
}
