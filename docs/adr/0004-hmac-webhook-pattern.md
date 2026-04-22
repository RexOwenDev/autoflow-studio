# 0004 — Shared HMAC-SHA256 webhook verification pattern

**Status:** Accepted — 2026-04-22
**Context:** Phase 5 (n8n) and Phase 6 (Stripe)

## Context

Both `n8n` and `Stripe` inbound webhooks need identical security properties:

- Timing-safe signature verification
- Replay-window enforcement
- Idempotency (at-least-once delivery from every provider means duplicate events in practice)
- Identical error responses so an attacker can't derive which control tripped

Stripe publishes the canonical pattern: a `Stripe-Signature` header of the form `t=<unix_ts>,v1=<hex>` where `v1 = HMAC-SHA256(secret, '${t}.${rawBody}')`. This is well-understood, well-documented, and library-implementable. n8n doesn't mandate a specific shape — we're free to choose.

## Decision

Use the Stripe signature format for every webhook ingestion point. `n8n` webhooks use the same `t=ts,v1=hex` header shape, delivered as `X-AutoFlow-Signature`. The underlying primitive lives in `src/lib/n8n/signature.ts`; Stripe's wrapper re-exports it with Stripe-specific defaults.

Both routes implement the same pipeline:

1. Size guard via Content-Length AND body length.
2. Read raw body as text (HMAC must sign exact bytes; JSON.parse would lose fidelity).
3. Require signature header + (n8n) idempotency key.
4. Parse the signature header; bail on malformed.
5. Compute expected HMAC with `crypto.createHmac("sha256", secret).update(`${t}.${body}`).digest("hex")`.
6. `crypto.timingSafeEqual(Buffer.from(expected, "hex"), Buffer.from(provided, "hex"))`.
7. Check timestamp age against a ±300s window (default).
8. Parse JSON; reject non-object shapes.
9. Idempotency dedup via UNIQUE constraints in the DB.
10. All auth failures return identical `{received: false, error: "unauthorized"}` at HTTP 401.

Idempotency key normalization: `webhook_inbox` UNIQUE index on `(source, lower(idempotency_key))`. Case variants collapse to the same row.

Execution triggers with `trigger_source = 'webhook'` must have a non-null `idempotency_key` (CHECK constraint `executions_webhook_requires_idempotency`) — rules out a class of NULL-key replays flagged by the Codex council gate.

## Alternatives considered

- **Provider-specific formats.** n8n doesn't ship one; inventing our own would duplicate Stripe's mature design.
- **JWT for signatures.** Heavier than needed; no benefit over HMAC for the "prove this body came from someone with the shared secret" problem.
- **Library like `@octokit/webhooks-methods`.** Works for GitHub's specific format. We'd still need our own for n8n.
- **Skip timing-safe compare.** Would leak signature bytes via timing side channel. Non-starter for a security-first repo.

## Consequences

- **Positive:** Single mental model across providers.
- **Positive:** One primitive to test. `src/tests/webhooks/n8n-signature.test.ts` covers 12 scenarios that apply to both providers.
- **Positive:** No oracle in failure responses — tested explicitly.
- **Trade-off:** Not all real-world providers use this exact format. Each new provider needs a small wrapper; see `src/lib/stripe/signature.ts` (5 lines) for the pattern.

## Related

- `src/lib/n8n/signature.ts` — `verifyWebhookSignature()` + `signWebhookPayload()`
- `src/lib/stripe/signature.ts` — thin re-export
- `src/app/api/webhooks/{n8n,stripe}/route.ts` — identical structure
- `src/tests/webhooks/` — 41 assertions total across signature + route + parity
