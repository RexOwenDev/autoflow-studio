import { ChevronRight, Filter } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { StatusPill } from "@/components/execution/StatusPill";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { requireSession } from "@/lib/auth/session";
import { listExecutions } from "@/lib/db/executions";
import { listWorkflows } from "@/lib/db/workflows";
import { cn } from "@/lib/utils";
import type { ExecutionStatus } from "@/types/database";

export const metadata: Metadata = { title: "Executions" };

interface ExecutionsPageProps {
  searchParams: Promise<{
    status?: string;
    workflow?: string;
    range?: string;
  }>;
}

const STATUS_VALUES: ExecutionStatus[] = [
  "success",
  "failed",
  "retrying",
  "running",
  "queued",
  "cancelled",
];

const RANGE_WINDOWS: Record<string, { label: string; hours: number }> = {
  "1h": { label: "Last hour", hours: 1 },
  "24h": { label: "Last 24 hours", hours: 24 },
  "7d": { label: "Last 7 days", hours: 24 * 7 },
  "30d": { label: "Last 30 days", hours: 24 * 30 },
};

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

function isStatus(value: string | undefined): value is ExecutionStatus {
  return value !== undefined && STATUS_VALUES.includes(value as ExecutionStatus);
}

export default async function ExecutionsPage({ searchParams }: ExecutionsPageProps) {
  const session = await requireSession("/executions");
  const [allExecutions, workflows, params] = await Promise.all([
    listExecutions(session.activeOrganizationId, 500),
    listWorkflows(session.activeOrganizationId),
    searchParams,
  ]);

  const workflowsById = new Map(workflows.map((w) => [w.id, w]));
  const activeStatus = isStatus(params.status) ? params.status : null;
  const activeWorkflowId = params.workflow ?? null;
  const activeRange = params.range ?? "24h";
  const rangeHours = RANGE_WINDOWS[activeRange]?.hours ?? 24;
  const rangeCutoff = Date.now() - rangeHours * 3_600_000;

  const filtered = allExecutions.filter((e) => {
    if (activeStatus && e.status !== activeStatus) return false;
    if (activeWorkflowId && e.workflow_id !== activeWorkflowId) return false;
    if (e.started_at && new Date(e.started_at).getTime() < rangeCutoff) return false;
    return true;
  });

  const now = new Date();
  const statusCounts: Record<ExecutionStatus, number> = {
    success: 0,
    failed: 0,
    retrying: 0,
    running: 0,
    queued: 0,
    cancelled: 0,
  };
  for (const e of filtered) statusCounts[e.status]++;

  const buildQuery = (next: {
    status?: string | null;
    workflow?: string | null;
    range?: string;
  }) => {
    const p = new URLSearchParams();
    const status = next.status === null ? null : (next.status ?? activeStatus);
    const wfId = next.workflow === null ? null : (next.workflow ?? activeWorkflowId);
    const r = next.range ?? activeRange;
    if (status) p.set("status", status);
    if (wfId) p.set("workflow", wfId);
    if (r !== "24h") p.set("range", r);
    const qs = p.toString();
    return qs ? `?${qs}` : "";
  };

  return (
    <div className="flex flex-col flex-1 overflow-auto">
      <div className="flex items-center justify-between px-6 h-[var(--header-height)] border-b border-[var(--border-subtle)] shrink-0">
        <div>
          <h1 className="text-sm font-semibold text-[var(--foreground)]">Executions</h1>
          <p className="text-xs text-[var(--foreground-subtle)]">
            {filtered.length} run{filtered.length === 1 ? "" : "s"} ·{" "}
            {RANGE_WINDOWS[activeRange]?.label ?? "Last 24 hours"}
          </p>
        </div>
        <Badge variant="info">
          <Filter className="w-3 h-3 mr-1" />
          {(activeStatus ? 1 : 0) + (activeWorkflowId ? 1 : 0)} active filter
          {(activeStatus ? 1 : 0) + (activeWorkflowId ? 1 : 0) === 1 ? "" : "s"}
        </Badge>
      </div>

      {/* Filter row */}
      <div className="flex flex-wrap items-center gap-4 px-6 py-3 border-b border-[var(--border-subtle)] bg-[var(--background-subtle)]">
        <div className="flex items-center gap-1.5 flex-wrap">
          <span className="text-[10px] font-medium text-[var(--foreground-muted)] uppercase tracking-wider">
            Status
          </span>
          <Link
            href={`/executions${buildQuery({ status: null })}`}
            className={cn(
              "px-2.5 py-0.5 rounded-full text-xs transition-colors",
              activeStatus === null
                ? "bg-[var(--brand)] text-white"
                : "bg-[var(--surface-raised)] text-[var(--foreground-muted)] hover:text-[var(--foreground)]",
            )}
          >
            All
          </Link>
          {STATUS_VALUES.map((s) => (
            <Link
              key={s}
              href={`/executions${buildQuery({ status: s })}`}
              className={cn(
                "px-2.5 py-0.5 rounded-full text-xs capitalize transition-colors",
                activeStatus === s
                  ? "bg-[var(--brand)] text-white"
                  : "bg-[var(--surface-raised)] text-[var(--foreground-muted)] hover:text-[var(--foreground)]",
              )}
            >
              {s} ({statusCounts[s]})
            </Link>
          ))}
        </div>

        <div className="flex items-center gap-1.5 flex-wrap">
          <span className="text-[10px] font-medium text-[var(--foreground-muted)] uppercase tracking-wider">
            Range
          </span>
          {Object.entries(RANGE_WINDOWS).map(([key, win]) => (
            <Link
              key={key}
              href={`/executions${buildQuery({ range: key })}`}
              className={cn(
                "px-2.5 py-0.5 rounded-full text-xs transition-colors",
                activeRange === key
                  ? "bg-[var(--brand)] text-white"
                  : "bg-[var(--surface-raised)] text-[var(--foreground-muted)] hover:text-[var(--foreground)]",
              )}
            >
              {win.label}
            </Link>
          ))}
        </div>

        {workflows.length > 0 && (
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-medium text-[var(--foreground-muted)] uppercase tracking-wider">
              Workflow
            </span>
            <Link
              href={`/executions${buildQuery({ workflow: null })}`}
              className={cn(
                "px-2.5 py-0.5 rounded-full text-xs transition-colors",
                !activeWorkflowId
                  ? "bg-[var(--brand)] text-white"
                  : "bg-[var(--surface-raised)] text-[var(--foreground-muted)] hover:text-[var(--foreground)]",
              )}
            >
              All
            </Link>
          </div>
        )}
      </div>

      {/* Executions table */}
      <div className="flex-1 p-6 overflow-auto">
        {filtered.length === 0 ? (
          <Card>
            <CardContent className="py-16 text-center">
              <p className="text-sm text-[var(--foreground-muted)]">
                No executions match the current filters.
              </p>
              <Link
                href="/executions"
                className="mt-3 inline-block text-xs text-[var(--brand)] hover:underline"
              >
                Clear filters
              </Link>
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardContent className="p-0">
              <div className="divide-y divide-[var(--border-subtle)]">
                {filtered.slice(0, 50).map((exec) => {
                  const workflow = workflowsById.get(exec.workflow_id);
                  return (
                    <Link
                      key={exec.id}
                      href={`/executions/${exec.id}`}
                      className="flex items-center gap-4 px-4 py-3 hover:bg-[var(--surface-raised)] transition-colors group"
                    >
                      <StatusPill status={exec.status} />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-[var(--foreground)] truncate">
                          {workflow?.name ?? "(unknown workflow)"}
                        </p>
                        <p className="text-xs text-[var(--foreground-subtle)] truncate font-mono">
                          {exec.id.slice(0, 12)}… · {exec.trigger_source}
                        </p>
                      </div>
                      <span className="text-xs text-[var(--foreground-muted)] font-mono w-14 text-right hidden sm:inline">
                        {formatDuration(exec.duration_ms)}
                      </span>
                      <span className="text-xs text-[var(--foreground-subtle)] w-16 text-right">
                        {formatRelative(exec.started_at, now)}
                      </span>
                      <ChevronRight className="w-4 h-4 text-[var(--foreground-subtle)] group-hover:text-[var(--foreground-muted)] shrink-0" />
                    </Link>
                  );
                })}
                {filtered.length > 50 && (
                  <div className="px-4 py-3 text-center text-xs text-[var(--foreground-subtle)]">
                    Showing first 50 of {filtered.length} runs
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
