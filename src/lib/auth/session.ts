import "server-only";
import { redirect } from "next/navigation";
import { listOrganizationsForUser } from "@/lib/db/orgs";
import type { Organization } from "@/types/database";
import { type AuthAdapter, getAuthAdapter, type Session } from "./adapter";

/**
 * Returns the active session, or null if unauthenticated.
 * Use this when the page itself decides what to render for anonymous users.
 */
export async function getSession(): Promise<Session | null> {
  return getAuthAdapter().getSession();
}

/**
 * Returns the active session, or redirects to the sign-in page.
 * Use this in server components / server actions that require authentication.
 *
 * The redirect is a Next.js `redirect()` call — it throws a special error that
 * Next intercepts; do not catch it.
 */
export async function requireSession(redirectTo?: string): Promise<Session> {
  const session = await getSession();
  if (session) return session;

  const target = redirectTo
    ? `/auth/sign-in?redirect=${encodeURIComponent(redirectTo)}`
    : "/auth/sign-in";
  redirect(target);
}

/**
 * Returns the orgs the active user belongs to.
 * Used by the workspace switcher and the dashboard.
 */
export async function getCurrentUserOrganizations(): Promise<Organization[]> {
  const session = await requireSession();
  return listOrganizationsForUser(session.userId);
}

export type { AuthAdapter, Session };
