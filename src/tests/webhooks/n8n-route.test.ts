/**
 * n8n webhook route integration tests.
 *
 * Exercises the full POST handler with signed/unsigned/replayed/oversized payloads.
 * Confirms that:
 *   - valid requests → 202 with {received:true, duplicate:false}
 *   - duplicate idempotency keys → 200 with {duplicate:true}  (fixture synth via "dup_" prefix)
 *   - bad signatures, stale timestamps, wrong secrets → 401 (same response shape — no oracle)
 *   - missing headers → 400
 *   - oversized payloads → 413
 *   - malformed JSON body → 400
 */

import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it } from "vitest";
import { POST } from "@/app/api/webhooks/n8n/route";
import { getN8nAdapter } from "@/lib/n8n/adapter";
import { signWebhookPayload } from "@/lib/n8n/signature";

const URL_BASE = "https://autoflow.test/api/webhooks/n8n";

function buildRequest(options: {
  body: string;
  signature?: string;
  idempotencyKey?: string;
  contentLength?: number;
}): NextRequest {
  const headers = new Headers();
  headers.set("content-type", "application/json");
  if (options.contentLength !== undefined) {
    headers.set("content-length", String(options.contentLength));
  } else {
    headers.set("content-length", String(Buffer.byteLength(options.body, "utf8")));
  }
  if (options.signature !== undefined) {
    headers.set("x-autoflow-signature", options.signature);
  }
  if (options.idempotencyKey !== undefined) {
    headers.set("x-autoflow-idempotency-key", options.idempotencyKey);
  }
  return new NextRequest(URL_BASE, {
    method: "POST",
    headers,
    body: options.body,
  });
}

const NOW = Math.floor(Date.now() / 1000);

