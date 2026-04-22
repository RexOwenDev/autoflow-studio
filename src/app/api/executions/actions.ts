"use server";

import "server-only";
import { redirect } from "next/navigation";
import { z } from "zod";
import { emitAuditEvent } from "@/lib/audit/log";
import { requireSession } from "@/lib/auth/session";
import { getN8nAdapter } from "@/lib/n8n/adapter";

const retrySchema = z.object({
  executionId: z.string().min(1),
});

const cancelSchema = z.object({
  executionId: z.string().min(1),
});

export async function retryExecution(formData: FormData): Promise<void> {
  const session = await requireSession();
  const parsed = retrySchema.safeParse({ executionId: formData.get("executionId") });
  if (!parsed.success) redirect("/executions?error=invalid");

  // Phase 7+: verify the execution belongs to the active org, then trigger retry.
  // Fixture mode emits an audit event + redirects.
  const adapter = getN8nAdapter();
  const { retryIdempotencyKey } = await adapter.triggerRetry(parsed.data.executionId);

  await emitAuditEvent({
    organizationId: session.activeOrganizationId,
    actorUserId: session.userId,
    actorLabel: session.displayName,
    action: "execution.retried",
    resourceType: "execution",
    resourceId: parsed.data.executionId,
    diff: { retryIdempotencyKey, reason: "manual retry from dashboard" },
  });

  redirect(`/executions/${parsed.data.executionId}?retry=scheduled`);
}

export async function cancelExecution(formData: FormData): Promise<void> {
  const session = await requireSession();
  const parsed = cancelSchema.safeParse({ executionId: formData.get("executionId") });
  if (!parsed.success) redirect("/executions?error=invalid");

  await emitAuditEvent({
    organizationId: session.activeOrganizationId,
    actorUserId: session.userId,
    actorLabel: session.displayName,
    action: "execution.cancelled",
    resourceType: "execution",
    resourceId: parsed.data.executionId,
    diff: { reason: "manual cancel from dashboard" },
  });

  redirect(`/executions/${parsed.data.executionId}?cancelled=1`);
}
