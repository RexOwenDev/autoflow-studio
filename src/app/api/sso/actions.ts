"use server";

import "server-only";
import { redirect } from "next/navigation";
import { z } from "zod";
import { emitAuditEvent } from "@/lib/audit/log";
import { requireSession } from "@/lib/auth/session";
import { planAllowsFeature } from "@/lib/billing/plans";
import { getSubscription } from "@/lib/db/billing";
import { getWorkOSAdapter } from "@/lib/sso/adapter";

const createTokenSchema = z.object({
  name: z.string().trim().min(1).max(80),
});

const revokeTokenSchema = z.object({
  tokenId: z.string().min(1).max(64),
});

/**
 * Gate helper — ensures the session's org is on Enterprise + caller is owner.
 * Shared by every SSO action to avoid copy/paste drift.
 */
async function requireEnterpriseOwner() {
  const session = await requireSession("/settings/sso");
  if (session.activeRole !== "owner") {
    redirect("/settings/sso?error=owner_required");
  }
  const subscription = await getSubscription(session.activeOrganizationId);
  const plan = subscription?.plan ?? "free";
  if (!planAllowsFeature(plan, "sso")) {
    redirect("/settings/sso?error=upgrade_required");
  }
  return session;
}

export async function createScimToken(formData: FormData): Promise<void> {
  const session = await requireEnterpriseOwner();

  const parsed = createTokenSchema.safeParse({ name: formData.get("name") });
  if (!parsed.success) {
    redirect("/settings/sso?error=invalid_name");
  }

  const adapter = getWorkOSAdapter();
  const token = await adapter.createScimToken(session.activeOrganizationId, parsed.data.name);

  await emitAuditEvent({
    organizationId: session.activeOrganizationId,
    actorUserId: session.userId,
    actorLabel: session.displayName,
    action: "sso.configured",
    resourceType: "scim_token",
    resourceId: token.id,
    diff: { name: parsed.data.name, prefix: token.prefix, operation: "created" },
  });

  // Pass the freshly-minted secret back via a short-lived URL param (consumed once
  // by the SSO page's server component). Phase 8 will store in a server-side
  // single-use flash-message store keyed to the session.
  redirect(
    `/settings/sso?token_created=${encodeURIComponent(token.id)}&token_secret=${encodeURIComponent(token.secret)}`,
  );
}

export async function revokeScimToken(formData: FormData): Promise<void> {
  const session = await requireEnterpriseOwner();

  const parsed = revokeTokenSchema.safeParse({ tokenId: formData.get("tokenId") });
  if (!parsed.success) {
    redirect("/settings/sso?error=invalid_token_id");
  }

  await getWorkOSAdapter().revokeScimToken(session.activeOrganizationId, parsed.data.tokenId);

  await emitAuditEvent({
    organizationId: session.activeOrganizationId,
    actorUserId: session.userId,
    actorLabel: session.displayName,
    action: "sso.configured",
    resourceType: "scim_token",
    resourceId: parsed.data.tokenId,
    diff: { operation: "revoked" },
  });

  redirect("/settings/sso?token_revoked=1");
}
