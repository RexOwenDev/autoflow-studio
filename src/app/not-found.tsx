import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen gap-4 text-center px-6 bg-[var(--background)]">
      <p className="text-5xl font-bold text-[var(--brand)]">404</p>
      <h2 className="text-xl font-semibold text-[var(--foreground)]">Page not found</h2>
      <p className="text-sm text-[var(--foreground-muted)]">
        The page you&apos;re looking for doesn&apos;t exist or has been moved.
      </p>
      <Button asChild variant="secondary">
        <Link href="/dashboard">Back to Dashboard</Link>
      </Button>
    </div>
  );
}
