export const metadata = { title: "Accessibility" };

export default function AccessibilityPage() {
  return (
    <article className="prose prose-zinc max-w-3xl dark:prose-invert">
      <h1>Accessibility</h1>
      <p className="lead">
        AutoFlow Studio targets WCAG 2.2 AA. The list below tracks current state, the most recent
        automated audit, and remediation timelines for outstanding items.
      </p>

      <h2>Standard</h2>
      <p>
        WCAG 2.2 AA, with the EU Accessibility Act in force for any deployment serving European
        users. Reduced motion is honored everywhere via <code>prefers-reduced-motion: reduce</code>.
      </p>

      <h2>Automated audit results</h2>
      <p>
        Audits run via axe-core in CI on every PR (Playwright spec at{" "}
        <code>tests/e2e/a11y.spec.ts</code>). Failures gate merge.
      </p>
      <ul>
        <li>
          <strong>Critical:</strong> 0 open.
        </li>
        <li>
          <strong>Serious:</strong> 0 open.
        </li>
        <li>
          <strong>Moderate:</strong> tracked in{" "}
          <a
            href="https://github.com/RexOwenDev/autoflow-studio/issues?q=label%3Aa11y"
            target="_blank"
            rel="noopener noreferrer"
          >
            GitHub issues with label <code>a11y</code>
          </a>
          . Each carries a remediation timeline.
        </li>
      </ul>
      <p className="text-sm text-zinc-500 dark:text-zinc-400">
        First post-deploy audit pass is run after the demo URL is live; results land here.
      </p>

      <h2>What's covered</h2>
      <ul>
        <li>
          Keyboard navigation across every interactive element; focus-visible rings on every
          focusable.
        </li>
        <li>Color contrast ≥ 4.5:1 for body, ≥ 3:1 for UI surfaces (light + dark).</li>
        <li>Form fields labelled programmatically; error states announced via aria-live.</li>
        <li>Tables use proper semantics; data sortable via keyboard.</li>
        <li>Modal dialogs trap focus and restore on close.</li>
        <li>Reduced-motion variant: every animation collapses to a cross-fade or no-op.</li>
      </ul>

      <h2>Known gaps</h2>
      <ul>
        <li>
          The execution log viewer renders large arrays virtualized. Virtual scroll is accessible
          via keyboard but screen-reader announcements during fast scroll are not yet rate-limited.
        </li>
        <li>
          The audit-log CSV export uses a synchronous download. A progress announcer for large
          exports is queued.
        </li>
      </ul>
    </article>
  );
}
