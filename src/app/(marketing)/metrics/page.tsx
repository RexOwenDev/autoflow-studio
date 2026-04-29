export const metadata = { title: "Metrics" };

const PERF_TARGETS = [
  { metric: "Lighthouse — Performance (mobile)", target: "≥ 90", current: "pending first deploy" },
  { metric: "Lighthouse — Accessibility", target: "≥ 95", current: "pending first deploy" },
  { metric: "Lighthouse — Best Practices", target: "≥ 95", current: "pending first deploy" },
  { metric: "Lighthouse — SEO", target: "≥ 95", current: "pending first deploy" },
  { metric: "First Contentful Paint", target: "< 1.5s", current: "pending first deploy" },
  { metric: "Largest Contentful Paint", target: "< 2.5s", current: "pending first deploy" },
  { metric: "Cumulative Layout Shift", target: "< 0.1", current: "pending first deploy" },
  { metric: "Interaction to Next Paint", target: "< 200ms", current: "pending first deploy" },
];

export default function MetricsPage() {
  return (
    <article className="max-w-3xl">
      <h1 className="text-3xl font-semibold tracking-tight">Metrics</h1>
      <p className="mt-3 text-zinc-700 dark:text-zinc-300">
        Performance targets and current measurements. PostHog adoption metrics fill in as the demo
        accumulates traffic.
      </p>

      <h2 className="mt-10 text-2xl font-semibold tracking-tight">Performance</h2>
      <div className="mt-4 overflow-x-auto">
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr className="border-b border-zinc-300 text-left dark:border-zinc-700">
              <th className="py-2 pr-4 font-medium">Metric</th>
              <th className="py-2 pr-4 font-medium">Target</th>
              <th className="py-2 font-medium">Current</th>
            </tr>
          </thead>
          <tbody>
            {PERF_TARGETS.map((row) => (
              <tr key={row.metric} className="border-b border-zinc-200 dark:border-zinc-800">
                <td className="py-2 pr-4">{row.metric}</td>
                <td className="py-2 pr-4 font-mono text-xs">{row.target}</td>
                <td className="py-2 text-zinc-500 dark:text-zinc-400">{row.current}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <h2 className="mt-12 text-2xl font-semibold tracking-tight">Adoption</h2>
      <p className="mt-3 text-zinc-700 dark:text-zinc-300">
        Visitor counts, demo-loaded events, walkthrough plays, and source-link clicks are tracked
        via PostHog. The first 30 days of data populate this section after the demo goes live.
      </p>
    </article>
  );
}
