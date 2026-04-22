import { Mail } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

export const metadata: Metadata = { title: "Magic link sign in" };

interface MagicLinkPageProps {
  searchParams: Promise<{ redirect?: string; sent?: string }>;
}

async function sendMagicLinkAction(formData: FormData): Promise<void> {
  "use server";
  // Phase 7: Supabase Auth signInWithOtp + email delivery via Resend.
  // Fixture mode: redirect with ?sent=1 for the success state.
  const redirectTo = formData.get("redirect") as string | null;
  const target = redirectTo
    ? `/auth/magic-link?sent=1&redirect=${encodeURIComponent(redirectTo)}`
    : "/auth/magic-link?sent=1";

  // Avoid leaking whether the email exists — same response either way.
  const { redirect } = await import("next/navigation");
  redirect(target);
}

export default async function MagicLinkPage({ searchParams }: MagicLinkPageProps) {
  const { redirect: redirectTo, sent } = await searchParams;

  if (sent === "1") {
    return (
      <Card>
        <CardHeader>
          <div className="mx-auto mb-3 flex items-center justify-center w-12 h-12 rounded-full bg-[var(--brand-subtle)]">
            <Mail className="w-5 h-5 text-[var(--brand)]" />
          </div>
          <CardTitle className="text-center">Check your inbox</CardTitle>
          <CardDescription className="text-center">
            If an account exists for that email, we&apos;ve sent a sign-in link. The link expires in
            15 minutes.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Link href={`/auth/sign-in${redirectTo ? `?redirect=${redirectTo}` : ""}`}>
            <Button variant="secondary" className="w-full">
              Back to sign in
            </Button>
          </Link>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Sign in with magic link</CardTitle>
        <CardDescription>We&apos;ll email you a one-time link.</CardDescription>
      </CardHeader>
      <CardContent>
        <form action={sendMagicLinkAction} className="space-y-4">
          {redirectTo && <input type="hidden" name="redirect" value={redirectTo} />}

          <div className="space-y-1.5">
            <label htmlFor="email" className="text-xs font-medium text-[var(--foreground-muted)]">
              Email
            </label>
            <Input
              id="email"
              name="email"
              type="email"
              autoComplete="email"
              placeholder="you@company.com"
              required
            />
          </div>

          <Button type="submit" className="w-full">
            Send magic link
          </Button>
        </form>

        <p className="mt-6 text-center text-xs text-[var(--foreground-muted)]">
          Remember your password?{" "}
          <Link
            href={`/auth/sign-in${redirectTo ? `?redirect=${redirectTo}` : ""}`}
            className="text-[var(--brand)] hover:underline"
          >
            Sign in
          </Link>
        </p>
      </CardContent>
    </Card>
  );
}
