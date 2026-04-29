import Link from "next/link";

type CrossLink = { envKey: string; label: string };

const CROSS_LINKS: readonly CrossLink[] = [
  { envKey: "NEXT_PUBLIC_KB_DEMO_URL", label: "RAG over the docs" },
  { envKey: "NEXT_PUBLIC_PROPOSALS_DEMO_URL", label: "Proposal Studio" },
  { envKey: "NEXT_PUBLIC_COMMERCE_DEMO_URL", label: "Content Factory" },
];

type ResolvedLink = { label: string; href: string };

export function MarketingFooter() {
  const links: ResolvedLink[] = CROSS_LINKS.map((link) => ({
    label: link.label,
    href: process.env[link.envKey] ?? "",
  })).filter((link): link is ResolvedLink => link.href.length > 0);

  return (
    <footer className="mt-24 border-t border-zinc-200 py-10 text-sm text-zinc-600 dark:border-zinc-800 dark:text-zinc-400">
      <div className="mx-auto flex max-w-6xl flex-col gap-4 px-4 md:flex-row md:items-center md:justify-between">
        <p>
          <span className="font-medium text-zinc-900 dark:text-zinc-100">AutoFlow Studio</span> — a
          portfolio artifact by Owen Quintenta.
        </p>
        {links.length > 0 ? (
          <nav aria-label="Other demos" className="flex flex-wrap gap-x-5 gap-y-2">
            {links.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="underline underline-offset-2 hover:no-underline"
              >
                {link.label}
              </Link>
            ))}
          </nav>
        ) : null}
      </div>
    </footer>
  );
}
