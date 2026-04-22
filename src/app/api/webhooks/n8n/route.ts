import { type NextRequest, NextResponse } from "next/server";
import { getN8nAdapter } from "@/lib/n8n/adapter";
import { verifyWebhookSignature } from "@/lib/n8n/signature";

/**
 * n8n webhook receiver — Phase 5 implementation.
 *
 * Pipeline (order matters, each step bails fast):
 *   1. Size guard (Content-Length ≤ 5mb) — Gemini Phase 0 HIGH
 *   2. Read raw body as text (required for HMAC — JSON parse would lose bytes)
 *   3. Header presence: X-AutoFlow-Signature, X-AutoFlow-Idempotency-Key
 *   4. Signature verify: HMAC-SHA256 timing-safe + 5-min replay window
 *   5. Parse JSON body, bounded by size guard
 *   6. Idempotency lookup: duplicate idempotency_key → return 200 with duplicate flag
 *   7. Insert into webhook_inbox (Phase 7+ with SupabaseAdapter using service role)
 *   8. Fan-out to executions + execution_events (Phase 7+)
 *
 * Failure responses are intentionally generic — never leak whether signature,
 * timestamp, or idempotency key was the problem (defense vs. enumeration).
 */

export const runtime = "nodejs"; // Node crypto + raw body access
export const maxDuration = 30;

const MAX_BODY_BYTES = 5 * 1024 * 1024;

interface AcceptResponse {
  received: true;
  idempotencyKey: string;
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

  // 2. Raw body (text — HMAC must sign exact bytes)
  const rawBody = await request.text();
  if (rawBody.length > MAX_BODY_BYTES) {
    return NextResponse.json({ received: false, error: "payload_too_large" }, { status: 413 });
  }

  // 3. Required headers
  const signature = request.headers.get("x-autoflow-signature");
  const idempotencyKey = request.headers.get("x-autoflow-idempotency-key");
  if (!signature || !idempotencyKey) {
    return NextResponse.json({ received: false, error: "invalid_request" }, { status: 400 });
  }
  if (idempotencyKey.length < 1 || idempotencyKey.length > 255) {
    return NextResponse.json({ received: false, error: "invalid_request" }, { status: 400 });
  }

  // 4. Signature + replay verification
  const adapter = getN8nAdapter();
  const verifyResult = verifyWebhookSignature(rawBody, signature, adapter.getWebhookSecret());
  if (!verifyResult.ok) {
    // All failure reasons return the same 401 shape — avoid oracle.
    return NextResponse.json({ received: false, error: "unauthorized" }, { status: 401 });
  }

  // 5. Parse body (size already bounded)
  let payload: unknown;
  try {
    payload = JSON.parse(rawBody);
  } catch {
    return NextResponse.json({ received: false, error: "invalid_request" }, { status: 400 });
  }
  if (typeof payload !== "object" || payload === null || Array.isArray(payload)) {
    return NextResponse.json({ received: false, error: "invalid_request" }, { status: 400 });
  }

  // 6 + 7 + 8: idempotency lookup + inbox insert + execution fan-out.
  // Phase 7 wires the SupabaseAdapter service-role client here. Fixture mode
  // synthesizes a deterministic duplicate flag based on a well-known key prefix
  // ("dup_") so the test suite can exercise both branches.
  const duplicate = adapter.mode === "fixture" && idempotencyKey.startsWith("dup_");

  return NextResponse.json(
    {
      received: true,
      idempotencyKey,
      duplicate,
      mode: adapter.mode,
    },
    { status: duplicate ? 200 : 202 },
  );
}
