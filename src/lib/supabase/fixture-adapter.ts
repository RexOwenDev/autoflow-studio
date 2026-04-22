import "server-only";
import type {
  AuditEvent,
  BillingSubscription,
  Execution,
  ExecutionEvent,
  Organization,
  OrganizationMember,
  Workflow,
} from "@/types/database";
import type { SupabaseAdapter } from "./adapter";
import {
  FIXTURE_AUDIT_EVENTS,
  FIXTURE_EXECUTION_EVENTS,
  FIXTURE_EXECUTIONS,
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
  };
}
