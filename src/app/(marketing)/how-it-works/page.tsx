export const metadata = { title: "How it works" };

export default function HowItWorksPage() {
  return (
    <article className="prose prose-zinc max-w-3xl dark:prose-invert">
      <h1>How it works</h1>
      <p className="lead">
        A workflow execution begins when n8n (or any external system) POSTs a signed webhook to{" "}
        <code>/api/webhooks/n8n</code>. Five things happen in order, and any one of them failing
        rejects the request before state changes.
      </p>

      <h2>Request flow</h2>
      <ol>
        <li>
          <strong>HMAC verification.</strong> The handler computes HMAC-SHA256(body,
          N8N_WEBHOOK_SECRET) and constant-time-compares with the inbound signature header. Mismatch
          → <code>401</code>.
        </li>
        <li>
          <strong>Replay window check.</strong> The signed timestamp must be within ±5 minutes of
          server time. Outside the window → <code>401</code> regardless of signature validity.
        </li>
        <li>
          <strong>Idempotency claim.</strong> A Postgres advisory lock keyed on the webhook's{" "}
          <code>idempotency_key</code> ensures concurrent retries collapse to a single execution.
          Conflicting attempts return <code>200 (already_processed)</code> with the original
          execution id.
        </li>
        <li>
          <strong>RLS-gated insert.</strong> The execution row is inserted under the tenant's
          row-level-security policy. Cross-tenant writes fail at the database, not the application —
          a property pgTAP proves.
        </li>
        <li>
          <strong>Audit trigger.</strong> A Postgres trigger writes an append-only audit_events row
          with <code>created_by = current_user_id()</code>. The audit stream is immutable from the
          application layer.
        </li>
      </ol>

      <h2>Architecture diagram</h2>
      <pre className="not-prose overflow-x-auto rounded-md bg-zinc-50 p-4 text-xs leading-relaxed dark:bg-zinc-950">
        {`
  ┌──────────────┐   signed POST   ┌──────────────────────┐
  │   n8n inst.  │ ──────────────▶ │  /api/webhooks/n8n   │
  └──────────────┘                 └──────────┬───────────┘
                                              │
                          HMAC + replay + idempotency
                                              │
                                   ┌──────────▼───────────┐
                                   │  Supabase (Postgres) │
                                   │  • RLS policies      │
                                   │  • audit_events      │
                                   │  • advisory locks    │
                                   └──────────┬───────────┘
                                              │ trigger
                                   ┌──────────▼───────────┐
                                   │  Stripe metered      │
                                   │  usage record        │
                                   └──────────────────────┘
        `}
      </pre>

      <h2>Fixture mode</h2>
      <p>
        With <code>APP_MODE=fixture</code>, every external SDK call is intercepted by a
        deterministic adapter — Supabase reads return seeded rows, Stripe is replaced by an
        in-memory ledger, n8n webhooks are simulated by a mulberry32-seeded PRNG. The same routes
        serve the same UI, but no network egress occurs. This site is running in fixture mode now.
      </p>

      <h2>Live mode</h2>
      <p>
        Setting <code>APP_MODE=live</code> with the keys documented in <code>.env.example</code>{" "}
        swaps the adapters for real SDKs. Nothing else changes — the request flow and the invariants
        above are identical in both modes.
      </p>
    </article>
  );
}
