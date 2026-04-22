import type { Metadata } from "next";
import Link from "next/link";
import { acceptInvite } from "@/app/api/auth/invites/actions";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export const metadata: Metadata = { title: "Accept invite" };

interface AcceptInvitePageProps {
  searchParams: Promise<{ token?: string }>;
}

export default async function AcceptInvitePage({ searchParams }: AcceptInvitePageProps) {
  const { token } = await searchParams;

  if (!token) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Invalid invite</CardTitle>
          <CardDescription>The invite link is missing a token.</CardDescription>
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
        <CardTitle>You&apos;re invited</CardTitle>
        <CardDescription>
          Confirm to join this workspace. Your role and permissions are set by the inviter.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form action={acceptInvite} className="space-y-3">
          <input type="hidden" name="token" value={token} />
          <Button type="submit" className="w-full">
            Accept invite
          </Button>
          <p className="text-xs text-[var(--foreground-subtle)] text-center">
            This link is single-use and expires 48 hours after it was sent.
          </p>
        </form>
      </CardContent>
    </Card>
  );
}
