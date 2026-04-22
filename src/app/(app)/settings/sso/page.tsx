import {
  AlertCircle,
  Building2,
  CheckCircle2,
  Copy,
  Crown,
  KeyRound,
  ShieldAlert,
  ShieldCheck,
} from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { createScimToken, revokeScimToken } from "@/app/api/sso/actions";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { requireSession } from "@/lib/auth/session";
import { PLAN_DEFINITIONS, planAllowsFeature } from "@/lib/billing/plans";
import { getSubscription } from "@/lib/db/billing";
import { getWorkOSAdapter } from "@/lib/sso/adapter";

export const metadata: Metadata = { title: "SSO & SCIM" };

interface SearchParams {
  searchParams: Promise<{
    token_created?: string;
    token_secret?: string;
    token_revoked?: string;
    error?: string;
  }>;
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default async function SsoSettingsPage({ searchParams }: SearchParams) {
  const session = await requireSession("/settings/sso");
  const params = await searchParams;

  if (session.activeRole !== "owner") {
    return (
      <div className="flex flex-col flex-1 overflow-auto">
        <div className="flex items-center justify-between px-6 h-[var(--header-height)] border-b border-[var(--border-subtle)] shrink-0">
          <h1 className="text-sm font-semibold text-[var(--foreground)]">SSO & SCIM</h1>
        </div>
        <div className="flex-1 flex items-center justify-center p-6">
          <Card className="max-w-md">
            <CardHeader>
              <div className="mx-auto mb-3 flex items-center justify-center w-12 h-12 rounded-full bg-[var(--surface-raised)]">
                <ShieldAlert className="w-5 h-5 text-[var(--foreground-muted)]" />
              </div>
              <CardTitle className="text-center">Owner access required</CardTitle>
              <CardDescription className="text-center">
                SSO and SCIM settings are visible to owners only.
              </CardDescription>
            </CardHeader>
          </Card>
        </div>
      </div>
    );
  }

  const subscription = await getSubscription(session.activeOrganizationId);
  const plan = subscription?.plan ?? "free";
  const ssoEnabled = planAllowsFeature(plan, "sso");

  if (!ssoEnabled) {
    return (
      <div className="flex flex-col flex-1 overflow-auto">
        <div className="flex items-center justify-between px-6 h-[var(--header-height)] border-b border-[var(--border-subtle)] shrink-0">
          <h1 className="text-sm font-semibold text-[var(--foreground)]">SSO & SCIM</h1>
          <Badge variant="secondary" className="capitalize">
            Current: {plan}
          </Badge>
        </div>
        <div className="flex-1 flex items-center justify-center p-6">
          <Card className="max-w-lg">
            <CardHeader>
              <div className="mx-auto mb-3 flex items-center justify-center w-12 h-12 rounded-full bg-[var(--brand-subtle)]">
                <Crown className="w-5 h-5 text-[var(--brand)]" />
              </div>
              <CardTitle className="text-center">Upgrade to Enterprise</CardTitle>
              <CardDescription className="text-center">
                SAML SSO and SCIM provisioning are included with the Enterprise plan. Current plan:{" "}
                <strong>{PLAN_DEFINITIONS[plan].name}</strong>.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <ul className="text-sm space-y-2">
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="w-4 h-4 text-[var(--success)] mt-0.5 shrink-0" />
                  SAML 2.0 SSO with Okta, Azure AD, Google Workspace, OneLogin, JumpCloud
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="w-4 h-4 text-[var(--success)] mt-0.5 shrink-0" />
                  SCIM 2.0 automatic user + group provisioning
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="w-4 h-4 text-[var(--success)] mt-0.5 shrink-0" />
                  Unlimited executions + seats, 99.9% SLA
                </li>
              </ul>
              <Link href="/pricing" className="block">
                <Button className="w-full">
                  <Crown className="w-3.5 h-3.5 mr-2" />
                  See Enterprise pricing
                </Button>
              </Link>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  const [connection, tokens] = await Promise.all([
    getWorkOSAdapter().getConnection(session.activeOrganizationId),
    getWorkOSAdapter().listScimTokens(session.activeOrganizationId),
  ]);

  const activeTokens = tokens.filter((t) => !t.revokedAt);
  const freshSecret = params.token_created && params.token_secret ? params.token_secret : null;

  return (
    <div className="flex flex-col flex-1 overflow-auto">
      <div className="flex items-center justify-between px-6 h-[var(--header-height)] border-b border-[var(--border-subtle)] shrink-0">
        <div>
          <h1 className="text-sm font-semibold text-[var(--foreground)]">SSO & SCIM</h1>
          <p className="text-xs text-[var(--foreground-subtle)]">
            {connection ? `${connection.provider} — ${connection.status}` : "Not configured"}
          </p>
        </div>
        <Badge variant="success">
          <Crown className="w-3 h-3 mr-1" />
          Enterprise
        </Badge>
      </div>

      <div className="flex-1 p-6 grid grid-cols-1 xl:grid-cols-3 gap-5 overflow-auto">
        <div className="xl:col-span-2 space-y-5">
          {/* SAML connection */}
          <Card>
            <CardHeader>
              <CardTitle>SAML connection</CardTitle>
              <CardDescription>
                Upload your IdP metadata URL. Once active, users matching your configured domains
                are routed through SSO on sign-in.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {connection ? (
                <dl className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <dt className="text-[10px] font-medium text-[var(--foreground-muted)] uppercase tracking-wider">
                      Provider
                    </dt>
                    <dd className="mt-0.5 capitalize">{connection.provider}</dd>
                  </div>
                  <div>
                    <dt className="text-[10px] font-medium text-[var(--foreground-muted)] uppercase tracking-wider">
                      Status
                    </dt>
                    <dd className="mt-0.5">
                      <Badge
                        variant={
                          connection.status === "active"
                            ? "success"
                            : connection.status === "pending"
                              ? "warning"
                              : connection.status === "error"
                                ? "destructive"
                                : "secondary"
                        }
                        className="capitalize"
                      >
                        {connection.status}
                      </Badge>
                    </dd>
                  </div>
                  <div className="col-span-2">
                    <dt className="text-[10px] font-medium text-[var(--foreground-muted)] uppercase tracking-wider">
                      Domains
                    </dt>
                    <dd className="mt-0.5 flex gap-1.5 flex-wrap">
                      {connection.domains.map((d) => (
                        <Badge key={d} variant="secondary" className="font-mono">
                          {d}
                        </Badge>
                      ))}
                    </dd>
                  </div>
                </dl>
              ) : (
                <div className="text-center py-8 border-2 border-dashed border-[var(--border)] rounded-[var(--radius)]">
                  <Building2 className="w-6 h-6 text-[var(--foreground-muted)] mx-auto mb-2" />
                  <p className="text-sm text-[var(--foreground-muted)]">
                    No connection yet. Contact support to initiate the SAML handshake.
                  </p>
                  <Link
                    href="mailto:enterprise@autoflow.test?subject=SSO%20setup"
                    className="mt-3 inline-block text-xs text-[var(--brand)] hover:underline"
                  >
                    enterprise@autoflow.test
                  </Link>
                </div>
              )}
            </CardContent>
          </Card>

          {/* SCIM tokens */}
          <Card>
            <CardHeader>
              <CardTitle>SCIM tokens</CardTitle>
              <CardDescription>
                Bearer tokens for your identity provider to push user + group changes to AutoFlow.
                The raw secret is shown exactly once on create.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {freshSecret && (
                <div className="mb-4 p-3 rounded-[var(--radius)] bg-[var(--warning-subtle)] border border-[var(--warning)]/30">
                  <div className="flex items-start gap-2 mb-2">
                    <AlertCircle className="w-4 h-4 text-[var(--warning)] mt-0.5 shrink-0" />
                    <div className="flex-1">
                      <p className="text-xs font-medium text-[var(--foreground)]">
                        Copy this now — it won&apos;t be shown again
                      </p>
                      <code className="mt-2 block break-all text-xs font-mono bg-[var(--surface)] border border-[var(--border)] rounded px-2 py-1.5">
                        {freshSecret}
                      </code>
                    </div>
                    <Copy className="w-3.5 h-3.5 text-[var(--foreground-muted)] shrink-0" />
                  </div>
                </div>
              )}
              {params.error === "owner_required" && (
                <p className="mb-3 text-xs text-[var(--error)]" role="alert">
                  Only owners can manage SCIM tokens.
                </p>
              )}
              {params.error === "upgrade_required" && (
                <p className="mb-3 text-xs text-[var(--error)]" role="alert">
                  SSO is Enterprise-only.
                </p>
              )}
              {params.token_revoked === "1" && (
                <p className="mb-3 text-xs text-[var(--foreground-muted)]" role="status">
                  Token revoked.
                </p>
              )}

              <form action={createScimToken} className="flex items-end gap-2 mb-4">
                <div className="flex-1">
                  <label
                    htmlFor="token-name"
                    className="text-xs font-medium text-[var(--foreground-muted)]"
                  >
                    Token name
                  </label>
                  <Input
                    id="token-name"
                    name="name"
                    placeholder="Okta prod"
                    required
                    maxLength={80}
                    className="mt-1"
                  />
                </div>
                <Button type="submit">
                  <KeyRound className="w-3.5 h-3.5 mr-2" />
                  Create token
                </Button>
              </form>

              {activeTokens.length === 0 ? (
                <p className="text-sm text-[var(--foreground-muted)]">No active SCIM tokens yet.</p>
              ) : (
                <div className="divide-y divide-[var(--border-subtle)]">
                  {activeTokens.map((t) => (
                    <div key={t.id} className="flex items-center gap-3 py-2.5">
                      <KeyRound className="w-4 h-4 text-[var(--foreground-muted)] shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-[var(--foreground)] truncate">
                          {t.name}
                        </p>
                        <p className="text-xs text-[var(--foreground-subtle)] font-mono truncate">
                          {t.prefix}… · created {formatDate(t.createdAt)}
                          {t.lastUsedAt && ` · last used ${formatDate(t.lastUsedAt)}`}
                        </p>
                      </div>
                      <form action={revokeScimToken}>
                        <input type="hidden" name="tokenId" value={t.id} />
                        <Button type="submit" variant="ghost" size="sm">
                          Revoke
                        </Button>
                      </form>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        <div className="space-y-5">
          <Card>
            <CardHeader>
              <CardTitle>Guarantees</CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2 text-xs text-[var(--foreground-muted)]">
                <li className="flex items-start gap-2">
                  <ShieldCheck className="w-3.5 h-3.5 text-[var(--success)] mt-0.5 shrink-0" />
                  Raw SCIM secrets are SHA-256 hashed; only prefix + hash stored
                </li>
                <li className="flex items-start gap-2">
                  <ShieldCheck className="w-3.5 h-3.5 text-[var(--success)] mt-0.5 shrink-0" />
                  SAML metadata URLs must be HTTPS
                </li>
                <li className="flex items-start gap-2">
                  <ShieldCheck className="w-3.5 h-3.5 text-[var(--success)] mt-0.5 shrink-0" />
                  Domain claims are unique per org — no collisions
                </li>
                <li className="flex items-start gap-2">
                  <ShieldCheck className="w-3.5 h-3.5 text-[var(--success)] mt-0.5 shrink-0" />
                  All mutations recorded in audit_events
                </li>
              </ul>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
