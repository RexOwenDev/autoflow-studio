import { type NextRequest, NextResponse } from "next/server";

/**
 * Stripe webhook receiver.
 *
 * Body size limit (Gemini HIGH fix): 1mb cap — Stripe events are small JSON payloads.
 * Full implementation in Phase 6: signature verify, idempotency, metering.
 */
export const runtime = "nodejs"; // Required for raw body access

export const maxDuration = 30;

// Gemini HIGH: 1mb body size limit — Stripe events are small JSON payloads
const MAX_BODY_BYTES = 1 * 1024 * 1024;

export async function POST(_request: NextRequest): Promise<NextResponse> {
  const contentLength = Number(_request.headers.get("content-length") ?? "0");
  if (contentLength > MAX_BODY_BYTES) {
    return NextResponse.json({ error: "Payload too large" }, { status: 413 });
  }
  // Phase 6 will replace this stub with:
  // 1. stripe.webhooks.constructEvent() — Stripe-Signature header verification
  // 2. Deduplication via webhook_events.stripe_event_id UNIQUE constraint
  // 3. Discriminated-union event routing (customer.subscription.*, invoice.*)
  // 4. Execution metering (increment usage for checkout.session.completed)
  return NextResponse.json(
    { received: true, mode: process.env.APP_MODE ?? "fixture" },
    { status: 202 },
  );
}
