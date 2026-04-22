import "server-only";
import { getSupabaseAdapter } from "@/lib/supabase/adapter";
import type { AuditEvent } from "@/types/database";

export async function listAuditEvents(
  organizationId: string,
  limit?: number,
): Promise<AuditEvent[]> {
  return getSupabaseAdapter().listAuditEvents(organizationId, limit);
}
