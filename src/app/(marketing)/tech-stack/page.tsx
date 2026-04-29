export const metadata = { title: "Tech stack" };

const ROWS = [
  {
    layer: "Runtime",
    choice: "Node 22 LTS · npm",
    why: "ADR §1.1 — pnpm preferred for new repos; autoflow on npm pending substantive next-touch migration.",
  },
  {
    layer: "Framework",
    choice: "Next.js 16 (App Router)",
    why: "Cache Components, Turbopack default, React 19 stable.",
  },
  {
    layer: "UI",
    choice: "React 19.2 · Tailwind v4 · shadcn/ui (zinc · new-york)",
    why: "Locked in stack ADR §2.3.",
  },
  {
    layer: "Types",
    choice: "TypeScript strict++",
    why: "noUncheckedIndexedAccess, exactOptionalPropertyTypes, verbatimModuleSyntax. ADR §1.4.",
  },
  { layer: "Lint + format", choice: "Biome v2", why: "One binary, one config. ADR §1.5." },
  {
    layer: "Database",
    choice: "Supabase Postgres + RLS + pgTAP",
    why: "Raw SQL discipline; RLS reviewable in 30 seconds. ADR §3.1, §3.4.",
  },
  { layer: "Validation", choice: "Zod v3", why: "Every API boundary, every RPC arg shape." },
  {
    layer: "Auth",
    choice: "Supabase Auth + WorkOS SAML/SCIM (Enterprise tier)",
    why: "Two-tier auth scales $0 demo → $50K enterprise without rebuild. ADR §3.3.",
  },
  { layer: "Email", choice: "Resend + React Email", why: "ADR §6.1." },
  {
    layer: "Background jobs",
    choice: "Inngest",
    value: "Nightly fixture reset · retry-safe async. ADR §6.2.",
  },
  {
    layer: "Payments",
    choice: "Stripe (test mode in fixture; metered billing primitives)",
    why: "ADR §6.3.",
  },
  {
    layer: "Observability",
    choice: "OTel via @vercel/otel · Sentry · PostHog",
    why: "10% prod / 100% preview sampling. ADR §9.",
  },
  {
    layer: "Testing",
    choice: "Vitest 4 · pgTAP · Playwright",
    why: "120 unit + 45 RLS + golden-path E2E. ADR §8.",
  },
  {
    layer: "CI/CD",
    choice: "GitHub Actions · Vercel deploys",
    why: "Five parallel jobs per PR (typecheck, lint, test, build, security). ADR §10.",
  },
];

export default function TechStackPage() {
  return (
    <article className="max-w-4xl">
      <h1 className="text-3xl font-semibold tracking-tight">Tech stack</h1>
      <p className="mt-3 max-w-2xl text-zinc-700 dark:text-zinc-300">
        Every choice below is an architectural decision recorded in the studio's stack ADR.
        Re-debating a row requires an explicit amendment block — not a silent diff.
      </p>

      <div className="mt-10 overflow-x-auto">
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr className="border-b border-zinc-300 text-left dark:border-zinc-700">
              <th className="py-2 pr-4 font-medium">Layer</th>
              <th className="py-2 pr-4 font-medium">Choice</th>
              <th className="py-2 font-medium">Why</th>
            </tr>
          </thead>
          <tbody>
            {ROWS.map((r) => (
              <tr key={r.layer} className="border-b border-zinc-200 align-top dark:border-zinc-800">
                <td className="py-2 pr-4 font-medium">{r.layer}</td>
                <td className="py-2 pr-4 font-mono text-xs">{r.choice}</td>
                <td className="py-2 text-zinc-700 dark:text-zinc-300">{r.why ?? r.value}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <p className="mt-6 text-sm text-zinc-500 dark:text-zinc-400">
        Full ADR lives at <code>.claude/plans/foundation-outputs/01-stack-decisions.md</code> in the
        studio workspace.
      </p>
    </article>
  );
}
