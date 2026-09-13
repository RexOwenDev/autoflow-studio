import { Shield, ShieldAlert, User } from "lucide-react";
import type { Metadata } from "next";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { requireSession } from "@/lib/auth/session";
import { listAuditEvents } from "@/lib/db/audit";
import type { AuditAction } from "@/types/database";

export const metadata: Metadata = { title: "Audit log" };

// Categories inferred from action names. UI-only grouping; DB enum is the source of truth.
const ACTION_CATEGORIES: Record<AuditAction, "security" | "workflow" | "billing" | "membership"> = {
  "org.created": "membership",
  "org.updated": "membership",
  "org.deleted": "membership",
  "member.invited": "membership",
  "member.joined": "membership",
  "member.role_changed": "membership",
  "member.removed": "membership",
  "workflow.created": "workflow",
  "workflow.updated": "workflow",
  "workflow.deleted": "workflow",
  "workflow.published": "workflow",
  "workflow.archived": "workflow",
  "execution.retried": "workflow",
  "execution.cancelled": "workflow",
  "billing.plan_changed": "billing",
  "billing.subscription_cancelled": "billing",
  "auth.sign_in": "security",
  "auth.sign_in_failed": "security",
  "auth.sign_out": "security",
  "sso.configured": "security",
  "audit.exported": "security",
};

function variantFor(category: string) {
  if (category === "security") return "destructive" as const;
  if (category === "billing") return "warning" as const;
  if (category === "membership") return "info" as const;
  return "secondary" as const;
}

function formatTime(iso: string): string {
  return new Date(iso).toLocaleString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default async function AuditLogPage() {
  const session = await requireSession("/audit");

  // Codex HIGH fix: audit_events SELECT is admin-only at the DB layer. In fixture
  // mode we apply the same check here so the UI matches what live mode will allow.
  const canView = session.activeRole === "owner" || session.activeRole === "admin";

  if (!canView) {
    return (
      <div className="flex flex-col flex-1 overflow-auto">
        <div className="flex items-center justify-between px-6 h-[var(--header-height)] border-b border-[var(--border-subtle)] shrink-0">
          <h1 className="text-sm font-semibold text-[var(--foreground)]">Audit log</h1>
        </div>
        <div className="flex-1 flex items-center justify-center p-6">
          <Card className="max-w-md">
            <CardHeader>
              <div className="mx-auto mb-3 flex items-center justify-center w-12 h-12 rounded-full bg-[var(--surface-raised)]">
                <ShieldAlert className="w-5 h-5 text-[var(--foreground-muted)]" />
              </div>
              <CardTitle className="text-center">Admin access required</CardTitle>
              <CardDescription className="text-center">
                Audit events contain sensitive before/after payloads. Only admins and owners can
                view the raw log. Phase 5 adds a redacted member-safe feed.
              </CardDescription>
            </CardHeader>
          </Card>
        </div>
      </div>
    );
  }

  const events = await listAuditEvents(session.activeOrganizationId, 200);

  return (
    <div className="flex flex-col flex-1 overflow-auto">
      <div className="flex items-center justify-between px-6 h-[var(--header-height)] border-b border-[var(--border-subtle)] shrink-0">
        <div>
          <h1 className="text-sm font-semibold text-[var(--foreground)]">Audit log</h1>
          <p className="text-xs text-[var(--foreground-subtle)]">
            {events.length} event{events.length === 1 ? "" : "s"} · Append only
          </p>
        </div>
        <Badge variant="success">
          <Shield className="w-3 h-3 mr-1" />
          Tamper evident
        </Badge>
      </div>

      <div className="flex-1 p-6 overflow-auto">
        {events.length === 0 ? (
          <Card>
            <CardContent className="py-16 text-center">
              <p className="text-sm text-[var(--foreground-muted)]">
                No audit events yet. Events accumulate as your team operates.
              </p>
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardContent className="p-0">
              <ol className="divide-y divide-[var(--border-subtle)]">
                {events.map((ev) => {
                  const category = ACTION_CATEGORIES[ev.action] ?? "workflow";
                  return (
                    <li key={ev.id} className="flex items-start gap-3 px-4 py-3">
                      <div className="flex items-center justify-center w-8 h-8 rounded-full bg-[var(--surface-raised)] border border-[var(--border)] text-xs font-medium text-[var(--foreground-muted)] shrink-0 mt-0.5">
                        {ev.actor_user_id ? (
                          (ev.actor_label?.slice(0, 2).toUpperCase() ?? "??")
                        ) : (
                          <User className="w-3.5 h-3.5" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-sm font-medium text-[var(--foreground)]">
                            {ev.actor_label ?? "system"}
                          </span>
                          <span className="text-xs text-[var(--foreground-muted)]">performed</span>
                          <code className="text-xs font-mono text-[var(--foreground)] bg-[var(--surface-raised)] px-1.5 py-0.5 rounded">
                            {ev.action}
                          </code>
                          <Badge variant={variantFor(category)} className="capitalize">
                            {category}
                          </Badge>
                        </div>
                        <p className="mt-1 text-xs text-[var(--foreground-subtle)]">
                          <span className="font-mono">{ev.resource_type}</span>
                          {ev.resource_id && (
                            <span className="font-mono"> · {ev.resource_id.slice(0, 12)}…</span>
                          )}
                          <span> · {formatTime(ev.occurred_at)}</span>
                        </p>
                        {Object.keys(ev.diff).length > 0 && (
                          <pre className="mt-2 text-[10px] p-2 rounded bg-[var(--surface-raised)] text-[var(--foreground-muted)] overflow-x-auto max-h-40">
                            {JSON.stringify(ev.diff, null, 2)}
                          </pre>
                        )}
                      </div>
                    </li>
                  );
                })}
              </ol>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
