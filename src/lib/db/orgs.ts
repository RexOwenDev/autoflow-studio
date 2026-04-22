import "server-only";
import { getSupabaseAdapter } from "@/lib/supabase/adapter";
import type { Organization, OrganizationInvite, OrganizationMember } from "@/types/database";

export async function listOrganizationsForUser(userId: string): Promise<Organization[]> {
  return getSupabaseAdapter().listOrganizationsForUser(userId);
}

export async function getOrganizationBySlug(slug: string): Promise<Organization | null> {
  return getSupabaseAdapter().getOrganizationBySlug(slug);
}

export async function listMembers(organizationId: string): Promise<OrganizationMember[]> {
  return getSupabaseAdapter().listMembers(organizationId);
}

export async function listPendingInvites(organizationId: string): Promise<OrganizationInvite[]> {
  return getSupabaseAdapter().listPendingInvites(organizationId);
}
