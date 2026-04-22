import { Mail, MoreHorizontal, Shield, ShieldCheck, User } from "lucide-react";
import type { Metadata } from "next";
import { revokeInvite, sendInvite } from "@/app/api/auth/invites/actions";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { requireSession } from "@/lib/auth/session";
import { listMembers, listPendingInvites } from "@/lib/db/orgs";
import { FIXTURE_MEMBER_DISPLAY } from "@/lib/supabase/fixtures";
import { cn } from "@/lib/utils";
import type { OrganizationRole } from "@/types/database";

export const metadata: Metadata = { title: "Members" };

interface SearchParams {
  searchParams: Promise<{ invited?: string; revoked?: string; error?: string }>;
}

function roleVariant(role: OrganizationRole) {
  if (role === "owner") return "default" as const;
  if (role === "admin") return "info" as const;
  return "secondary" as const;
}

function roleIcon(role: OrganizationRole) {
  if (role === "owner") return ShieldCheck;
  if (role === "admin") return Shield;
  return User;
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function formatRelativeFuture(iso: string): string {
  const diffMs = new Date(iso).getTime() - Date.now();
  if (diffMs <= 0) return "expired";
  const hours = Math.round(diffMs / 3_600_000);
  if (hours < 24) return `expires in ${hours}h`;
  const days = Math.round(hours / 24);
  return `expires in ${days}d`;
}

export default async function MembersPage({ searchParams }: SearchParams) {
  const session = await requireSession("/settings/members");
  const orgId = session.activeOrganizationId;
  const canManage = session.activeRole === "owner" || session.activeRole === "admin";

  const [members, invites, params] = await Promise.all([
    listMembers(orgId),
    listPendingInvites(orgId),
    searchParams,
  ]);

  return (
    <div className="flex flex-col flex-1 overflow-auto">
      <div className="flex items-center justify-between px-6 h-[var(--header-height)] border-b border-[var(--border-subtle)] shrink-0">
        <div>
          <h1 className="text-sm font-semibold text-[var(--foreground)]">Members</h1>
          <p className="text-xs text-[var(--foreground-subtle)]">
            {members.length} {members.length === 1 ? "member" : "members"} · {invites.length}{" "}
            pending {invites.length === 1 ? "invite" : "invites"}
          </p>
        </div>
        <Badge variant="secondary" className="capitalize">
          You: {session.activeRole}
        </Badge>
      </div>

      <div className="flex-1 p-6 grid grid-cols-1 xl:grid-cols-3 gap-5 overflow-auto">
        {/* Members list */}
        <Card className="xl:col-span-2">
          <CardHeader>
            <CardTitle>Team</CardTitle>
            <CardDescription>
              People with access to {session.activeOrganizationId.slice(0, 8)}…
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-1">
              {members.map((m) => {
                const display = FIXTURE_MEMBER_DISPLAY[m.user_id];
                const RoleIcon = roleIcon(m.role);
                return (
                  <div
                    key={m.user_id}
                    className="flex items-center gap-3 py-2.5 border-b border-[var(--border-subtle)] last:border-0"
                  >
                    <div className="flex items-center justify-center w-8 h-8 rounded-full bg-[var(--surface-raised)] border border-[var(--border)] text-xs font-medium text-[var(--foreground-muted)] shrink-0">
                      {(display?.name ?? m.user_id).slice(0, 2).toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-[var(--foreground)] truncate">
                        {display?.name ?? "Unknown user"}
                        {m.user_id === session.userId && (
                          <span className="text-xs text-[var(--foreground-subtle)] font-normal ml-2">
                            (you)
                          </span>
                        )}
                      </p>
                      <p className="text-xs text-[var(--foreground-subtle)] truncate">
                        {display?.email ?? "—"}
                      </p>
                    </div>
                    <Badge variant={roleVariant(m.role)} className="capitalize">
                      <RoleIcon className="w-3 h-3 mr-1" />
                      {m.role}
                    </Badge>
                    <span
                      className="text-xs text-[var(--foreground-subtle)] hidden sm:inline"
                      title={`Joined ${formatDate(m.created_at)}`}
                    >
                      {formatDate(m.created_at)}
                    </span>
                    {canManage && m.user_id !== session.userId && (
                      <Button
                        variant="ghost"
                        size="icon"
                        aria-label={`Manage ${display?.name ?? "member"}`}
                      >
                        <MoreHorizontal className="w-4 h-4" />
                      </Button>
                    )}
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>

        {/* Invite form + pending invites */}
        <div className="space-y-5">
          <Card>
            <CardHeader>
              <CardTitle>Invite a teammate</CardTitle>
              <CardDescription>
                {canManage
                  ? "They'll receive an email with a single-use link valid for 48 hours."
                  : "Only admins and owners can invite new members."}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form action={sendInvite} className="space-y-3">
                <input type="hidden" name="organizationId" value={orgId} />
                <div className="space-y-1.5">
                  <label
                    htmlFor="invite-email"
                    className="text-xs font-medium text-[var(--foreground-muted)]"
                  >
                    Email
                  </label>
                  <Input
                    id="invite-email"
                    name="email"
                    type="email"
                    placeholder="teammate@company.com"
                    required
                    disabled={!canManage}
                  />
                </div>
                <div className="space-y-1.5">
                  <label
                    htmlFor="invite-role"
                    className="text-xs font-medium text-[var(--foreground-muted)]"
                  >
                    Role
                  </label>
                  <select
                    id="invite-role"
                    name="role"
                    defaultValue="member"
                    disabled={!canManage}
                    className={cn(
                      "flex h-9 w-full rounded-[var(--radius)] border border-[var(--border)]",
                      "bg-[var(--surface)] px-3 py-1 text-sm text-[var(--foreground)]",
                      "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--brand)]",
                      "disabled:cursor-not-allowed disabled:opacity-50",
                    )}
                  >
                    <option value="member">Member</option>
                    <option value="admin">Admin</option>
                    {session.activeRole === "owner" && <option value="owner">Owner</option>}
                  </select>
                </div>
                <Button type="submit" className="w-full" disabled={!canManage}>
                  <Mail className="w-3.5 h-3.5 mr-2" />
                  Send invite
                </Button>
                {params.invited === "1" && (
                  <p className="text-xs text-[var(--success)]" role="status">
                    Invite sent.
                  </p>
                )}
                {params.error === "exists" && (
                  <p className="text-xs text-[var(--error)]" role="alert">
                    A pending invite already exists for that email.
                  </p>
                )}
                {params.error === "denied" && (
                  <p className="text-xs text-[var(--error)]" role="alert">
                    You don&apos;t have permission to invite members.
                  </p>
                )}
              </form>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Pending invites</CardTitle>
              <CardDescription>
                {invites.length === 0 ? "No invites awaiting acceptance." : null}
              </CardDescription>
            </CardHeader>
            {invites.length > 0 && (
              <CardContent>
                <div className="space-y-2">
                  {invites.map((inv) => (
                    <div
                      key={inv.id}
                      className="flex items-center gap-2 py-2 border-b border-[var(--border-subtle)] last:border-0"
                    >
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-[var(--foreground)] truncate">
                          {inv.email}
                        </p>
                        <p className="text-xs text-[var(--foreground-subtle)]">
                          {inv.role} · {formatRelativeFuture(inv.expires_at)}
                        </p>
                      </div>
                      {canManage && (
                        <form action={revokeInvite}>
                          <input type="hidden" name="inviteId" value={inv.id} />
                          <input type="hidden" name="organizationId" value={orgId} />
                          <Button type="submit" variant="ghost" size="sm">
                            Revoke
                          </Button>
                        </form>
                      )}
                    </div>
                  ))}
                </div>
              </CardContent>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
}
