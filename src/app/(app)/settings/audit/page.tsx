import { Calendar, Crown, Download, FileJson, FileText, ShieldAlert } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { requireSession } from "@/lib/auth/session";
import { PLAN_DEFINITIONS, planAllowsFeature } from "@/lib/billing/plans";
import { listAuditEvents } from "@/lib/db/audit";
import { getSubscription } from "@/lib/db/billing";

export const metadata: Metadata = { title: "Audit export" };

function toInputDate(d: Date): string {
  return d.toISOString().slice(0, 10);
}

export default async function AuditExportPage() {
  const session = await requireSession("/settings/audit");

  if (session.activeRole !== "owner" && session.activeRole !== "admin") {
    return (
      <div className="flex flex-col flex-1 overflow-auto">
        <div className="flex items-center justify-between px-6 h-[var(--header-height)] border-b border-[var(--border-subtle)] shrink-0">
          <h1 className="text-sm font-semibold text-[var(--foreground)]">Audit export</h1>
        </div>
        <div className="flex-1 flex items-center justify-center p-6">
          <Card className="max-w-md">
            <CardHeader>
              <div className="mx-auto mb-3 flex items-center justify-center w-12 h-12 rounded-full bg-[var(--surface-raised)]">
                <ShieldAlert className="w-5 h-5 text-[var(--foreground-muted)]" />
              </div>
              <CardTitle className="text-center">Admin access required</CardTitle>
              <CardDescription className="text-center">
                Audit export is available to admins and owners only.
              </CardDescription>
            </CardHeader>
          </Card>
        </div>
      </div>
    );
  }

  // Owner check is needed for subscription lookup since SELECT on billing_subscriptions is owner-only.
  // For admin-tier views we rely on session carrying the plan tier (Phase 8 will thread this via
  // the member-safe view). Fixture mode resolves plan via owner call.
  const subscription =
    session.activeRole === "owner" ? await getSubscription(session.activeOrganizationId) : null;
  const plan = subscription?.plan ?? "free";
  const exportAllowed = planAllowsFeature(plan, "audit_export");

  const recentEvents = exportAllowed ? await listAuditEvents(session.activeOrganizationId, 50) : [];
  const exportHistory = recentEvents.filter((e) => e.action === "audit.exported");

  const now = new Date();
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 3_600_000);

  return (
    <div className="flex flex-col flex-1 overflow-auto">
      <div className="flex items-center justify-between px-6 h-[var(--header-height)] border-b border-[var(--border-subtle)] shrink-0">
        <div>
          <h1 className="text-sm font-semibold text-[var(--foreground)]">Audit export</h1>
          <p className="text-xs text-[var(--foreground-subtle)]">
            CSV / JSON download · rate-limited to 10 per hour
          </p>
        </div>
        <Badge variant={exportAllowed ? "default" : "secondary"} className="capitalize">
          {plan}
        </Badge>
      </div>

      <div className="flex-1 p-6 grid grid-cols-1 xl:grid-cols-3 gap-5 overflow-auto">
        <div className="xl:col-span-2 space-y-5">
          {!exportAllowed ? (
            <Card>
              <CardHeader>
                <div className="mx-auto mb-3 flex items-center justify-center w-12 h-12 rounded-full bg-[var(--brand-subtle)]">
                  <Crown className="w-5 h-5 text-[var(--brand)]" />
                </div>
                <CardTitle className="text-center">Upgrade to Pro or Enterprise</CardTitle>
                <CardDescription className="text-center">
                  Audit export is included on Pro ({PLAN_DEFINITIONS.pro.retentionDays}-day
                  retention) and Enterprise (unlimited retention). Current plan:{" "}
                  <strong>{PLAN_DEFINITIONS[plan].name}</strong>.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Link href="/pricing">
                  <Button className="w-full">See plans</Button>
                </Link>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardHeader>
                <CardTitle>Download audit log</CardTitle>
                <CardDescription>
                  Up to{" "}
                  {PLAN_DEFINITIONS[plan].retentionDays === "unlimited"
                    ? "unlimited"
                    : `${PLAN_DEFINITIONS[plan].retentionDays}-day`}{" "}
                  retention. Max 366 days per export. Downloads are served with Content-Disposition
                  attachment for direct save.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <form action="/api/audit/export" method="GET" className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label
                        htmlFor="from"
                        className="text-xs font-medium text-[var(--foreground-muted)]"
                      >
                        From
                      </label>
                      <div className="relative mt-1">
                        <Calendar className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[var(--foreground-muted)] pointer-events-none" />
                        <input
                          id="from"
                          name="from"
                          type="date"
                          defaultValue={toInputDate(thirtyDaysAgo)}
                          className="flex h-9 w-full rounded-[var(--radius)] border border-[var(--border)] bg-[var(--surface)] pl-8 pr-3 py-1 text-sm text-[var(--foreground)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--brand)]"
                        />
                      </div>
                    </div>
                    <div>
                      <label
                        htmlFor="to"
                        className="text-xs font-medium text-[var(--foreground-muted)]"
                      >
                        To
                      </label>
                      <div className="relative mt-1">
                        <Calendar className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[var(--foreground-muted)] pointer-events-none" />
                        <input
                          id="to"
                          name="to"
                          type="date"
                          defaultValue={toInputDate(now)}
                          className="flex h-9 w-full rounded-[var(--radius)] border border-[var(--border)] bg-[var(--surface)] pl-8 pr-3 py-1 text-sm text-[var(--foreground)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--brand)]"
                        />
                      </div>
                    </div>
                  </div>

                  <fieldset>
                    <legend className="text-xs font-medium text-[var(--foreground-muted)]">
                      Format
                    </legend>
                    <div className="mt-2 grid grid-cols-2 gap-2">
                      <label className="flex items-center gap-2.5 px-3 py-2 rounded-[var(--radius)] border border-[var(--border)] bg-[var(--surface)] cursor-pointer hover:bg-[var(--surface-raised)]">
                        <input
                          type="radio"
                          name="format"
                          value="csv"
                          defaultChecked
                          className="accent-[var(--brand)]"
                        />
                        <FileText className="w-4 h-4 text-[var(--foreground-muted)]" />
                        <span className="text-sm">CSV (Excel / Sheets)</span>
                      </label>
                      <label className="flex items-center gap-2.5 px-3 py-2 rounded-[var(--radius)] border border-[var(--border)] bg-[var(--surface)] cursor-pointer hover:bg-[var(--surface-raised)]">
                        <input
                          type="radio"
                          name="format"
                          value="json"
                          className="accent-[var(--brand)]"
                        />
                        <FileJson className="w-4 h-4 text-[var(--foreground-muted)]" />
                        <span className="text-sm">JSON (machine-readable)</span>
                      </label>
                    </div>
                  </fieldset>

                  <Button type="submit" className="w-full">
                    <Download className="w-3.5 h-3.5 mr-2" />
                    Download export
                  </Button>
                </form>
              </CardContent>
            </Card>
          )}

          {exportAllowed && (
            <Card>
              <CardHeader>
                <CardTitle>Recent exports</CardTitle>
                <CardDescription>
                  Every export is recorded as an audit event for compliance.
                </CardDescription>
              </CardHeader>
              <CardContent>
                {exportHistory.length === 0 ? (
                  <p className="text-sm text-[var(--foreground-muted)]">
                    No exports yet. Your next download will show up here.
                  </p>
                ) : (
                  <ol className="divide-y divide-[var(--border-subtle)]">
                    {exportHistory.map((e) => (
                      <li key={e.id} className="flex items-center gap-3 py-2.5">
                        <Download className="w-4 h-4 text-[var(--foreground-muted)] shrink-0" />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-[var(--foreground)] truncate">
                            {e.actor_label ?? "system"} exported{" "}
                            {(e.diff as { count?: number }).count ?? "?"} events
                          </p>
                          <p className="text-xs text-[var(--foreground-subtle)] font-mono">
                            format={(e.diff as { format?: string }).format ?? "?"} ·{" "}
                            {new Date(e.occurred_at).toLocaleString()}
                          </p>
                        </div>
                      </li>
                    ))}
                  </ol>
                )}
              </CardContent>
            </Card>
          )}
        </div>

        <div className="space-y-5">
          <Card>
            <CardHeader>
              <CardTitle>What&apos;s in the export</CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2 text-xs text-[var(--foreground-muted)]">
                <li>• occurred_at (ISO-8601)</li>
                <li>• actor + actor_user_id</li>
                <li>• action + resource_type + resource_id</li>
                <li>• ip_address + user_agent</li>
                <li>• diff JSONB (secrets redacted at emit time)</li>
              </ul>
              <p className="mt-3 text-xs text-[var(--foreground-subtle)]">
                CSV cells starting with = + - @ are prefixed with a single quote to prevent
                Excel/Sheets formula injection (OWASP).
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
