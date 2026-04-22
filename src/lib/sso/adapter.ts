import "server-only";
import { APP_MODE } from "@/lib/env";

/**
 * WorkOS SSO adapter — Phase 7 surface.
 *
 * Live mode (Phase 8+) wires this to @workos-inc/node with WORKOS_API_KEY +
 * WORKOS_CLIENT_ID env. Fixture mode returns deterministic connection data so
 * the SSO config UI demos end-to-end.
 *
 * All methods are plan-gated at the call site — callers must verify the org's
 * plan is "enterprise" before invoking. The adapter does not double-check;
 * it trusts the caller.
 */

export type SsoProvider =
  | "okta"
  | "azure-ad"
  | "google"
  | "onelogin"
  | "jumpcloud"
  | "generic-saml";

export type SsoConnectionStatus =
  | "pending" // metadata URL submitted, awaiting provider test
  | "active" // provider → AutoFlow SSO test flow passed
  | "inactive" // manually disabled by owner
  | "error"; // last test failed

export interface SsoConnection {
  id: string;
  organizationId: string;
  provider: SsoProvider;
  displayName: string;
  status: SsoConnectionStatus;
  metadataUrl: string | null;
  domains: readonly string[]; // email domains that route through this connection
  createdAt: string;
  lastTestedAt: string | null;
  lastError: string | null;
}

export interface ScimToken {
  id: string;
  organizationId: string;
  name: string;
  // The raw token is returned ONCE on create; only the prefix + hash are stored.
  prefix: string;
  createdAt: string;
  lastUsedAt: string | null;
  revokedAt: string | null;
}

export interface ScimTokenWithSecret extends ScimToken {
  /** Shown once on create. Never stored server-side in plaintext. */
  secret: string;
}

export interface WorkOSAdapter {
  readonly mode: "fixture" | "live";

  getConnection(organizationId: string): Promise<SsoConnection | null>;

  listScimTokens(organizationId: string): Promise<ScimToken[]>;

  createScimToken(organizationId: string, name: string): Promise<ScimTokenWithSecret>;

  revokeScimToken(organizationId: string, tokenId: string): Promise<void>;
}

function createFixtureWorkOSAdapter(): WorkOSAdapter {
  // Per-process in-memory state so server-action round-trips keep state within one
  // dev run. Refreshing wipes state — fixture semantics.
  const connections = new Map<string, SsoConnection>();
  const tokens = new Map<string, ScimToken[]>();

  return {
    mode: "fixture",
    async getConnection(organizationId) {
      return connections.get(organizationId) ?? null;
    },
    async listScimTokens(organizationId) {
      return tokens.get(organizationId) ?? [];
    },
    async createScimToken(organizationId, name) {
      const id = `scim_${crypto.randomUUID().slice(0, 8)}`;
      const secretBody = crypto.randomUUID().replace(/-/g, "");
      const secret = `scim_sk_${secretBody}`;
      const token: ScimToken = {
        id,
        organizationId,
        name,
        prefix: secret.slice(0, 16),
        createdAt: new Date().toISOString(),
        lastUsedAt: null,
        revokedAt: null,
      };
      const existing = tokens.get(organizationId) ?? [];
      tokens.set(organizationId, [...existing, token]);
      return { ...token, secret };
    },
    async revokeScimToken(organizationId, tokenId) {
      const existing = tokens.get(organizationId) ?? [];
      tokens.set(
        organizationId,
        existing.map((t) => (t.id === tokenId ? { ...t, revokedAt: new Date().toISOString() } : t)),
      );
    },
  };
}

let cached: WorkOSAdapter | undefined;

export function getWorkOSAdapter(): WorkOSAdapter {
  if (cached) return cached;
  if (APP_MODE === "fixture") {
    cached = createFixtureWorkOSAdapter();
    return cached;
  }
  throw new Error("[sso] live WorkOS adapter not implemented (Phase 8 wiring).");
}
