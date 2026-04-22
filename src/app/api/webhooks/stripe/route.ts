import { type NextRequest, NextResponse } from "next/server";
import { getStripeAdapter } from "@/lib/stripe/adapter";
import { verifyStripeSignature } from "@/lib/stripe/signature";

/**
 * Stripe webhook receiver — Phase 6 implementation.
 *
 * Pipeline:
 *   1. Size guard (1mb — Stripe events are small JSON)
 *   2. Raw body read (required for HMAC)
 *   3. Stripe-Signature header present
 *   4. Signature verify + replay window (300s default)
 *   5. JSON parse + basic shape check (type, id, data.object)
 *   6. Idempotency dedup via webhook_events UNIQUE(provider, event_id) — Phase 7 writes;
 *      fixture synthesizes a "dup_" prefix on event_id to exercise both branches
 *   7. Dispatch by event type (subscription.*, invoice.*, checkout.session.*)
 *
 * All auth failures return the same 401 shape — no oracle for which control tripped.
 */

export const runtime = "nodejs";
export const maxDuration = 30;

const MAX_BODY_BYTES = 1 * 1024 * 1024;

// Event types we currently handle. Unknown types are acknowledged (200) so Stripe
// stops retrying, but logged as "ignored" so we can extend without shipping a deploy.
const HANDLED_EVENT_TYPES = new Set<string>([
  "customer.subscription.created",
  "customer.subscription.updated",
  "customer.subscription.deleted",
  "invoice.paid",
  "invoice.payment_failed",
  "checkout.session.completed",
]);

interface AcceptResponse {
  received: true;
  eventId: string;
  eventType: string;
  handled: boolean;
  duplicate: boolean;
  mode: "fixture" | "live";
}

interface RejectResponse {
  received: false;
  error: "payload_too_large" | "invalid_request" | "unauthorized";
}

export async function POST(
  request: NextRequest,
): Promise<NextResponse<AcceptResponse | RejectResponse>> {
  // 1. Size guard
  const contentLength = Number(request.headers.get("content-length") ?? "0");
  if (contentLength > MAX_BODY_BYTES) {
    return NextResponse.json({ received: false, error: "payload_too_large" }, { status: 413 });
  }

  // 2. Raw body (exact bytes required for HMAC)
  const rawBody = await request.text();
  if (rawBody.length > MAX_BODY_BYTES) {
    return NextResponse.json({ received: false, error: "payload_too_large" }, { status: 413 });
  }

  // 3. Signature header
  const signature = request.headers.get("stripe-signature");
  if (!signature) {
    return NextResponse.json({ received: false, error: "invalid_request" }, { status: 400 });
  }

  // 4. Signature verify
  const adapter = getStripeAdapter();
  const verify = verifyStripeSignature(rawBody, signature, adapter.getWebhookSecret());
  if (!verify.ok) {
    return NextResponse.json({ received: false, error: "unauthorized" }, { status: 401 });
  }

  // 5. Parse + shape check
  let event: unknown;
  try {
    event = JSON.parse(rawBody);
  } catch {
    return NextResponse.json({ received: false, error: "invalid_request" }, { status: 400 });
  }

  if (
    event === null ||
    typeof event !== "object" ||
    Array.isArray(event) ||
    typeof (event as { id?: unknown }).id !== "string" ||
    typeof (event as { type?: unknown }).type !== "string"
  ) {
    return NextResponse.json({ received: false, error: "invalid_request" }, { status: 400 });
  }

  const eventId = (event as { id: string }).id;
  const eventType = (event as { type: string }).type;

  if (eventId.length < 1 || eventId.length > 255 || eventType.length > 255) {
    return NextResponse.json({ received: false, error: "invalid_request" }, { status: 400 });
  }

  // 6. Dedup (fixture synth: event id starting with "evt_dup_" marks duplicate)
  const duplicate = adapter.mode === "fixture" && eventId.startsWith("evt_dup_");
  const handled = HANDLED_EVENT_TYPES.has(eventType);

  // 7. Dispatch happens in Phase 7 when SupabaseAdapter wire is live. The structure
  // below documents the intended shape — fixture mode just echoes the flags.

  return NextResponse.json(
    {
      received: true,
      eventId,
      eventType,
      handled,
      duplicate,
      mode: adapter.mode,
    },
    { status: duplicate ? 200 : 202 },
  );
}
