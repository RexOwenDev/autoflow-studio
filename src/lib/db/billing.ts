import "server-only";
import { getSupabaseAdapter } from "@/lib/supabase/adapter";
import type { BillingSubscription } from "@/types/database";

export async function getSubscription(organizationId: string): Promise<BillingSubscription | null> {
  return getSupabaseAdapter().getSubscription(organizationId);
}
