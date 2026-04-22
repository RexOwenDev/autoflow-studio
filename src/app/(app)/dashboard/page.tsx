import { Activity, CheckCircle2, TrendingUp, Workflow, XCircle } from "lucide-react";
import type { Metadata } from "next";
import { StatItem, StatsBar } from "@/components/layout/stats-bar";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export const metadata: Metadata = { title: "Dashboard" };

const recentRuns = [
  { id: "run_001", workflow: "Lead Capture", status: "success", duration: "1.2s", ts: "2m ago" },
  { id: "run_002", workflow: "Slack Notifier", status: "success", duration: "0.8s", ts: "5m ago" },
  { id: "run_003", workflow: "Daily Digest", status: "failed", duration: "3.1s", ts: "12m ago" },
  {
    id: "run_004",
    workflow: "Webhook-to-Email",
    status: "success",
    duration: "2.4s",
    ts: "18m ago",
  },
  { id: "run_005", workflow: "CSV-to-Sheets", status: "retrying", duration: "—", ts: "21m ago" },
];

const statusVariant = (s: string) => {
  if (s === "success") return "success" as const;
  if (s === "failed") return "destructive" as const;
  if (s === "retrying") return "warning" as const;
  return "secondary" as const;
};

export default function DashboardPage() {
  return (
    <div className="flex flex-col flex-1 overflow-auto">
      {/* Header */}
      <div className="flex items-center justify-between px-6 h-[var(--header-height)] border-b border-[var(--border-subtle)] shrink-0">
        <h1 className="text-sm font-semibold text-[var(--foreground)]">Dashboard</h1>
        <Badge variant="secondary">Fixture mode</Badge>
      </div>

      {/* Stats bar */}
      <StatsBar>
        <StatItem label="Total runs today" value="247" icon={Activity} trend="up" />
        <div className="w-px h-6 bg-[var(--border)]" />
        <StatItem label="Success rate" value="96.8%" icon={CheckCircle2} trend="up" />
        <div className="w-px h-6 bg-[var(--border)]" />
        <StatItem label="Failures" value="8" icon={XCircle} trend="down" />
        <div className="w-px h-6 bg-[var(--border)]" />
        <StatItem label="Active workflows" value="5" icon={Workflow} />
      </StatsBar>

      {/* Content */}
      <div className="flex-1 p-6 grid grid-cols-1 xl:grid-cols-3 gap-5 overflow-auto">
        {/* Recent executions */}
        <Card className="xl:col-span-2">
          <CardHeader>
            <CardTitle>Recent Executions</CardTitle>
            <CardDescription>Last 5 automation runs across all workflows</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {recentRuns.map((run) => (
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
                    {run.workflow}
                  </span>
                  <span className="text-xs text-[var(--foreground-muted)] font-mono">
                    {run.duration}
                  </span>
                  <span className="text-xs text-[var(--foreground-subtle)] w-14 text-right">
                    {run.ts}
                  </span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Plan summary */}
        <Card>
          <CardHeader>
            <CardTitle>Plan Usage</CardTitle>
            <CardDescription>Pro · Resets in 8 days</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <div className="flex justify-between text-xs mb-1.5">
                  <span className="text-[var(--foreground-muted)]">Executions</span>
                  <span className="text-[var(--foreground)] font-medium">247 / 10,000</span>
                </div>
                <div className="h-2 rounded-full bg-[var(--surface-raised)] overflow-hidden">
                  <div
                    className="h-full rounded-full bg-[var(--brand)] transition-all"
                    style={{ width: "2.47%" }}
                  />
                </div>
              </div>
              <div className="flex items-center justify-between pt-2 border-t border-[var(--border-subtle)]">
                <Badge variant="default">Pro</Badge>
                <TrendingUp className="w-4 h-4 text-[var(--success)]" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
