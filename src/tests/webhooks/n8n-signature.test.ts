/**
 * HMAC signature verification unit tests.
 * Cover the primitive before testing the full route handler.
 */

import { describe, expect, it } from "vitest";
import { signWebhookPayload, verifyWebhookSignature } from "@/lib/n8n/signature";

const SECRET = "test-secret-abc123";
const BODY = '{"workflow":"lead-capture","run":"test"}';

describe("verifyWebhookSignature", () => {
  const now = 1_700_000_000;

  it("accepts a valid signature within the tolerance window", () => {
    const header = signWebhookPayload(BODY, now, SECRET);
    const result = verifyWebhookSignature(BODY, header, SECRET, { now: () => now });
    expect(result.ok).toBe(true);
  });

  it("rejects null header as missing_signature", () => {
    const result = verifyWebhookSignature(BODY, null, SECRET);
    expect(result).toEqual({ ok: false, reason: "missing_signature" });
  });

  it("rejects empty header as missing_signature", () => {
    const result = verifyWebhookSignature(BODY, "", SECRET);
    expect(result).toEqual({ ok: false, reason: "missing_signature" });
  });

  it("rejects malformed header (no t= part)", () => {
    const header = `v1=${"a".repeat(64)}`;
    const result = verifyWebhookSignature(BODY, header, SECRET);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.reason).toBe("malformed_header");
  });

  it("rejects malformed header (no v1= part)", () => {
    const header = `t=${now}`;
    const result = verifyWebhookSignature(BODY, header, SECRET);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.reason).toBe("malformed_header");
  });

  it("rejects malformed header (v1 is not 64-hex)", () => {
    const header = `t=${now},v1=notahex`;
    const result = verifyWebhookSignature(BODY, header, SECRET);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.reason).toBe("malformed_header");
  });

  it("rejects stale timestamp (too old)", () => {
    const header = signWebhookPayload(BODY, now - 400, SECRET);
    const result = verifyWebhookSignature(BODY, header, SECRET, {
      now: () => now,
      toleranceSeconds: 300,
    });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.reason).toBe("stale_timestamp");
  });

  it("rejects future timestamp beyond tolerance", () => {
    const header = signWebhookPayload(BODY, now + 400, SECRET);
    const result = verifyWebhookSignature(BODY, header, SECRET, {
      now: () => now,
      toleranceSeconds: 300,
    });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.reason).toBe("stale_timestamp");
  });

  it("rejects tampered body (same header, different body)", () => {
    const header = signWebhookPayload(BODY, now, SECRET);
    const tampered = `${BODY}-tampered`;
    const result = verifyWebhookSignature(tampered, header, SECRET, { now: () => now });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.reason).toBe("bad_signature");
  });

  it("rejects wrong secret", () => {
    const header = signWebhookPayload(BODY, now, SECRET);
    const result = verifyWebhookSignature(BODY, header, "wrong-secret", { now: () => now });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.reason).toBe("bad_signature");
  });

  it("rejects if t= is not a number", () => {
    const header = `t=not_a_number,v1=${"a".repeat(64)}`;
    const result = verifyWebhookSignature(BODY, header, SECRET);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.reason).toBe("malformed_header");
  });

  it("verifies different bodies produce different signatures", () => {
    const h1 = signWebhookPayload("body1", now, SECRET);
    const h2 = signWebhookPayload("body2", now, SECRET);
    expect(h1).not.toEqual(h2);
  });

  it("verifies signature changes when timestamp changes", () => {
    const h1 = signWebhookPayload(BODY, now, SECRET);
    const h2 = signWebhookPayload(BODY, now + 1, SECRET);
    expect(h1).not.toEqual(h2);
  });
});
