import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

export const metadata: Metadata = { title: "Create account" };

async function signUpAction(_formData: FormData): Promise<void> {
  "use server";
  // Phase 7: Supabase Auth signUp + email verification + create initial organization.
  // Fixture mode jumps straight to the dashboard.
  redirect("/dashboard");
}

export default function SignUpPage() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Create your workspace</CardTitle>
        <CardDescription>
          Spin up a workspace in under a minute. No credit card required.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form action={signUpAction} className="space-y-4">
          <div className="space-y-1.5">
            <label htmlFor="name" className="text-xs font-medium text-[var(--foreground-muted)]">
              Your name
            </label>
            <Input id="name" name="name" placeholder="Jane Smith" required />
          </div>

          <div className="space-y-1.5">
            <label
              htmlFor="workspace"
              className="text-xs font-medium text-[var(--foreground-muted)]"
            >
              Workspace name
            </label>
            <Input id="workspace" name="workspace" placeholder="Acme Corp" required />
            <p className="text-xs text-[var(--foreground-subtle)]">
              You can invite teammates after signing up.
            </p>
          </div>

          <div className="space-y-1.5">
            <label htmlFor="email" className="text-xs font-medium text-[var(--foreground-muted)]">
              Work email
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

          <div className="space-y-1.5">
            <label
              htmlFor="password"
              className="text-xs font-medium text-[var(--foreground-muted)]"
            >
              Password
            </label>
            <Input
              id="password"
              name="password"
              type="password"
              autoComplete="new-password"
              placeholder="At least 12 characters"
              minLength={12}
              required
            />
          </div>

          <Button type="submit" className="w-full">
            Create workspace
          </Button>

          <p className="text-xs text-[var(--foreground-subtle)] text-center">
            By signing up you agree to our{" "}
            <Link href="/legal/terms" className="text-[var(--brand)] hover:underline">
              Terms
            </Link>{" "}
            and{" "}
            <Link href="/legal/privacy" className="text-[var(--brand)] hover:underline">
              Privacy Policy
            </Link>
            .
          </p>
        </form>

        <p className="mt-6 text-center text-xs text-[var(--foreground-muted)]">
          Already have an account?{" "}
          <Link href="/auth/sign-in" className="text-[var(--brand)] hover:underline">
            Sign in
          </Link>
        </p>
      </CardContent>
    </Card>
  );
}
