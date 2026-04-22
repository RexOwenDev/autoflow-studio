"use server";

import "server-only";
import { redirect } from "next/navigation";
import { z } from "zod";
import { requireSession } from "@/lib/auth/session";
import type { OrganizationRole } from "@/types/database";

/**
 * Phase 3 invite server actions.
 *
 * Phase 7 (live mode) wires these to:
 *   1. Insert into `organization_invites` with token_hash = sha256(rand(32))
 *   2. Send transactional email via Resend with the raw token in the URL
 *   3. Redeem flow at /auth/accept-invite verifies hash + creates membership atomically
 *
 * In fixture mode the actions validate input + redirect with a status flag so the UI
 * can show success/error states without persisting anywhere.
 */

const inviteSchema = z.object({
  organizationId: z.string().uuid(),
  email: z.string().trim().toLowerCase().email().max(254),
  role: z.enum(["member", "admin", "owner"]),
});

const revokeSchema = z.object({
  organizationId: z.string().uuid(),
  inviteId: z.string().min(1),
});

const acceptSchema = z.object({
  token: z.string().min(32).max(256),
});

function authzForInvite(actorRole: OrganizationRole, targetRole: OrganizationRole): boolean {
  // Mirrors the DB policy split (Codex CRITICAL fix): only owners can grant the owner role.
  if (targetRole === "owner") return actorRole === "owner";
  return actorRole === "owner" || actorRole === "admin";
}

export async function sendInvite(formData: FormData): Promise<void> {
  const session = await requireSession("/settings/members");

  const parsed = inviteSchema.safeParse({
    organizationId: formData.get("organizationId"),
    email: formData.get("email"),
    role: formData.get("role"),
  });

  if (!parsed.success) {
    redirect("/settings/members?error=validation");
  }

  if (parsed.data.organizationId !== session.activeOrganizationId) {
    // The session resolved a different org than the form — possible CSRF or stale page.
    redirect("/settings/members?error=denied");
  }

  if (!authzForInvite(session.activeRole, parsed.data.role)) {
    redirect("/settings/members?error=denied");
  }

  // Phase 7: insert invite + send email. Fixture mode acks success.
  redirect("/settings/members?invited=1");
}

export async function revokeInvite(formData: FormData): Promise<void> {
  const session = await requireSession("/settings/members");

  const parsed = revokeSchema.safeParse({
    organizationId: formData.get("organizationId"),
    inviteId: formData.get("inviteId"),
  });

  if (!parsed.success) {
    redirect("/settings/members?error=validation");
  }

  if (parsed.data.organizationId !== session.activeOrganizationId) {
    redirect("/settings/members?error=denied");
  }

  if (session.activeRole !== "owner" && session.activeRole !== "admin") {
    redirect("/settings/members?error=denied");
  }

  // Phase 7: UPDATE organization_invites SET status='revoked' WHERE id = ... AND status = 'pending'.
  redirect("/settings/members?revoked=1");
}

export async function acceptInvite(formData: FormData): Promise<void> {
  const parsed = acceptSchema.safeParse({ token: formData.get("token") });

  if (!parsed.success) {
    redirect("/auth/sign-in?error=invalid_invite");
  }

  // Phase 7: verify sha256(token) matches a row, status='pending', expires_at > now(),
  // then atomically: insert organization_member, mark invite accepted with accepted_by/at,
  // sign user in via Supabase Auth.
  redirect("/dashboard");
}
