import "server-only";
import { getSupabaseAdapter } from "@/lib/supabase/adapter";
import type { BillingSubscription, BillingSubscriptionMemberView } from "@/types/database";

/**
 * Owner-only: full row including Stripe identifiers. Use from server actions
 * that need to call Stripe (plan change, billing portal).
 */
export async function getSubscription(organizationId: string): Promise<BillingSubscription | null> {
  return getSupabaseAdapter().getSubscription(organizationId);
}

/**
 * Member-safe projection: plan/usage/period only. Use from member-facing UI
 * (dashboard widget) so non-owner members can see the org's plan and usage
 * without leaking Stripe customer/subscription IDs.
 */
export async function getSubscriptionForMember(
  organizationId: string,
): Promise<BillingSubscriptionMemberView | null> {
  return getSupabaseAdapter().getSubscriptionForMember(organizationId);
}
