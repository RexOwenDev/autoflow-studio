import Link from "next/link";

export const metadata = { title: "Source" };

export default function SourcePage() {
  const repoUrl =
    process.env.NEXT_PUBLIC_GITHUB_URL ?? "https://github.com/RexOwenDev/autoflow-studio";

  return (
    <article className="max-w-2xl">
      <h1 className="text-3xl font-semibold tracking-tight">Source</h1>
      <p className="mt-4 text-zinc-700 dark:text-zinc-300">
        AutoFlow Studio is open-source under the MIT license. Read the code, fork it, run it locally
        — it boots end-to-end with no credentials in fixture mode.
      </p>

      <ul className="mt-8 space-y-3">
        <li>
          <Link
            href={repoUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-base font-medium underline underline-offset-2 hover:no-underline"
          >
            github.com/RexOwenDev/autoflow-studio →
          </Link>
        </li>
        <li>
          <Link
            href={`${repoUrl}/blob/main/README.md`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-base font-medium underline underline-offset-2 hover:no-underline"
          >
            README — full architecture overview →
          </Link>
        </li>
        <li>
          <Link
            href={`${repoUrl}/tree/main/supabase/migrations`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-base font-medium underline underline-offset-2 hover:no-underline"
          >
            Supabase migrations + RLS policies →
          </Link>
        </li>
        <li>
          <Link
            href={`${repoUrl}/tree/main/supabase/tests/rls`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-base font-medium underline underline-offset-2 hover:no-underline"
          >
            45 pgTAP RLS assertions →
          </Link>
        </li>
      </ul>
    </article>
  );
}
