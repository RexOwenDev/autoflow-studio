import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { APP_MODE } from "@/lib/env";

export const metadata: Metadata = { title: "Sign in" };

interface SignInPageProps {
  searchParams: Promise<{ redirect?: string; error?: string }>;
}

async function signInAction(formData: FormData): Promise<void> {
  "use server";
  // Phase 7 wires Supabase Auth signInWithPassword + setSessionCookies. In fixture mode
  // the FixtureAuthAdapter already issues a session for every request, so this stub just
  // routes to the requested page.
  const target = (formData.get("redirect") as string | null) ?? "/dashboard";
  redirect(target);
}

export default async function SignInPage({ searchParams }: SignInPageProps) {
  const { redirect: redirectTo, error } = await searchParams;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Sign in</CardTitle>
        <CardDescription>Welcome back. Enter your credentials to continue.</CardDescription>
      </CardHeader>
      <CardContent>
        <form action={signInAction} className="space-y-4">
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
              defaultValue={APP_MODE === "fixture" ? "rex@acme.test" : ""}
            />
          </div>

          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label
                htmlFor="password"
                className="text-xs font-medium text-[var(--foreground-muted)]"
              >
                Password
              </label>
              <Link
                href="/auth/forgot-password"
                className="text-xs text-[var(--brand)] hover:underline"
              >
                Forgot?
              </Link>
            </div>
            <Input
              id="password"
              name="password"
              type="password"
              autoComplete="current-password"
              placeholder="••••••••"
              required
              defaultValue={APP_MODE === "fixture" ? "fixture-password" : ""}
            />
          </div>

          {error && (
            <p className="text-xs text-[var(--error)]" role="alert">
              {error === "invalid_credentials"
                ? "Invalid email or password."
                : "Sign-in failed. Try again."}
            </p>
          )}

          <Button type="submit" className="w-full">
            Sign in
          </Button>
        </form>

        <div className="my-4 flex items-center gap-3">
          <Separator className="flex-1" />
          <span className="text-xs text-[var(--foreground-subtle)]">or</span>
          <Separator className="flex-1" />
        </div>

        <Link href={`/auth/magic-link${redirectTo ? `?redirect=${redirectTo}` : ""}`}>
          <Button variant="secondary" className="w-full">
            Email a magic link
          </Button>
        </Link>

        <p className="mt-6 text-center text-xs text-[var(--foreground-muted)]">
          New here?{" "}
          <Link href="/auth/sign-up" className="text-[var(--brand)] hover:underline">
            Create an account
          </Link>
        </p>
      </CardContent>
    </Card>
  );
}
