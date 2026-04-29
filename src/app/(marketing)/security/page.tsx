export const metadata = { title: "Security" };

const CONTROLS = [
  {
    id: "AC-2",
    control: "Account management",
    impl: "Supabase Auth + organization_members RLS; invites are signed magic links with single-use tokens.",
  },
  {
    id: "AC-3",
    control: "Access enforcement",
    impl: "Row-Level Security on every multi-tenant table; pgTAP asserts cross-tenant denial.",
  },
  {
    id: "AU-2",
    control: "Audit events",
    impl: "Append-only audit_events table populated by Postgres triggers; server-side created_by; client cannot spoof.",
  },
  {
    id: "AU-9",
    control: "Audit log integrity",
    impl: "Hash-chain over (prev_hash, payload, created_at) emitted by trigger; verifier in src/lib/audit/verify.ts.",
  },
  {
    id: "IA-2",
    control: "Identification & auth",
    impl: "Email + magic link by default; WorkOS SAML/SCIM activated for Enterprise tier.",
  },
  {
    id: "SC-13",
    control: "Cryptographic protection",
    impl: "HMAC-SHA256 on inbound webhooks; constant-time comparison; ±5-minute replay window.",
  },
  {
    id: "SI-10",
    control: "Information input validation",
    impl: "Zod schemas on every API boundary; refuse on first error, no partial-shape coercion.",
  },
];

export default function SecurityPage() {
  return (
    <article className="prose prose-zinc max-w-3xl dark:prose-invert">
      <h1>Security</h1>
      <p className="lead">
        AutoFlow Studio is a reference for the controls a SaaS this size should have on day one —
        not a compliance product. The threat model, controls matrix, and RLS posture below are what
        would be presented to an enterprise security review.
      </p>

      <h2>Threat model excerpt</h2>
      <ul>
        <li>
          <strong>External attacker, internet → public webhook.</strong> Mitigation: HMAC signature
          + replay window + idempotency. A leaked signature alone is not sufficient — the timestamp
          window narrows the attack surface.
        </li>
        <li>
          <strong>Authenticated user, cross-tenant data exfiltration.</strong> Mitigation: RLS on
          every multi-tenant table; integration tests run against a real Postgres (never mocks) so
          cross-tenant denial is proven, not assumed.
        </li>
        <li>
          <strong>Compromised application code, audit tampering.</strong> Mitigation: audit_events
          is INSERT-only via trigger; UPDATE / DELETE permissions revoked from every role except the
          migration role. A compromised app cannot rewrite history.
        </li>
        <li>
          <strong>Stripe webhook replay.</strong> Mitigation: webhook idempotency_key recorded;
          advisory lock collapses concurrent retries; out-of-order delivery handled by event_at
          timestamp on the metered usage record.
        </li>
      </ul>

      <h2>Controls matrix (NIST 800-53 mapping, abbreviated)</h2>
      <div className="not-prose overflow-x-auto">
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr className="border-b border-zinc-300 text-left dark:border-zinc-700">
              <th className="py-2 pr-4 font-medium">ID</th>
              <th className="py-2 pr-4 font-medium">Control</th>
              <th className="py-2 font-medium">Implementation</th>
            </tr>
          </thead>
          <tbody>
            {CONTROLS.map((c) => (
              <tr key={c.id} className="border-b border-zinc-200 align-top dark:border-zinc-800">
                <td className="py-2 pr-4 font-mono text-xs">{c.id}</td>
                <td className="py-2 pr-4">{c.control}</td>
                <td className="py-2 text-zinc-700 dark:text-zinc-300">{c.impl}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <h2>RLS posture</h2>
      <p>
        Every multi-tenant table follows the same EXISTS-against-organization_members pattern. The
        pattern is reviewable in 30 seconds and proven by 45 pgTAP assertions in{" "}
        <code>supabase/tests/rls/</code>.
      </p>
      <pre className="not-prose overflow-x-auto rounded-md bg-zinc-50 p-4 text-xs dark:bg-zinc-950">
        {`create policy "members can select their org rows"
on public.workflows
for select
using (
  exists (
    select 1 from public.organization_members om
    where om.organization_id = workflows.organization_id
      and om.user_id = auth.uid()
  )
);`}
      </pre>

      <p>
        See <code>supabase/migrations/</code> for the full policy set and{" "}
        <code>supabase/tests/rls/</code> for the assertions that prove them.
      </p>
    </article>
  );
}
