"use server";

import "server-only";
import { redirect } from "next/navigation";
import { z } from "zod";
import { emitAuditEvent } from "@/lib/audit/log";
import { requireSession } from "@/lib/auth/session";
import { getStripeAdapter } from "@/lib/stripe/adapter";

const changePlanSchema = z.object({
  targetPlan: z.enum(["free", "pro", "enterprise"]),
});

export async function startPlanChange(formData: FormData): Promise<void> {
  const session = await requireSession("/settings/billing");

  // Only owners can change plans — admins manage team, not billing.
  if (session.activeRole !== "owner") {
    redirect("/settings/billing?error=denied");
  }

  const parsed = changePlanSchema.safeParse({
    targetPlan: formData.get("targetPlan"),
  });
  if (!parsed.success) {
    redirect("/settings/billing?error=invalid");
  }

  const adapter = getStripeAdapter();
  const { checkoutUrl } = await adapter.startPlanChange(
    session.activeOrganizationId,
    parsed.data.targetPlan,
  );

  await emitAuditEvent({
    organizationId: session.activeOrganizationId,
    actorUserId: session.userId,
    actorLabel: session.displayName,
    action: "billing.plan_changed",
    resourceType: "billing_subscription",
    resourceId: null,
    diff: { targetPlan: parsed.data.targetPlan, initiatedVia: "dashboard" },
  });

  redirect(checkoutUrl);
}

export async function cancelSubscription(_formData: FormData): Promise<void> {
  const session = await requireSession("/settings/billing");

  if (session.activeRole !== "owner") {
    redirect("/settings/billing?error=denied");
  }

  await emitAuditEvent({
    organizationId: session.activeOrganizationId,
    actorUserId: session.userId,
    actorLabel: session.displayName,
    action: "billing.subscription_cancelled",
    resourceType: "billing_subscription",
    resourceId: null,
    diff: { reason: "manual cancel from dashboard" },
  });

  redirect("/settings/billing?cancelled=1");
}
