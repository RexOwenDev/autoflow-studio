import "server-only";
import { getSupabaseAdapter } from "@/lib/supabase/adapter";
import type { Workflow } from "@/types/database";

export async function listWorkflows(organizationId: string): Promise<Workflow[]> {
  return getSupabaseAdapter().listWorkflows(organizationId);
}

export async function getWorkflow(workflowId: string): Promise<Workflow | null> {
  return getSupabaseAdapter().getWorkflow(workflowId);
}
