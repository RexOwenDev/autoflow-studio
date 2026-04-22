import { createHmac, timingSafeEqual } from "node:crypto";

/**
 * HMAC-SHA256 webhook signature verification.
 *
 * Pattern: signature header is `t=<unix_ts>,v1=<hex>` where v1 = HMAC-SHA256(secret, `${t}.${rawBody}`).
 * This mirrors Stripe's Stripe-Signature convention — proven against timing attacks
 * (timingSafeEqual) and replay attacks (timestamp tolerance window).
 *
 * Do NOT log rawBody or signatures on failure paths — both may contain sensitive data.
 */

export interface VerifyOptions {
  /** Max age of the timestamp in seconds. Older = replay. Default 300 (5 min). */
  toleranceSeconds?: number;
  /** Injected clock for tests. Returns seconds since epoch. */
  now?: () => number;
}

export type VerifyResult =
  | { ok: true; timestamp: number }
  | {
      ok: false;
      reason: "missing_signature" | "malformed_header" | "stale_timestamp" | "bad_signature";
    };

function parseHeader(header: string): { t?: number; v1?: string } {
  const out: { t?: number; v1?: string } = {};
  for (const part of header.split(",")) {
    const eq = part.indexOf("=");
    if (eq <= 0) continue;
    const key = part.slice(0, eq).trim();
    const value = part.slice(eq + 1).trim();
    if (key === "t") {
      const n = Number(value);
      if (Number.isFinite(n)) out.t = n;
    } else if (key === "v1") {
      // hex string — basic shape check
      if (/^[0-9a-f]{64}$/i.test(value)) out.v1 = value.toLowerCase();
    }
  }
  return out;
}

export function verifyWebhookSignature(
  rawBody: string,
  signatureHeader: string | null,
  secret: string,
  options: VerifyOptions = {},
): VerifyResult {
  if (!signatureHeader) return { ok: false, reason: "missing_signature" };

  const { t, v1 } = parseHeader(signatureHeader);
  if (t === undefined || !v1) return { ok: false, reason: "malformed_header" };

  const now = options.now?.() ?? Math.floor(Date.now() / 1000);
  const tolerance = options.toleranceSeconds ?? 300;
  const age = now - t;
  if (age > tolerance || age < -tolerance) {
    return { ok: false, reason: "stale_timestamp" };
  }

  const expected = createHmac("sha256", secret).update(`${t}.${rawBody}`).digest("hex");

  // Both sides are 64-char hex — same length by construction. timingSafeEqual
  // requires equal-length buffers, so we convert both to buffers here.
  const expectedBuf = Buffer.from(expected, "hex");
  const providedBuf = Buffer.from(v1, "hex");
  if (expectedBuf.length !== providedBuf.length) {
    return { ok: false, reason: "bad_signature" };
  }
  if (!timingSafeEqual(expectedBuf, providedBuf)) {
    return { ok: false, reason: "bad_signature" };
  }

  return { ok: true, timestamp: t };
}

/**
 * Helper for tests + the fixture seed script — produces a valid signature
 * for a given rawBody + timestamp + secret.
 */
export function signWebhookPayload(rawBody: string, timestamp: number, secret: string): string {
  const hex = createHmac("sha256", secret).update(`${timestamp}.${rawBody}`).digest("hex");
  return `t=${timestamp},v1=${hex}`;
}
