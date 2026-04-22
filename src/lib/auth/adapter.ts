import "server-only";
import { APP_MODE } from "@/lib/env";
import { FIXTURE_ORG_A_ID, FIXTURE_USER_ID } from "@/lib/supabase/fixtures";
import type { OrganizationRole } from "@/types/database";

/**
 * Auth surface for Phase 3.
 *
 * Live mode (Phase 7+) wires this to @supabase/ssr.createServerClient with the user's
 * session JWT. Phase 3 ships the FixtureAuthAdapter which auto-issues a deterministic
 * session for the dashboard demo.
 *
 * Gemini CRITICAL constraint (Phase 0 audit): the live adapter MUST use createServerClient
 * with the user's session JWT — never the service role key — for any user-context query.
 */

export interface Session {
  userId: string;
  email: string;
  displayName: string;
  /** Currently active organization for the request. */
  activeOrganizationId: string;
  /** Role of `userId` within `activeOrganizationId`. */
  activeRole: OrganizationRole;
}

export interface AuthAdapter {
  readonly mode: "fixture" | "live";

  /** Returns the current session, or null if the request is unauthenticated. */
  getSession(): Promise<Session | null>;
}

// =============================================================================
// FIXTURE ADAPTER
// =============================================================================

function createFixtureAuthAdapter(): AuthAdapter {
  const session: Session = {
    userId: FIXTURE_USER_ID,
    email: "rex@acme.test",
    displayName: "Rex Quintenta",
    activeOrganizationId: FIXTURE_ORG_A_ID,
    activeRole: "owner",
  };

  return {
    mode: "fixture",
    async getSession() {
      return session;
    },
  };
}

// =============================================================================
// FACTORY
// =============================================================================

let cachedAdapter: AuthAdapter | undefined;

export function getAuthAdapter(): AuthAdapter {
  if (cachedAdapter) return cachedAdapter;

  if (APP_MODE === "fixture") {
    cachedAdapter = createFixtureAuthAdapter();
    return cachedAdapter;
  }

  // APP_MODE === "live" — Phase 7 wires @supabase/ssr here.
  throw new Error(
    "[auth] live adapter is not implemented yet (Phase 7). Set APP_MODE=fixture or wait for Phase 7.",
  );
}
