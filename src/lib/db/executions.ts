import "server-only";
import { getSupabaseAdapter } from "@/lib/supabase/adapter";
import type { Execution, ExecutionEvent } from "@/types/database";

export async function listExecutions(organizationId: string, limit?: number): Promise<Execution[]> {
  return getSupabaseAdapter().listExecutions(organizationId, limit);
}

export async function getExecution(executionId: string): Promise<Execution | null> {
  return getSupabaseAdapter().getExecution(executionId);
}

export async function listExecutionEvents(executionId: string): Promise<ExecutionEvent[]> {
  return getSupabaseAdapter().listExecutionEvents(executionId);
}

export interface ExecutionStats {
  total: number;
  succeeded: number;
  failed: number;
  running: number;
  successRate: number;
}

export async function getExecutionStats(organizationId: string): Promise<ExecutionStats> {
  const executions = await listExecutions(organizationId, 1000);
  const total = executions.length;
  const succeeded = executions.filter((e) => e.status === "success").length;
  const failed = executions.filter((e) => e.status === "failed").length;
  const running = executions.filter((e) => e.status === "running" || e.status === "queued").length;
  const completed = succeeded + failed;
  const successRate = completed === 0 ? 0 : succeeded / completed;
  return { total, succeeded, failed, running, successRate };
}
