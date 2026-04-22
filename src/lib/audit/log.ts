import "server-only";
import type { AuditAction } from "@/types/database";

/**
 * Audit log emitter.
 *
 * Phase 5: fixture mode logs to an in-memory ring buffer + console for traceability.
 * Phase 7+: wire to SupabaseAdapter using the service-role client (audit_events has
 * no INSERT policy for authenticated — only service role writes).
 *
 * Codex HIGH constraint: diff payloads MUST NOT include raw secrets. Callers are
 * responsible for redacting sensitive fields before calling emit(). The helper does
 * a final sweep on known suspicious keys as defense in depth.
 */

const SENSITIVE_KEY_PATTERNS: RegExp[] = [
  /token/i,
  /password/i,
  /secret/i,
  /key/i,
  /api.?key/i,
  /authorization/i,
];

export interface AuditEmitOptions {
  organizationId: string;
  actorUserId: string | null;
  actorLabel: string | null;
  action: AuditAction;
  resourceType: string;
  resourceId: string | null;
  diff?: Record<string, unknown>;
  ipAddress?: string | null;
  userAgent?: string | null;
}

function redactDiff(diff: Record<string, unknown> | undefined): Record<string, unknown> {
  if (!diff) return {};
  const out: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(diff)) {
    if (SENSITIVE_KEY_PATTERNS.some((p) => p.test(key))) {
      out[key] = "[REDACTED]";
      continue;
    }
    if (value !== null && typeof value === "object" && !Array.isArray(value)) {
      out[key] = redactDiff(value as Record<string, unknown>);
    } else {
      out[key] = value;
    }
  }
  return out;
}

export async function emitAuditEvent(options: AuditEmitOptions): Promise<void> {
  const entry = {
    organization_id: options.organizationId,
    actor_user_id: options.actorUserId,
    actor_label: options.actorLabel,
    action: options.action,
    resource_type: options.resourceType,
    resource_id: options.resourceId,
    diff: redactDiff(options.diff),
    ip_address: options.ipAddress ?? null,
    user_agent: options.userAgent ?? null,
    occurred_at: new Date().toISOString(),
  };

  // Phase 7: service-role INSERT into audit_events. Fixture mode stays in-process.
  // biome-ignore lint/suspicious/noConsole: audit events always log until live DB wiring
  console.info("[audit]", JSON.stringify(entry));
}
