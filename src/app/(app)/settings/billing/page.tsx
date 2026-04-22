import { AlertTriangle, CheckCircle2, CreditCard, Download, ShieldAlert } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { cancelSubscription, startPlanChange } from "@/app/api/billing/actions";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { requireSession } from "@/lib/auth/session";
import { computeUsageStatus, formatPrice, PLAN_DEFINITIONS } from "@/lib/billing/plans";
import { getSubscription } from "@/lib/db/billing";
import { getStripeAdapter } from "@/lib/stripe/adapter";
import { cn } from "@/lib/utils";
import type { OrganizationPlan } from "@/types/database";

export const metadata: Metadata = { title: "Usage & billing" };

interface SearchParams {
  searchParams: Promise<{
    plan?: string;
    fixture?: string;
    cancelled?: string;
    error?: string;
  }>;
}

const PLAN_ORDER: OrganizationPlan[] = ["free", "pro", "enterprise"];

function formatAmount(cents: number, currency: string): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: currency.toUpperCase(),
  }).format(cents / 100);
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

export default async function BillingSettingsPage({ searchParams }: SearchParams) {
  const session = await requireSession("/settings/billing");

  // Full subscription row requires owner (Codex LOW fix from Phase 2 — Stripe IDs gated).
  const isOwner = session.activeRole === "owner";

  const [subscription, invoices, params] = await Promise.all([
    isOwner ? getSubscription(session.activeOrganizationId) : Promise.resolve(null),
    isOwner
      ? getStripeAdapter().listInvoices(session.activeOrganizationId, 12)
      : Promise.resolve([]),
    searchParams,
  ]);

  if (!isOwner) {
    return (
      <div className="flex flex-col flex-1 overflow-auto">
        <div className="flex items-center justify-between px-6 h-[var(--header-height)] border-b border-[var(--border-subtle)] shrink-0">
          <h1 className="text-sm font-semibold text-[var(--foreground)]">Usage & billing</h1>
        </div>
        <div className="flex-1 flex items-center justify-center p-6">
          <Card className="max-w-md">
            <CardHeader>
              <div className="mx-auto mb-3 flex items-center justify-center w-12 h-12 rounded-full bg-[var(--surface-raised)]">
                <ShieldAlert className="w-5 h-5 text-[var(--foreground-muted)]" />
              </div>
              <CardTitle className="text-center">Owner access required</CardTitle>
              <CardDescription className="text-center">
                Billing details include Stripe identifiers and invoice data — visible to owners
                only. Ask an owner on your team to grant you the role if you need access.
              </CardDescription>
            </CardHeader>
          </Card>
        </div>
      </div>
    );
  }

  const currentPlan: OrganizationPlan = subscription?.plan ?? "free";
  const usage = computeUsageStatus(currentPlan, subscription?.metered_usage_current ?? 0);

  return (
    <div className="flex flex-col flex-1 overflow-auto">
      <div className="flex items-center justify-between px-6 h-[var(--header-height)] border-b border-[var(--border-subtle)] shrink-0">
        <div>
          <h1 className="text-sm font-semibold text-[var(--foreground)]">Usage & billing</h1>
          <p className="text-xs text-[var(--foreground-subtle)]">
            {subscription?.status ?? "No subscription"} · Current plan:{" "}
            {PLAN_DEFINITIONS[currentPlan].name}
          </p>
        </div>
        <Badge variant={currentPlan === "free" ? "secondary" : "default"} className="capitalize">
          {currentPlan}
        </Badge>
      </div>

      <div className="flex-1 p-6 grid grid-cols-1 xl:grid-cols-3 gap-5 overflow-auto">
        <div className="xl:col-span-2 space-y-5">
          {/* Usage meter */}
          <Card>
            <CardHeader>
              <CardTitle>Usage this period</CardTitle>
              <CardDescription>
                {subscription?.current_period_end
                  ? `Resets on ${formatDate(subscription.current_period_end)}`
                  : "Billing period not yet established"}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-end justify-between mb-2">
                <div>
                  <p className="text-2xl font-semibold font-mono text-[var(--foreground)]">
                    {usage.used.toLocaleString()}
                  </p>
                  <p className="text-xs text-[var(--foreground-muted)]">executions used</p>
                </div>
                <div className="text-right">
                  <p className="text-xs text-[var(--foreground-muted)]">
                    of {usage.limit === "unlimited" ? "unlimited" : usage.limit.toLocaleString()}
                  </p>
                </div>
              </div>
              {usage.limit !== "unlimited" && (
                <div className="h-2.5 rounded-full bg-[var(--surface-raised)] overflow-hidden">
                  <div
                    className={cn(
                      "h-full rounded-full transition-all",
                      usage.exhausted
                        ? "bg-[var(--error)]"
                        : usage.approaching
                          ? "bg-[var(--warning)]"
                          : "bg-[var(--brand)]",
                    )}
                    style={{ width: `${usage.percent.toFixed(2)}%` }}
                  />
                </div>
              )}
              {usage.approaching && !usage.exhausted && (
                <div className="mt-3 flex items-start gap-2 p-3 rounded-[var(--radius)] bg-[var(--warning-subtle)] border border-[var(--warning)]/30">
                  <AlertTriangle className="w-4 h-4 text-[var(--warning)] mt-0.5 shrink-0" />
                  <p className="text-xs text-[var(--foreground)]">
                    You&apos;re at {usage.percent.toFixed(0)}% of your monthly limit. Upgrade to
                    avoid hitting the quota.
                  </p>
                </div>
              )}
              {usage.exhausted && (
                <div className="mt-3 flex items-start gap-2 p-3 rounded-[var(--radius)] bg-[var(--error-subtle)] border border-[var(--error)]/30">
                  <AlertTriangle className="w-4 h-4 text-[var(--error)] mt-0.5 shrink-0" />
                  <p className="text-xs text-[var(--foreground)]">
                    Monthly quota reached. New executions will be queued until your period resets or
                    you upgrade.
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Plan switcher */}
          <Card>
            <CardHeader>
              <CardTitle>Plans</CardTitle>
              <CardDescription>
                Fixture mode uses a simulated checkout. Phase 7 swaps in live Stripe.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                {PLAN_ORDER.map((plan) => {
                  const def = PLAN_DEFINITIONS[plan];
                  const isCurrent = plan === currentPlan;
                  return (
                    <div
                      key={plan}
                      className={cn(
                        "rounded-[var(--radius)] border p-4 flex flex-col",
                        isCurrent
                          ? "border-[var(--brand)] bg-[var(--brand-subtle)]"
                          : "border-[var(--border)]",
                      )}
                    >
                      <p className="text-sm font-semibold">{def.name}</p>
                      <p className="mt-1 text-2xl font-semibold">
                        {plan === "enterprise" ? "Custom" : formatPrice(def.priceMonthlyUsdCents)}
                      </p>
                      <p className="mt-1 text-[10px] text-[var(--foreground-muted)]">
                        {def.executionLimit === "unlimited"
                          ? "Unlimited runs"
                          : `${def.executionLimit.toLocaleString()} runs/mo`}
                      </p>
                      {isCurrent ? (
                        <Badge variant="default" className="mt-3 self-start">
                          <CheckCircle2 className="w-3 h-3 mr-1" />
                          Current
                        </Badge>
                      ) : (
                        <form action={startPlanChange} className="mt-3">
                          <input type="hidden" name="targetPlan" value={plan} />
                          <Button
                            type="submit"
                            variant={plan === "enterprise" ? "secondary" : "default"}
                            size="sm"
                            className="w-full"
                          >
                            {plan === "enterprise"
                              ? "Contact sales"
                              : PLAN_DEFINITIONS[currentPlan].priceMonthlyUsdCents >
                                  def.priceMonthlyUsdCents
                                ? "Downgrade"
                                : "Upgrade"}
                          </Button>
                        </form>
                      )}
                    </div>
                  );
                })}
              </div>

              {params.plan && params.fixture === "1" && (
                <div className="mt-4 p-3 rounded-[var(--radius)] bg-[var(--brand-subtle)] border border-[var(--brand)]/30">
                  <p className="text-xs text-[var(--foreground)]">
                    Fixture mode: pretend Stripe checkout completed for{" "}
                    <span className="font-mono">{params.plan}</span>. Phase 7 wires real Stripe.
                  </p>
                </div>
              )}
              {params.cancelled === "1" && (
                <div className="mt-4 p-3 rounded-[var(--radius)] bg-[var(--warning-subtle)] border border-[var(--warning)]/30">
                  <p className="text-xs text-[var(--foreground)]">
                    Cancel requested. Your subscription will remain active until the period ends.
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Invoices */}
          <Card>
            <CardHeader>
              <CardTitle>Invoices</CardTitle>
              <CardDescription>
                Last {invoices.length} invoice{invoices.length === 1 ? "" : "s"}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {invoices.length === 0 ? (
                <p className="text-sm text-[var(--foreground-muted)]">
                  No invoices yet. You&apos;re on the Free plan.
                </p>
              ) : (
                <div className="divide-y divide-[var(--border-subtle)]">
                  {invoices.map((inv) => (
                    <div key={inv.id} className="flex items-center gap-3 py-2.5">
                      <CreditCard className="w-4 h-4 text-[var(--foreground-muted)] shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-[var(--foreground)] truncate">
                          {inv.number}
                        </p>
                        <p className="text-xs text-[var(--foreground-subtle)]">
                          {formatDate(inv.issued_at)}
                        </p>
                      </div>
                      <span className="text-sm font-mono text-[var(--foreground)]">
                        {formatAmount(inv.amount_due, inv.currency)}
                      </span>
                      <Badge variant={inv.status === "paid" ? "success" : "warning"}>
                        {inv.status}
                      </Badge>
                      {inv.hosted_invoice_url && (
                        <Link
                          href={inv.hosted_invoice_url}
                          target="_blank"
                          rel="noreferrer"
                          className="text-[var(--foreground-muted)] hover:text-[var(--foreground)]"
                          aria-label="View hosted invoice"
                        >
                          <Download className="w-3.5 h-3.5" />
                        </Link>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        <div className="space-y-5">
          {subscription && (
            <Card>
              <CardHeader>
                <CardTitle>Subscription</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-sm">
                <div>
                  <p className="text-[10px] font-medium text-[var(--foreground-muted)] uppercase tracking-wider">
                    Status
                  </p>
                  <p className="mt-0.5 capitalize">{subscription.status}</p>
                </div>
                <div>
                  <p className="text-[10px] font-medium text-[var(--foreground-muted)] uppercase tracking-wider">
                    Seats
                  </p>
                  <p className="mt-0.5 font-mono">{subscription.seats}</p>
                </div>
                <div>
                  <p className="text-[10px] font-medium text-[var(--foreground-muted)] uppercase tracking-wider">
                    Current period
                  </p>
                  <p className="mt-0.5 text-xs">
                    {subscription.current_period_start
                      ? formatDate(subscription.current_period_start)
                      : "—"}{" "}
                    →{" "}
                    {subscription.current_period_end
                      ? formatDate(subscription.current_period_end)
                      : "—"}
                  </p>
                </div>
                <div>
                  <p className="text-[10px] font-medium text-[var(--foreground-muted)] uppercase tracking-wider">
                    Stripe customer
                  </p>
                  <p className="mt-0.5 text-xs font-mono text-[var(--foreground-muted)]">
                    {subscription.stripe_customer_id}
                  </p>
                </div>
              </CardContent>
              {subscription.status === "active" && (
                <div className="border-t border-[var(--border-subtle)] p-4">
                  <form action={cancelSubscription}>
                    <Button type="submit" variant="ghost" size="sm" className="w-full">
                      Cancel subscription
                    </Button>
                  </form>
                </div>
              )}
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
