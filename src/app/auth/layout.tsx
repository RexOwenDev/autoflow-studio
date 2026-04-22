import { Zap } from "lucide-react";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { APP_MODE } from "@/lib/env";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex flex-col bg-[var(--background-subtle)]">
      <header className="flex items-center justify-between px-6 h-[var(--header-height)] border-b border-[var(--border-subtle)] bg-[var(--background)]">
        <Link href="/" className="flex items-center gap-2.5">
          <div className="flex items-center justify-center w-7 h-7 rounded-[var(--radius)] bg-[var(--brand)]">
            <Zap className="w-4 h-4 text-white" />
          </div>
          <span className="font-semibold text-sm text-[var(--foreground)] tracking-tight">
            AutoFlow Studio
          </span>
        </Link>
        {APP_MODE === "fixture" && <Badge variant="secondary">Fixture mode</Badge>}
      </header>

      <main className="flex-1 flex items-center justify-center px-4 py-10">
        <div className="w-full max-w-md">{children}</div>
      </main>

      <footer className="px-6 py-4 text-center text-xs text-[var(--foreground-subtle)] border-t border-[var(--border-subtle)]">
        &copy; 2026 AutoFlow Studio &middot;{" "}
        <Link href="/legal/privacy" className="hover:text-[var(--foreground)]">
          Privacy
        </Link>{" "}
        &middot;{" "}
        <Link href="/legal/terms" className="hover:text-[var(--foreground)]">
          Terms
        </Link>
      </footer>
    </div>
  );
}
