import { Activity, CheckCircle2, TrendingUp, Workflow, XCircle } from "lucide-react";
import type { Metadata } from "next";
import { StatItem, StatsBar } from "@/components/layout/stats-bar";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { requireSession } from "@/lib/auth/session";
import { listAuditEvents } from "@/lib/db/audit";
import { getSubscriptionForMember } from "@/lib/db/billing";
import { getExecutionStats, listExecutions } from "@/lib/db/executions";
import { listWorkflows } from "@/lib/db/workflows";
import type { ExecutionStatus } from "@/types/database";

export const metadata: Metadata = { title: "Dashboard" };

const PLAN_LIMITS: Record<string, number> = {
  free: 100,
  pro: 10_000,
  enterprise: Number.POSITIVE_INFINITY,
};

function statusVariant(s: ExecutionStatus) {
  if (s === "success") return "success" as const;
  if (s === "failed") return "destructive" as const;
  if (s === "retrying" || s === "queued") return "warning" as const;
  if (s === "cancelled") return "secondary" as const;
  return "info" as const;
}

function formatDuration(ms: number | null): string {
  if (ms === null) return "—";
  if (ms < 1000) return `${ms}ms`;
  return `${(ms / 1000).toFixed(1)}s`;
}

function formatRelative(iso: string | null, now: Date): string {
  if (!iso) return "—";
  const diffMs = now.getTime() - new Date(iso).getTime();
  const minutes = Math.round(diffMs / 60_000);
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.round(hours / 24);
  return `${days}d ago`;
}

export default async function DashboardPage() {
  const session = await requireSession("/dashboard");
  const orgId = session.activeOrganizationId;
  // Audit log is admin-only post-Codex-fix; the dashboard widget will tolerate an empty
  // result for member-tier users. Phase 5 surfaces a redacted member-safe audit feed.
  const [executions, stats, workflows, subscription, recentAudit] = await Promise.all([
    listExecutions(orgId, 5),
    getExecutionStats(orgId),
    listWorkflows(orgId),
    getSubscriptionForMember(orgId),
    listAuditEvents(orgId, 1).catch(() => []),
  ]);

  const workflowsById = new Map(workflows.map((w) => [w.id, w]));
  const activeCount = workflows.filter((w) => w.status === "active").length;
  const planLimit = subscription ? (PLAN_LIMITS[subscription.plan] ?? 0) : 0;
  const usage = subscription?.metered_usage_current ?? 0;
  const usagePct = planLimit === Number.POSITIVE_INFINITY ? 0 : (usage / planLimit) * 100;
  const planLabel = subscription?.plan ?? "free";
  const successRatePct = (stats.successRate * 100).toFixed(1);
  const now = new Date();

  return (
    <div className="flex flex-col flex-1 overflow-auto">
      {/* Header */}
      <div className="flex items-center justify-between px-6 h-[var(--header-height)] border-b border-[var(--border-subtle)] shrink-0">
        <h1 className="text-sm font-semibold text-[var(--foreground)]">Dashboard</h1>
        <Badge variant="secondary">Fixture mode</Badge>
      </div>

      {/* Stats bar */}
      <StatsBar>
        <StatItem label="Total runs" value={stats.total} icon={Activity} trend="up" />
        <div className="w-px h-6 bg-[var(--border)]" />
        <StatItem
          label="Success rate"
          value={`${successRatePct}%`}
          icon={CheckCircle2}
          trend="up"
        />
        <div className="w-px h-6 bg-[var(--border)]" />
        <StatItem label="Failures" value={stats.failed} icon={XCircle} trend="down" />
        <div className="w-px h-6 bg-[var(--border)]" />
        <StatItem label="Active workflows" value={activeCount} icon={Workflow} />
      </StatsBar>

      {/* Content */}
      <div className="flex-1 p-6 grid grid-cols-1 xl:grid-cols-3 gap-5 overflow-auto">
        {/* Recent executions */}
        <Card className="xl:col-span-2">
          <CardHeader>
            <CardTitle>Recent Executions</CardTitle>
            <CardDescription>
              Last {executions.length} runs · {recentAudit[0]?.action ?? "no audit events"}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {executions.map((run) => {
                const workflow = workflowsById.get(run.workflow_id);
                return (
                  <div
                    key={run.id}
                    className="flex items-center gap-3 py-2 border-b border-[var(--border-subtle)] last:border-0"
                  >
                    <Badge
                      variant={statusVariant(run.status)}
                      className="capitalize w-20 justify-center"
                    >
                      {run.status}
                    </Badge>
                    <span className="flex-1 text-sm font-medium text-[var(--foreground)] truncate">
                      {workflow?.name ?? run.workflow_id}
                    </span>
                    <span className="text-xs text-[var(--foreground-muted)] font-mono">
                      {formatDuration(run.duration_ms)}
                    </span>
                    <span className="text-xs text-[var(--foreground-subtle)] w-14 text-right">
                      {formatRelative(run.started_at, now)}
                    </span>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>

        {/* Plan summary */}
        <Card>
          <CardHeader>
            <CardTitle>Plan Usage</CardTitle>
            <CardDescription className="capitalize">
              {planLabel} · {subscription?.status ?? "no subscription"}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <div className="flex justify-between text-xs mb-1.5">
                  <span className="text-[var(--foreground-muted)]">Executions</span>
                  <span className="text-[var(--foreground)] font-medium">
                    {usage.toLocaleString()} /{" "}
                    {planLimit === Number.POSITIVE_INFINITY
                      ? "unlimited"
                      : planLimit.toLocaleString()}
                  </span>
                </div>
                <div className="h-2 rounded-full bg-[var(--surface-raised)] overflow-hidden">
                  <div
                    className="h-full rounded-full bg-[var(--brand)] transition-all"
                    style={{ width: `${Math.min(100, usagePct).toFixed(2)}%` }}
                  />
                </div>
              </div>
              <div className="flex items-center justify-between pt-2 border-t border-[var(--border-subtle)]">
                <Badge variant="default" className="capitalize">
                  {planLabel}
                </Badge>
                <TrendingUp className="w-4 h-4 text-[var(--success)]" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
