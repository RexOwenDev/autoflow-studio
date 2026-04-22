import { AlertCircle, ArrowLeft, Clock, Hash, Play, RotateCcw, XOctagon, Zap } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { cancelExecution, retryExecution } from "@/app/api/executions/actions";
import { StatusPill } from "@/components/execution/StatusPill";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { requireSession } from "@/lib/auth/session";
import { getExecution, listExecutionEvents } from "@/lib/db/executions";
import { getWorkflow } from "@/lib/db/workflows";

interface ExecutionDetailPageProps {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ retry?: string; cancelled?: string }>;
}

export const metadata: Metadata = { title: "Execution detail" };

function formatDuration(ms: number | null): string {
  if (ms === null) return "—";
  if (ms < 1000) return `${ms}ms`;
  return `${(ms / 1000).toFixed(2)}s`;
}

function formatTime(iso: string | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
}

export default async function ExecutionDetailPage({
  params,
  searchParams,
}: ExecutionDetailPageProps) {
  const [{ id }, search, session] = await Promise.all([params, searchParams, requireSession()]);

  const execution = await getExecution(id);
  if (!execution) notFound();

  // Tenant check — the RLS policy enforces it server-side, but we double-check here
  // as defense in depth + produce a clean 404 instead of empty data.
  if (execution.organization_id !== session.activeOrganizationId) {
    notFound();
  }

  const [workflow, events] = await Promise.all([
    getWorkflow(execution.workflow_id),
    listExecutionEvents(execution.id),
  ]);

  const isRetriable = execution.status === "failed" || execution.status === "retrying";
  const isCancellable =
    execution.status === "queued" ||
    execution.status === "running" ||
    execution.status === "retrying";

  return (
    <div className="flex flex-col flex-1 overflow-auto">
      <div className="flex items-center justify-between px-6 h-[var(--header-height)] border-b border-[var(--border-subtle)] shrink-0">
        <div className="flex items-center gap-3 min-w-0">
          <Link
            href="/executions"
            className="flex items-center gap-1 text-xs text-[var(--foreground-muted)] hover:text-[var(--foreground)]"
          >
            <ArrowLeft className="w-3 h-3" />
            Executions
          </Link>
          <span className="text-xs text-[var(--foreground-subtle)]">/</span>
          <h1 className="text-sm font-mono text-[var(--foreground)] truncate">
            {execution.id.slice(0, 16)}…
          </h1>
        </div>
        <StatusPill status={execution.status} />
      </div>

      <div className="flex-1 p-6 grid grid-cols-1 xl:grid-cols-3 gap-5 overflow-auto">
        <div className="xl:col-span-2 space-y-5">
          <Card>
            <CardHeader>
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <CardTitle>{workflow?.name ?? "(unknown workflow)"}</CardTitle>
                  <CardDescription>
                    Triggered by <span className="font-mono">{execution.trigger_source}</span> ·
                    Started {formatTime(execution.started_at)}
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <dl className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-sm">
                <div>
                  <dt className="text-[10px] font-medium text-[var(--foreground-muted)] uppercase tracking-wider">
                    Duration
                  </dt>
                  <dd className="mt-1 font-mono text-[var(--foreground)]">
                    {formatDuration(execution.duration_ms)}
                  </dd>
                </div>
                <div>
                  <dt className="text-[10px] font-medium text-[var(--foreground-muted)] uppercase tracking-wider">
                    Started
                  </dt>
                  <dd className="mt-1 text-xs text-[var(--foreground)]">
                    {formatTime(execution.started_at)}
                  </dd>
                </div>
                <div>
                  <dt className="text-[10px] font-medium text-[var(--foreground-muted)] uppercase tracking-wider">
                    Finished
                  </dt>
                  <dd className="mt-1 text-xs text-[var(--foreground)]">
                    {formatTime(execution.finished_at)}
                  </dd>
                </div>
                <div>
                  <dt className="text-[10px] font-medium text-[var(--foreground-muted)] uppercase tracking-wider">
                    Idempotency key
                  </dt>
                  <dd className="mt-1 text-xs font-mono text-[var(--foreground)] truncate">
                    {execution.idempotency_key ?? "—"}
                  </dd>
                </div>
              </dl>

              {execution.error_message && (
                <div className="mt-4 p-3 rounded-[var(--radius)] bg-[var(--error-subtle)] border border-[var(--error)]/30">
                  <div className="flex items-start gap-2">
                    <AlertCircle className="w-4 h-4 text-[var(--error)] shrink-0 mt-0.5" />
                    <div>
                      <p className="text-xs font-medium text-[var(--error)]">Error</p>
                      <p className="mt-1 text-sm text-[var(--foreground)]">
                        {execution.error_message}
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {(isRetriable || isCancellable) && (
                <div className="mt-4 flex items-center gap-2 flex-wrap">
                  {isRetriable && (
                    <form action={retryExecution}>
                      <input type="hidden" name="executionId" value={execution.id} />
                      <Button type="submit" variant="default" size="sm">
                        <RotateCcw className="w-3.5 h-3.5 mr-2" />
                        Retry
                      </Button>
                    </form>
                  )}
                  {isCancellable && (
                    <form action={cancelExecution}>
                      <input type="hidden" name="executionId" value={execution.id} />
                      <Button type="submit" variant="secondary" size="sm">
                        <XOctagon className="w-3.5 h-3.5 mr-2" />
                        Cancel
                      </Button>
                    </form>
                  )}
                  {search.retry === "scheduled" && <Badge variant="info">Retry scheduled</Badge>}
                  {search.cancelled === "1" && <Badge variant="secondary">Cancel requested</Badge>}
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Event timeline</CardTitle>
              <CardDescription>
                {events.length} event{events.length === 1 ? "" : "s"} recorded during this run.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {events.length === 0 ? (
                <p className="text-sm text-[var(--foreground-muted)]">
                  No events recorded. Phase 7 wires execution_events to n8n step callbacks.
                </p>
              ) : (
                <ol className="space-y-3">
                  {events.map((ev) => (
                    <li key={ev.id} className="flex items-start gap-3">
                      <div className="flex flex-col items-center shrink-0">
                        <div className="flex items-center justify-center w-6 h-6 rounded-full bg-[var(--surface-raised)] border border-[var(--border)]">
                          <Play className="w-3 h-3 text-[var(--foreground-muted)]" />
                        </div>
                      </div>
                      <div className="flex-1 min-w-0 pb-3">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium text-[var(--foreground)] capitalize">
                            {ev.kind.replace(/_/g, " ")}
                          </span>
                          {ev.node_id && (
                            <Badge variant="secondary" className="text-[10px]">
                              {ev.node_id}
                            </Badge>
                          )}
                        </div>
                        <p className="text-xs text-[var(--foreground-subtle)] mt-0.5">
                          {formatTime(ev.occurred_at)}
                        </p>
                        {Object.keys(ev.payload).length > 0 && (
                          <pre className="mt-2 text-[10px] p-2 rounded bg-[var(--surface-raised)] text-[var(--foreground-muted)] overflow-x-auto">
                            {JSON.stringify(ev.payload, null, 2)}
                          </pre>
                        )}
                      </div>
                    </li>
                  ))}
                </ol>
              )}
            </CardContent>
          </Card>
        </div>

        <div className="space-y-5">
          <Card>
            <CardHeader>
              <CardTitle>Context</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div className="flex items-start gap-2">
                <Zap className="w-4 h-4 text-[var(--foreground-muted)] mt-0.5 shrink-0" />
                <div className="min-w-0">
                  <p className="text-[10px] font-medium text-[var(--foreground-muted)] uppercase tracking-wider">
                    Workflow
                  </p>
                  <Link
                    href={workflow ? `/workflows/${workflow.id}` : "/workflows"}
                    className="text-[var(--brand)] hover:underline truncate block"
                  >
                    {workflow?.name ?? "(not found)"}
                  </Link>
                </div>
              </div>
              <div className="flex items-start gap-2">
                <Hash className="w-4 h-4 text-[var(--foreground-muted)] mt-0.5 shrink-0" />
                <div className="min-w-0">
                  <p className="text-[10px] font-medium text-[var(--foreground-muted)] uppercase tracking-wider">
                    Execution ID
                  </p>
                  <p className="text-xs font-mono text-[var(--foreground)] break-all">
                    {execution.id}
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-2">
                <Clock className="w-4 h-4 text-[var(--foreground-muted)] mt-0.5 shrink-0" />
                <div className="min-w-0">
                  <p className="text-[10px] font-medium text-[var(--foreground-muted)] uppercase tracking-wider">
                    Created at
                  </p>
                  <p className="text-xs text-[var(--foreground)]">
                    {formatTime(execution.created_at)}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
