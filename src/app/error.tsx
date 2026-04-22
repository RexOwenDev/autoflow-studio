"use client";

import { useEffect } from "react";
import { Button } from "@/components/ui/button";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {}, []);

  return (
    <div className="flex flex-col items-center justify-center min-h-screen gap-4 text-center px-6 bg-[var(--background)]">
      <h2 className="text-xl font-semibold text-[var(--foreground)]">Something went wrong</h2>
      <p className="text-sm text-[var(--foreground-muted)] max-w-sm">
        An unexpected error occurred. Our team has been notified.
        {error.digest && (
          <span className="block mt-1 font-mono text-xs text-[var(--foreground-subtle)]">
            ref: {error.digest}
          </span>
        )}
      </p>
      <Button onClick={reset} variant="secondary">
        Try again
      </Button>
    </div>
  );
}
