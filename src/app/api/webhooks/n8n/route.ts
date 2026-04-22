import { type NextRequest, NextResponse } from "next/server";

/**
 * n8n webhook receiver.
 *
 * Body size limit (Gemini HIGH fix): 5mb cap prevents OOM from oversized payloads.
 * Full implementation in Phase 5: HMAC verify, idempotent insert, replay window.
 */
export const runtime = "nodejs"; // Required for raw body access during HMAC verification

export const maxDuration = 30;

// Gemini HIGH: 5mb body size limit — Phase 5 will enforce via content-length check before full read
const MAX_BODY_BYTES = 5 * 1024 * 1024;

export async function POST(_request: NextRequest): Promise<NextResponse> {
  const contentLength = Number(_request.headers.get("content-length") ?? "0");
  if (contentLength > MAX_BODY_BYTES) {
    return NextResponse.json({ error: "Payload too large" }, { status: 413 });
  }
  // Phase 5 will replace this stub with:
  // 1. HMAC-SHA256 signature verification
  // 2. Idempotent insert into webhook_inbox
  // 3. Fan-out to executions table
  // 4. 5-minute replay window check
  // 5. Signed retry endpoint
  return NextResponse.json(
    { received: true, mode: process.env.APP_MODE ?? "fixture" },
    { status: 202 },
  );
}
