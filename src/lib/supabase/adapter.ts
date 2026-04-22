import "server-only";
import { APP_MODE } from "@/lib/env";
import type {
  AuditEvent,
  BillingSubscription,
  Execution,
  ExecutionEvent,
  Organization,
  OrganizationMember,
  Workflow,
} from "@/types/database";
import { createFixtureAdapter } from "./fixture-adapter";

/**
 * Read-only data access surface for Phase 2.
 * Phase 3+ will extend with mutations (createWorkflow, recordExecution, etc.).
 *
 * The adapter is the ONLY abstraction allowed to read from the database.
 * Server actions / route handlers go through `src/lib/db/*` query helpers,
 * which delegate to the adapter selected by APP_MODE.
 *
 * Live adapter constraints (Gemini CRITICAL):
 *   - Always uses createServerClient with the user's session JWT.
 *   - NEVER instantiated with the service role key from a user-context request.
 *   - Service role is reserved for webhook handlers and background jobs only.
 */
export interface SupabaseAdapter {
  readonly mode: "fixture" | "live";

  // --- organizations -----------------------------------------------------
  listOrganizationsForUser(userId: string): Promise<Organization[]>;
  getOrganizationBySlug(slug: string): Promise<Organization | null>;
  listMembers(organizationId: string): Promise<OrganizationMember[]>;

  // --- workflows ---------------------------------------------------------
  listWorkflows(organizationId: string): Promise<Workflow[]>;
  getWorkflow(workflowId: string): Promise<Workflow | null>;

  // --- executions --------------------------------------------------------
  listExecutions(organizationId: string, limit?: number): Promise<Execution[]>;
  getExecution(executionId: string): Promise<Execution | null>;
  listExecutionEvents(executionId: string): Promise<ExecutionEvent[]>;

  // --- audit -------------------------------------------------------------
  listAuditEvents(organizationId: string, limit?: number): Promise<AuditEvent[]>;

  // --- billing -----------------------------------------------------------
  getSubscription(organizationId: string): Promise<BillingSubscription | null>;
}

// =============================================================================
// FACTORY
// =============================================================================

let cachedAdapter: SupabaseAdapter | undefined;

export function getSupabaseAdapter(): SupabaseAdapter {
  if (cachedAdapter) return cachedAdapter;

  if (APP_MODE === "fixture") {
    cachedAdapter = createFixtureAdapter();
    return cachedAdapter;
  }

  // APP_MODE === "live" — Phase 3 wires @supabase/ssr here.
  // Throwing now means a misconfigured production deploy fails loudly at first use,
  // which is preferable to silently falling back to fixtures.
  throw new Error(
    "[supabase] live adapter is not implemented yet (Phase 3). Set APP_MODE=fixture or wait for Phase 3.",
  );
}
