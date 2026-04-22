import { CheckCircle2 } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

export const metadata: Metadata = { title: "Reset password" };

interface ForgotPasswordPageProps {
  searchParams: Promise<{ sent?: string }>;
}

async function requestResetAction(_formData: FormData): Promise<void> {
  "use server";
  // Phase 7: Supabase Auth resetPasswordForEmail. We always show the success page
  // (account-existence privacy). Fixture mode just sets the success flag.
  redirect("/auth/forgot-password?sent=1");
}

export default async function ForgotPasswordPage({ searchParams }: ForgotPasswordPageProps) {
  const { sent } = await searchParams;

  if (sent === "1") {
    return (
      <Card>
        <CardHeader>
          <div className="mx-auto mb-3 flex items-center justify-center w-12 h-12 rounded-full bg-[var(--brand-subtle)]">
            <CheckCircle2 className="w-5 h-5 text-[var(--brand)]" />
          </div>
          <CardTitle className="text-center">Check your inbox</CardTitle>
          <CardDescription className="text-center">
            If an account exists for that email, we&apos;ve sent a password-reset link. The link
            expires in 1 hour.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Link href="/auth/sign-in">
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
        <CardTitle>Reset your password</CardTitle>
        <CardDescription>
          Enter the email associated with your account and we&apos;ll send you a reset link.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form action={requestResetAction} className="space-y-4">
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
            Send reset link
          </Button>
        </form>

        <p className="mt-6 text-center text-xs text-[var(--foreground-muted)]">
          Remember it now?{" "}
          <Link href="/auth/sign-in" className="text-[var(--brand)] hover:underline">
            Sign in
          </Link>
        </p>
      </CardContent>
    </Card>
  );
}
