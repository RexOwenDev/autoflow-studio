import Link from "next/link";

const NAV_LINKS = [
  { href: "/how-it-works", label: "How it works" },
  { href: "/security", label: "Security" },
  { href: "/compliance", label: "Compliance" },
  { href: "/accessibility", label: "Accessibility" },
  { href: "/tech-stack", label: "Tech stack" },
  { href: "/metrics", label: "Metrics" },
  { href: "/case-study", label: "Case study" },
  { href: "/source", label: "Source" },
  { href: "/hire", label: "Hire" },
] as const;

export function MarketingNav() {
  return (
    <header className="border-b border-zinc-200 dark:border-zinc-800">
      <nav
        aria-label="Primary"
        className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-4 py-3"
      >
        <Link href="/" className="text-base font-semibold tracking-tight">
          AutoFlow Studio
        </Link>
        <ul className="flex flex-wrap gap-x-5 gap-y-2 text-sm text-zinc-700 dark:text-zinc-300">
          {NAV_LINKS.map((link) => (
            <li key={link.href}>
              <Link href={link.href} className="hover:text-zinc-950 dark:hover:text-zinc-50">
                {link.label}
              </Link>
            </li>
          ))}
        </ul>
        <Link
          href="/dashboard"
          className="rounded-md bg-zinc-900 px-3 py-1.5 text-sm font-medium text-zinc-50 hover:bg-zinc-800 dark:bg-zinc-50 dark:text-zinc-900 dark:hover:bg-zinc-200"
        >
          Try the live demo →
        </Link>
      </nav>
    </header>
  );
}
