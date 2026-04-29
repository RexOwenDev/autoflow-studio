import Link from "next/link";

export const metadata = { title: "Hire" };

const SCOPES = [
  {
    label: "Greenfield SaaS build",
    blurb: "Multi-tenant, security-hardened, Stripe-billed. ~3 month engagement.",
  },
  {
    label: "Security hardening pass",
    blurb: "RLS audit + threat model + webhook hardening on an existing app. ~3 weeks.",
  },
  {
    label: "AI feature retrofit",
    blurb: "RAG, hybrid retrieval, multi-locale generation, eval harness. ~4 weeks.",
  },
  {
    label: "Compliance preparedness",
    blurb: "SOC2 / HIPAA control mapping, audit-log retrofit, vendor questionnaire prep.",
  },
];

export default function HirePage() {
  const calUrl = process.env.NEXT_PUBLIC_CAL_URL ?? "https://cal.com/owenquintenta";

  return (
    <article className="max-w-3xl">
      <h1 className="text-3xl font-semibold tracking-tight">Hire</h1>
      <p className="mt-4 text-zinc-700 dark:text-zinc-300">
        AI-native specialist studio building security-hardened web platforms for regulated and
        enterprise customers. Available for net-new builds, hardening passes, and AI feature
        retrofits.
      </p>

      <div className="mt-8">
        <Link
          href={calUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-block rounded-md bg-zinc-900 px-5 py-2.5 text-base font-medium text-zinc-50 hover:bg-zinc-800 dark:bg-zinc-50 dark:text-zinc-900 dark:hover:bg-zinc-200"
        >
          Book a discovery call →
        </Link>
        <p className="mt-2 text-sm text-zinc-500 dark:text-zinc-400">
          30 minutes. No prep needed; come with the problem.
        </p>
      </div>

      <h2 className="mt-14 text-2xl font-semibold tracking-tight">Scopes I take</h2>
      <ul className="mt-6 space-y-5">
        {SCOPES.map((scope) => (
          <li
            key={scope.label}
            className="rounded-lg border border-zinc-200 p-5 dark:border-zinc-800"
          >
            <h3 className="text-base font-semibold">{scope.label}</h3>
            <p className="mt-2 text-sm text-zinc-700 dark:text-zinc-300">{scope.blurb}</p>
          </li>
        ))}
      </ul>
    </article>
  );
}