describe("POST /api/webhooks/n8n", () => {
  let secret: string;

  beforeEach(() => {
    process.env["APP_MODE"] = "fixture";
    secret = getN8nAdapter().getWebhookSecret();
  });

  it("accepts a valid signed webhook with a fresh idempotency key (202)", async () => {
    const body = JSON.stringify({ workflow: "lead-capture", data: { lead_id: 1 } });
    const signature = signWebhookPayload(body, NOW, secret);
    const res = await POST(buildRequest({ body, signature, idempotencyKey: "n8n_ev_fresh_001" }));
    expect(res.status).toBe(202);
    const json = await res.json();
    expect(json).toMatchObject({
      received: true,
      idempotencyKey: "n8n_ev_fresh_001",
      duplicate: false,
      mode: "fixture",
    });
  });

  it("returns 200 with duplicate flag for repeated idempotency key", async () => {
    const body = JSON.stringify({ workflow: "slack-notifier" });
    const signature = signWebhookPayload(body, NOW, secret);
    // Fixture mode marks anything prefixed "dup_" as a duplicate for tests.
    const res = await POST(buildRequest({ body, signature, idempotencyKey: "dup_already_seen" }));
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.duplicate).toBe(true);
  });

  it("rejects payload larger than 5mb (413)", async () => {
    // NextRequest / fetch normalizes content-length from the actual body, so
    // we send a real oversized body. 5.5 MB of 'x' — cheap to allocate in node.
    const body = "x".repeat(5.5 * 1024 * 1024);
    const signature = signWebhookPayload(body, NOW, secret);
    const res = await POST(buildRequest({ body, signature, idempotencyKey: "big_001" }));
    expect(res.status).toBe(413);
    const json = await res.json();
    expect(json).toEqual({ received: false, error: "payload_too_large" });
  });

  it("rejects missing signature header (400)", async () => {
    const body = JSON.stringify({ workflow: "x" });
    const res = await POST(buildRequest({ body, idempotencyKey: "no_sig_001" }));
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toBe("invalid_request");
  });

  it("rejects missing idempotency key header (400)", async () => {
    const body = JSON.stringify({ workflow: "x" });
    const signature = signWebhookPayload(body, NOW, secret);
    const res = await POST(buildRequest({ body, signature }));
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toBe("invalid_request");
  });

  it("rejects oversized idempotency key (>255 chars) (400)", async () => {
    const body = JSON.stringify({ workflow: "x" });
    const signature = signWebhookPayload(body, NOW, secret);
    const res = await POST(buildRequest({ body, signature, idempotencyKey: "a".repeat(256) }));
    expect(res.status).toBe(400);
  });

  it("rejects bad signature (401) — same shape as other auth failures (no oracle)", async () => {
    const body = JSON.stringify({ workflow: "x" });
    const badSig = `t=${NOW},v1=${"0".repeat(64)}`;
    const res = await POST(
      buildRequest({ body, signature: badSig, idempotencyKey: "bad_sig_001" }),
    );
    expect(res.status).toBe(401);
    const json = await res.json();
    expect(json).toEqual({ received: false, error: "unauthorized" });
  });

  it("rejects tampered body (signature valid for different body) as 401", async () => {
    const originalBody = JSON.stringify({ workflow: "x" });
    const signature = signWebhookPayload(originalBody, NOW, secret);
    const tamperedBody = JSON.stringify({ workflow: "x-tampered" });
    const res = await POST(
      buildRequest({ body: tamperedBody, signature, idempotencyKey: "tamper_001" }),
    );
    expect(res.status).toBe(401);
  });

  it("rejects replay (signature from 10 minutes ago) as 401", async () => {
    const body = JSON.stringify({ workflow: "x" });
    // Sign 10 minutes in the past — exceeds default 5-minute tolerance.
    const signature = signWebhookPayload(body, NOW - 600, secret);
    const res = await POST(buildRequest({ body, signature, idempotencyKey: "replay_001" }));
    expect(res.status).toBe(401);
  });

  it("rejects wrong secret (401)", async () => {
    const body = JSON.stringify({ workflow: "x" });
    const signature = signWebhookPayload(body, NOW, "wrong-secret");
    const res = await POST(buildRequest({ body, signature, idempotencyKey: "wrong_secret_001" }));
    expect(res.status).toBe(401);
  });

  it("rejects malformed JSON body (400)", async () => {
    const body = "{not valid json";
    const signature = signWebhookPayload(body, NOW, secret);
    const res = await POST(buildRequest({ body, signature, idempotencyKey: "bad_json_001" }));
    expect(res.status).toBe(400);
  });

  it("rejects JSON array body (400) — expects an object", async () => {
    const body = "[1,2,3]";
    const signature = signWebhookPayload(body, NOW, secret);
    const res = await POST(buildRequest({ body, signature, idempotencyKey: "array_body_001" }));
    expect(res.status).toBe(400);
  });

  it("rejects null JSON body (400) — expects an object", async () => {
    const body = "null";
    const signature = signWebhookPayload(body, NOW, secret);
    const res = await POST(buildRequest({ body, signature, idempotencyKey: "null_body_001" }));
    expect(res.status).toBe(400);
  });

  it("uses the same 401 shape for all auth failure reasons (no oracle)", async () => {
    const body = JSON.stringify({ workflow: "x" });

    const responses = await Promise.all([
      POST(
        buildRequest({
          body,
          signature: `t=${NOW},v1=${"0".repeat(64)}`,
          idempotencyKey: "oracle_a",
        }),
      ),
      POST(
        buildRequest({
          body,
          signature: signWebhookPayload(body, NOW - 600, secret),
          idempotencyKey: "oracle_b",
        }),
      ),
      POST(
        buildRequest({
          body,
          signature: signWebhookPayload(body, NOW, "wrong-secret"),
          idempotencyKey: "oracle_c",
        }),
      ),
    ]);

    for (const r of responses) {
      expect(r.status).toBe(401);
      const json = await r.json();
      expect(json).toEqual({ received: false, error: "unauthorized" });
    }
  });
});
