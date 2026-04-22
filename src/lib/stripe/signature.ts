import { type VerifyResult, verifyWebhookSignature } from "@/lib/n8n/signature";

/**
 * Stripe webhook signature verification.
 *
 * Stripe's Stripe-Signature header format: `t=<unix_ts>,v1=<hex>`
 * Canonical signed string: `${t}.${rawBody}` with HMAC-SHA256(secret).
 * This matches the n8n primitive exactly — we re-export with a tighter
 * default tolerance window (Stripe recommends 300s like us).
 *
 * See: https://stripe.com/docs/webhooks#verify-manually
 */

export function verifyStripeSignature(
  rawBody: string,
  stripeSignatureHeader: string | null,
  webhookSecret: string,
  options: { toleranceSeconds?: number; now?: () => number } = {},
): VerifyResult {
  return verifyWebhookSignature(rawBody, stripeSignatureHeader, webhookSecret, {
    toleranceSeconds: options.toleranceSeconds ?? 300,
    ...(options.now !== undefined ? { now: options.now } : {}),
  });
}

// Re-export the helper for fixture seed + tests.
export { signWebhookPayload as signStripePayload } from "@/lib/n8n/signature";
