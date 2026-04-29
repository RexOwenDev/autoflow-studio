export const metadata = { title: "Case study" };

export default function CaseStudyPage() {
  return (
    <article className="prose prose-zinc max-w-3xl dark:prose-invert">
      <h1>Case study</h1>
      <p className="lead">
        AutoFlow Studio is a portfolio reference build, not a paid client engagement. A real-named
        case study lands here once the first paid customer ships and grants permission. Until then:
        the methodology that drove the build is the artifact.
      </p>

      <h2>The brief (as if it were a real engagement)</h2>
      <p>
        A mid-sized B2B SaaS needs a multi-tenant workflow automation surface for its operations
        team. Six-month timeline. Must demonstrate enterprise security readiness from day one —
        auditors are coming in month nine. Stripe-metered billing required for the Pro tier.
        SAML/SCIM required for any deal above $50K ARR.
      </p>

      <h2>How it was built</h2>
      <p>
        Eight gated phases, each shipped as a signed git tag, each with a QA gate and — where stakes
        warranted it — an independent adversarial security review by a second model. Every phase
        ended with all tests green and a written hand-off document.
      </p>
      <ol>
        <li>Phase 0 — discovery + ADR. Stack locked, RLS pattern decided.</li>
        <li>Phase 1 — Next.js scaffold + CI + default-deny middleware.</li>
        <li>Phase 2 — Supabase + RLS + pgTAP harness.</li>
        <li>Phase 3 — auth + organization_members + invite flow.</li>
        <li>Phase 4 — workflows + executions + webhook ingestion.</li>
        <li>Phase 5 — Stripe metered billing + replay-safe ingestion.</li>
        <li>Phase 6 — WorkOS SAML/SCIM + audit log surfacing.</li>
        <li>Phase 7 — performance pass + observability wiring.</li>
        <li>Phase 8 — go-live readiness + ops runbooks.</li>
      </ol>

      <h2>Outcomes</h2>
      <ul>
        <li>120 unit + 45 RLS pgTAP + golden-path E2E specs, all green at every gate.</li>
        <li>0 critical or serious axe findings.</li>
        <li>Lighthouse 95+ across the four scoring categories on the marketing surface.</li>
        <li>
          Adversarial security review found and fixed at least one issue in every gate it ran.
        </li>
      </ul>

      <h2>What I'd do differently next time</h2>
      <ul>
        <li>
          Wire PostHog session replay from Phase 1 — retrofitting useful events later is more
          expensive than recording everything from day one and pruning.
        </li>
        <li>
          Define the cross-tenant fuzzer earlier. The pgTAP suite caught everything, but a
          generative fuzzer would catch the next class.
        </li>
        <li>
          Decide on the email subject-line tone before Phase 3 — small thing, but changing it across
          12 templates after the fact was tedious.
        </li>
      </ul>
    </article>
  );
}
