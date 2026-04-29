export const metadata = { title: "Compliance" };

export default function CompliancePage() {
  return (
    <article className="prose prose-zinc max-w-3xl dark:prose-invert">
      <h1>Compliance posture</h1>
      <p className="lead">
        AutoFlow Studio is built to the controls a fintech-adjacent SaaS would need on day one of an
        enterprise procurement review. The patterns below are demonstrable in the live demo. None of
        this is a substitute for a real audit; it is the surface a real audit starts from.
      </p>

      <h2>SOC2-aligned controls (informational)</h2>
      <ul>
        <li>
          <strong>Security.</strong> RLS, HMAC webhooks, hashed-chain audit log, secrets excluded
          from VCS, CI security gate (Semgrep + Trivy + npm audit high+).
        </li>
        <li>
          <strong>Availability.</strong> Stateless app tier, Supabase managed Postgres, Vercel edge
          with regional fallback, Inngest for retry-safe async jobs.
        </li>
        <li>
          <strong>Processing integrity.</strong> Idempotency keys + advisory locks collapse
          concurrent webhook deliveries; Zod validation rejects malformed input before state change.
        </li>
        <li>
          <strong>Confidentiality.</strong> Service-role keys server-side only; NEXT_PUBLIC_ scope
          strictly enforced; PII redaction hooks documented in
          <code>src/lib/redact/</code>.
        </li>
        <li>
          <strong>Privacy.</strong> Cookie banner ready (commented out in fixture mode); PostHog
          session replay opt-in by default; data-export endpoint scaffolded for subject access
          requests.
        </li>
      </ul>

      <h2>PCI-DSS — what's covered</h2>
      <p>
        AutoFlow Studio does not store card data. Stripe handles all PAN; the application sees only
        customer ids, subscription ids, and metered usage records. This places the deployment in
        PCI-DSS scope as a Service Provider with SAQ-A characteristics (outsourced card processing).
        The webhook ingestion path is hardened against replay and signature forgery; metered usage
        records are immutable once Stripe acks delivery.
      </p>

      <h2>Transaction integrity</h2>
      <p>
        Every webhook delivery includes an idempotency key. The handler claims the key via Postgres
        advisory lock before any state change. Concurrent retries from Stripe (or n8n) collapse to a
        single execution; out-of-order delivery is detected by the <code>event_at</code> field on
        the metered usage row.
      </p>

      <h2>Replay protection</h2>
      <p>
        The HMAC signature alone is not sufficient: every signed payload must include a timestamp,
        and the handler rejects requests outside a ±5-minute window. A leaked signature replayed 6
        minutes later returns <code>401</code>.
      </p>

      <h2>Key rotation</h2>
      <p>
        Webhook secrets and Stripe keys are rotated via a documented script (
        <code>scripts/rotate-secrets.sh</code>) that supports a dual-key window: both old and new
        secret are accepted for 24 hours so in-flight webhooks aren't lost. The script writes a
        rotation entry to the audit log on completion.
      </p>

      <h2>Out of scope (deliberately)</h2>
      <ul>
        <li>SOC2 Type 2 attestation — requires real operations history.</li>
        <li>HIPAA — see the HIPAA flagship deployment for that posture.</li>
        <li>FedRAMP / IRAP — out of scope for a portfolio artifact.</li>
        <li>Real PCI-DSS attestation — Stripe carries the cardholder-data scope.</li>
      </ul>
    </article>
  );
}
