import Link from "next/link";

export const metadata = {
  title: "AutoFlow Studio — multi-tenant SaaS reference build",
  description:
    "Workflow automation with Supabase RLS, HMAC-verified webhooks, SOC2-aligned audit trails, Stripe-metered billing, and WorkOS SAML/SCIM. Live demo runs on fixture data.",
};

const DIFFERENTIATORS = [
  {
    title: "HMAC-verified webhooks",
    body: "Every inbound webhook is signature-checked with a 5-minute replay window. Replay attacks return 401 before the handler runs.",
    href: "/security",
  },
  {
    title: "Idempotent run claim",
    body: "Concurrent webhook deliveries collapse to a single execution via Postgres advisory locks + idempotency keys.",
    href: "/how-it-works",
  },
  {
    title: "RLS-by-default",
    body: "Every multi-tenant table is gated by EXISTS-against-organization_members. 45 pgTAP assertions prove cross-tenant isolation.",
    href: "/security",
  },
  {
    title: "Append-only audit triggers",
    body: "Database triggers write SOC2-aligned audit events on every state change. Server-populated; client-spoof-resistant.",
    href: "/security",
  },
  {
    title: "Stripe metered billing",
    body: "Per-seat + per-execution metering with replay-safe webhook ingestion. The full enterprise pricing surface, demonstrable.",
    href: "/how-it-works",
  },
];

export default function HomePage() {
  return (
    <div className="space-y-20">
      <section aria-labelledby="hero" className="max-w-3xl">
        <p className="mb-4 text-sm font-medium uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
          Reference build · v0.2.0
        </p>
        <h1 id="hero" className="text-4xl font-semibold tracking-tight md:text-5xl lg:text-6xl">
          A multi-tenant automation SaaS, built to production-grade in eight gated phases.
        </h1>
        <p className="mt-6 text-lg text-zinc-700 dark:text-zinc-300">
          Workflow automation with Supabase Row-Level Security, HMAC-verified webhooks, SOC2-aligned
          audit trails, Stripe-metered billing, and WorkOS SAML/SCIM. The backend runs end-to-end
          offline; this site runs the same fixtures live.
        </p>
        <div className="mt-8 flex flex-wrap gap-3">
          <Link
            href="/dashboard"
            className="rounded-md bg-zinc-900 px-5 py-2.5 text-base font-medium text-zinc-50 hover:bg-zinc-800 dark:bg-zinc-50 dark:text-zinc-900 dark:hover:bg-zinc-200"
          >
            Try the live demo →
          </Link>
          <Link
            href="/how-it-works"
            className="rounded-md border border-zinc-300 px-5 py-2.5 text-base font-medium hover:bg-zinc-50 dark:border-zinc-700 dark:hover:bg-zinc-900"
          >
            How it works
          </Link>
        </div>
        <p className="mt-3 text-sm text-zinc-500 dark:text-zinc-400">
          Sign in with any email — magic link delivered to a fixture inbox. Resets nightly.
        </p>
      </section>

      <section aria-labelledby="walkthrough" className="max-w-3xl">
        <h2 id="walkthrough" className="text-2xl font-semibold tracking-tight">
          Two-minute walkthrough
        </h2>
        <p className="mt-3 text-zinc-700 dark:text-zinc-300">
          Walks through the five differentiators below in the live UI: HMAC + replay window,
          idempotency, RLS, audit triggers, and metered billing.
        </p>
        <div className="mt-6 aspect-video w-full rounded-lg border border-dashed border-zinc-300 bg-zinc-50 p-6 text-sm text-zinc-500 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-400">
          {process.env.NEXT_PUBLIC_LOOM_URL ? (
            <iframe
              src={process.env.NEXT_PUBLIC_LOOM_URL}
              title="AutoFlow Studio walkthrough"
              allowFullScreen
              className="h-full w-full rounded-md"
            />
          ) : (
            <p className="flex h-full items-center justify-center">
              Walkthrough recording in progress — set NEXT_PUBLIC_LOOM_URL to embed.
            </p>
          )}
        </div>
      </section>

      <section aria-labelledby="differentiators">
        <h2 id="differentiators" className="text-2xl font-semibold tracking-tight">
          Five things this build does that most reference SaaS demos don't
        </h2>
        <ul className="mt-8 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {DIFFERENTIATORS.map((item) => (
            <li
              key={item.title}
              className="rounded-lg border border-zinc-200 p-5 dark:border-zinc-800"
            >
              <h3 className="text-base font-semibold">{item.title}</h3>
              <p className="mt-2 text-sm text-zinc-700 dark:text-zinc-300">{item.body}</p>
              <Link
                href={item.href}
                className="mt-3 inline-block text-sm font-medium underline underline-offset-2 hover:no-underline"
              >
                Read more →
              </Link>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
