"use client";

import { useEffect, useState } from "react";

const STORAGE_KEY = "autoflow-demo-banner-dismissed-v1";

export function DemoBanner() {
  const [dismissed, setDismissed] = useState(true);

  useEffect(() => {
    setDismissed(window.localStorage.getItem(STORAGE_KEY) === "1");
  }, []);

  if (dismissed) return null;

  const loomUrl = process.env.NEXT_PUBLIC_LOOM_URL ?? "#walkthrough-coming-soon";
  const sourceUrl =
    process.env.NEXT_PUBLIC_GITHUB_URL ?? "https://github.com/RexOwenDev/autoflow-studio";

  function dismiss() {
    window.localStorage.setItem(STORAGE_KEY, "1");
    setDismissed(true);
  }

  return (
    <section
      aria-label="Demo notice"
      className="sticky top-0 z-50 border-b border-amber-500/30 bg-amber-50 text-amber-950 dark:border-amber-300/30 dark:bg-amber-950/40 dark:text-amber-100"
    >
      <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-4 py-2 text-sm">
        <p className="flex items-center gap-2">
          <span aria-hidden="true">🎬</span>
          <span>
            <strong>Live demo</strong> — fixture data, resets nightly at 03:00 UTC.
          </span>
        </p>
        <div className="flex items-center gap-4">
          <a
            href={loomUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="font-medium underline underline-offset-2 hover:no-underline"
          >
            Watch 2-min walkthrough
          </a>
          <a
            href={sourceUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="font-medium underline underline-offset-2 hover:no-underline"
          >
            View source
          </a>
          <button
            type="button"
            onClick={dismiss}
            aria-label="Dismiss demo banner"
            className="rounded p-1 hover:bg-amber-100 dark:hover:bg-amber-900/40"
          >
            <span aria-hidden="true">×</span>
          </button>
        </div>
      </div>
    </section>
  );
}
