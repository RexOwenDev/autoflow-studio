import "server-only";
import { APP_MODE } from "@/lib/env";

/**
 * N8nAdapter surface — minimal for Phase 5.
 *
 * Responsibilities split:
 *   - Signature verification: stateless, lives in src/lib/n8n/signature.ts
 *   - Webhook persistence: owned by the route handler + SupabaseAdapter (Phase 7+)
 *   - Retry trigger: exposed here so the UI can call it via a server action
 *
 * Live mode (Phase 7+) wires this to n8n's HTTP API for signed retry callbacks;
 * fixture mode no-ops and returns a deterministic result.
 */

export interface N8nAdapter {
  readonly mode: "fixture" | "live";

  /** HMAC secret used by verifyWebhookSignature. Phase 7 reads from env. */
  getWebhookSecret(): string;

  /**
   * Signal n8n to retry a failed execution. Returns the idempotency key used
   * for the retry so the UI can display it and correlate in the dashboard.
   */
  triggerRetry(executionId: string): Promise<{ retryIdempotencyKey: string }>;
}

function createFixtureN8nAdapter(): N8nAdapter {
  return {
    mode: "fixture",
    getWebhookSecret() {
      // Deterministic fixture secret — NOT a real credential. Never ship anything
      // derived from this to production; prod reads from N8N_WEBHOOK_SECRET env.
      return "fixture-n8n-webhook-secret-do-not-use-in-prod";
    },
    async triggerRetry(executionId: string) {
      // Synthesize a deterministic retry key from the execution id so repeated
      // clicks collapse into the same retry row under the idempotency unique index.
      return { retryIdempotencyKey: `retry_${executionId}` };
    },
  };
}

let cached: N8nAdapter | undefined;

export function getN8nAdapter(): N8nAdapter {
  if (cached) return cached;
  if (APP_MODE === "fixture") {
    cached = createFixtureN8nAdapter();
    return cached;
  }
  throw new Error("[n8n] live adapter not implemented yet (Phase 7).");
}
