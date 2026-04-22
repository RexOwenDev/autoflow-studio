/**
 * Stripe webhook route integration tests.
 * Mirrors the n8n-route coverage: happy path, dedup, auth parity, shape validation.
 */

import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it } from "vitest";
import { POST } from "@/app/api/webhooks/stripe/route";
import { getStripeAdapter } from "@/lib/stripe/adapter";
import { signStripePayload } from "@/lib/stripe/signature";

const URL_BASE = "https://autoflow.test/api/webhooks/stripe";

function buildEvent(id: string, type: string) {
  return {
    id,
    type,
    object: "event",
    api_version: "2024-06-20",
    created: Math.floor(Date.now() / 1000),
    data: { object: { id: "cus_test", object: "customer" } },
  };
}

function buildRequest(options: { body: string; signature?: string }): NextRequest {
  const headers = new Headers();
  headers.set("content-type", "application/json");
  headers.set("content-length", String(Buffer.byteLength(options.body, "utf8")));
  if (options.signature !== undefined) {
    headers.set("stripe-signature", options.signature);
  }
  return new NextRequest(URL_BASE, {
    method: "POST",
    headers,
    body: options.body,
  });
}

const NOW = Math.floor(Date.now() / 1000);

describe("POST /api/webhooks/stripe", () => {
  let secret: string;

  beforeEach(() => {
    process.env["APP_MODE"] = "fixture";
    secret = getStripeAdapter().getWebhookSecret();
  });

  it("accepts a valid signed Stripe event (202)", async () => {
    const body = JSON.stringify(buildEvent("evt_001_fresh", "customer.subscription.updated"));
    const signature = signStripePayload(body, NOW, secret);
    const res = await POST(buildRequest({ body, signature }));
    expect(res.status).toBe(202);
    const json = await res.json();
    expect(json).toMatchObject({
      received: true,
      eventId: "evt_001_fresh",
      eventType: "customer.subscription.updated",
      handled: true,
      duplicate: false,
      mode: "fixture",
    });
  });

  it("marks unknown event types as not handled but still 202", async () => {
    const body = JSON.stringify(buildEvent("evt_002_unknown", "some.new.type.we.dont.handle"));
    const signature = signStripePayload(body, NOW, secret);
    const res = await POST(buildRequest({ body, signature }));
    expect(res.status).toBe(202);
    const json = await res.json();
    expect(json.handled).toBe(false);
  });

  it("returns 200 for duplicate event id", async () => {
    const body = JSON.stringify(buildEvent("evt_dup_003", "invoice.paid"));
    const signature = signStripePayload(body, NOW, secret);
    const res = await POST(buildRequest({ body, signature }));
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.duplicate).toBe(true);
  });

  it("rejects payload larger than 1mb (413)", async () => {
    const body = JSON.stringify({
      ...buildEvent("big_001", "x"),
      padding: "x".repeat(1.1 * 1024 * 1024),
    });
    const signature = signStripePayload(body, NOW, secret);
    const res = await POST(buildRequest({ body, signature }));
    expect(res.status).toBe(413);
  });

  it("rejects missing Stripe-Signature (400)", async () => {
    const body = JSON.stringify(buildEvent("evt_004", "invoice.paid"));
    const res = await POST(buildRequest({ body }));
    expect(res.status).toBe(400);
  });

  it("rejects bad signature (401)", async () => {
    const body = JSON.stringify(buildEvent("evt_005", "invoice.paid"));
    const badSig = `t=${NOW},v1=${"0".repeat(64)}`;
    const res = await POST(buildRequest({ body, signature: badSig }));
    expect(res.status).toBe(401);
  });

  it("rejects tampered body (401)", async () => {
    const originalBody = JSON.stringify(buildEvent("evt_006", "invoice.paid"));
    const signature = signStripePayload(originalBody, NOW, secret);
    const tamperedBody = JSON.stringify(buildEvent("evt_006_mutated", "invoice.paid"));
    const res = await POST(buildRequest({ body: tamperedBody, signature }));
    expect(res.status).toBe(401);
  });

  it("rejects replay (10 min old signature, 401)", async () => {
    const body = JSON.stringify(buildEvent("evt_007", "invoice.paid"));
    const signature = signStripePayload(body, NOW - 600, secret);
    const res = await POST(buildRequest({ body, signature }));
    expect(res.status).toBe(401);
  });

  it("rejects wrong secret (401)", async () => {
    const body = JSON.stringify(buildEvent("evt_008", "invoice.paid"));
    const signature = signStripePayload(body, NOW, "wrong-secret");
    const res = await POST(buildRequest({ body, signature }));
    expect(res.status).toBe(401);
  });

  it("rejects body missing id (400)", async () => {
    const body = JSON.stringify({ type: "invoice.paid", object: "event" });
    const signature = signStripePayload(body, NOW, secret);
    const res = await POST(buildRequest({ body, signature }));
    expect(res.status).toBe(400);
  });

  it("rejects body missing type (400)", async () => {
    const body = JSON.stringify({ id: "evt_009", object: "event" });
    const signature = signStripePayload(body, NOW, secret);
    const res = await POST(buildRequest({ body, signature }));
    expect(res.status).toBe(400);
  });

  it("rejects JSON array body (400)", async () => {
    const body = "[1,2,3]";
    const signature = signStripePayload(body, NOW, secret);
    const res = await POST(buildRequest({ body, signature }));
    expect(res.status).toBe(400);
  });

  it("rejects malformed JSON (400)", async () => {
    const body = "{not valid";
    const signature = signStripePayload(body, NOW, secret);
    const res = await POST(buildRequest({ body, signature }));
    expect(res.status).toBe(400);
  });

  it("uses the same 401 shape for all auth failures (no oracle)", async () => {
    const body = JSON.stringify(buildEvent("evt_oracle", "invoice.paid"));
    const responses = await Promise.all([
      POST(buildRequest({ body, signature: `t=${NOW},v1=${"0".repeat(64)}` })),
      POST(buildRequest({ body, signature: signStripePayload(body, NOW - 600, secret) })),
      POST(buildRequest({ body, signature: signStripePayload(body, NOW, "wrong") })),
    ]);
    for (const r of responses) {
      expect(r.status).toBe(401);
      const json = await r.json();
      expect(json).toEqual({ received: false, error: "unauthorized" });
    }
  });
});
