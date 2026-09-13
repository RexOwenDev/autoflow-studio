import { Check, Crown, Minus, Shield, Zap } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { formatPrice, PLAN_DEFINITIONS } from "@/lib/billing/plans";
import { cn } from "@/lib/utils";
import type { OrganizationPlan } from "@/types/database";

export const metadata: Metadata = {
  title: "Pricing · AutoFlow Studio",
  description: "Plans for solo builders through compliance-bound enterprises.",
};

const PLAN_ORDER: OrganizationPlan[] = ["free", "pro", "enterprise"];

const FEATURE_ROWS: Array<{
  key: keyof (typeof PLAN_DEFINITIONS)["free"]["features"] | "executions" | "seats" | "retention";
  label: string;
}> = [
  { key: "executions", label: "Executions / month" },
  { key: "seats", label: "Team seats" },
  { key: "retention", label: "Audit log retention" },
  { key: "audit_export", label: "Audit log export (CSV + JSON)" },
  { key: "sso", label: "SAML SSO / SCIM provisioning" },
  { key: "priority_support", label: "Priority support" },
  { key: "custom_templates", label: "Custom private templates" },
  { key: "sla", label: "99.9% uptime SLA" },
];

function renderFeatureValue(plan: OrganizationPlan, key: (typeof FEATURE_ROWS)[number]["key"]) {
  const def = PLAN_DEFINITIONS[plan];
  if (key === "executions") {
    return def.executionLimit === "unlimited" ? "Unlimited" : def.executionLimit.toLocaleString();
  }
  if (key === "seats") {
    return def.seatLimit === "unlimited" ? "Unlimited" : def.seatLimit.toString();
  }
  if (key === "retention") {
    return def.retentionDays === "unlimited" ? "Unlimited" : `${def.retentionDays} days`;
  }
  return def.features[key] ? "yes" : "no";
}

export default function PricingPage() {
  return (
    <div className="min-h-screen bg-[var(--background)] text-[var(--foreground)]">
      {/* Header */}
      <header className="border-b border-[var(--border-subtle)] bg-[var(--background-subtle)]">
        <div className="max-w-6xl mx-auto px-6 h-14 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2.5">
            <div className="flex items-center justify-center w-7 h-7 rounded-[var(--radius)] bg-[var(--brand)]">
              <Zap className="w-4 h-4 text-white" />
            </div>
            <span className="font-semibold text-sm tracking-tight">AutoFlow Studio</span>
          </Link>
          <div className="flex items-center gap-3">
            <Link
              href="/auth/sign-in"
              className="text-xs text-[var(--foreground-muted)] hover:text-[var(--foreground)]"
            >
              Sign in
            </Link>
            <Link href="/auth/sign-up">
              <Button size="sm">Start free</Button>
            </Link>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="max-w-6xl mx-auto px-6 pt-16 pb-12 text-center">
        <Badge variant="secondary" className="mb-4">
          Transparent pricing
        </Badge>
        <h1 className="text-3xl md:text-4xl font-semibold tracking-tight">
          Pricing that grows with your automations
        </h1>
        <p className="mt-4 text-sm md:text-base text-[var(--foreground-muted)] max-w-2xl mx-auto">
          No user-count fees. No feature upsells mid-billing-cycle. Just three tiers that match
          where your automation load actually lives.
        </p>
      </section>

      {/* Plan cards */}
      <section className="max-w-6xl mx-auto px-6 pb-12">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {PLAN_ORDER.map((plan) => {
            const def = PLAN_DEFINITIONS[plan];
            const isHighlighted = plan === "pro";
            return (
              <Card
                key={plan}
                className={cn(
                  "flex flex-col",
                  isHighlighted && "border-[var(--brand)] shadow-[var(--shadow-md)]",
                )}
              >
                <CardHeader>
                  <div className="flex items-center gap-2">
                    {plan === "enterprise" ? (
                      <Crown className="w-4 h-4 text-[var(--brand)]" />
                    ) : plan === "pro" ? (
                      <Shield className="w-4 h-4 text-[var(--brand)]" />
                    ) : (
                      <Zap className="w-4 h-4 text-[var(--foreground-muted)]" />
                    )}
                    <CardTitle>{def.name}</CardTitle>
                    {isHighlighted && (
                      <Badge variant="default" className="ml-auto">
                        Most popular
                      </Badge>
                    )}
                  </div>
                  <CardDescription>{def.recommendedFor}</CardDescription>
                  <div className="mt-3">
                    <span className="text-3xl font-semibold">
                      {plan === "enterprise" ? "Talk to us" : formatPrice(def.priceMonthlyUsdCents)}
                    </span>
                  </div>
                </CardHeader>
                <CardContent className="flex-1 flex flex-col">
                  <ul className="space-y-2 text-sm flex-1">
                    <li className="flex items-start gap-2">
                      <Check className="w-4 h-4 text-[var(--success)] mt-0.5 shrink-0" />
                      <span>
                        {def.executionLimit === "unlimited"
                          ? "Unlimited executions"
                          : `${def.executionLimit.toLocaleString()} executions / month`}
                      </span>
                    </li>
                    <li className="flex items-start gap-2">
                      <Check className="w-4 h-4 text-[var(--success)] mt-0.5 shrink-0" />
                      <span>
                        {def.seatLimit === "unlimited"
                          ? "Unlimited seats"
                          : `Up to ${def.seatLimit} seats`}
                      </span>
                    </li>
                    <li className="flex items-start gap-2">
                      <Check className="w-4 h-4 text-[var(--success)] mt-0.5 shrink-0" />
                      <span>
                        {def.retentionDays === "unlimited"
                          ? "Unlimited audit retention"
                          : `${def.retentionDays}-day audit retention`}
                      </span>
                    </li>
                    {def.features.sso && (
                      <li className="flex items-start gap-2">
                        <Check className="w-4 h-4 text-[var(--success)] mt-0.5 shrink-0" />
                        <span>SAML SSO + SCIM</span>
                      </li>
                    )}
                    {def.features.audit_export && (
                      <li className="flex items-start gap-2">
                        <Check className="w-4 h-4 text-[var(--success)] mt-0.5 shrink-0" />
                        <span>Audit log export</span>
                      </li>
                    )}
                    {def.features.priority_support && (
                      <li className="flex items-start gap-2">
                        <Check className="w-4 h-4 text-[var(--success)] mt-0.5 shrink-0" />
                        <span>Priority support</span>
                      </li>
                    )}
                    {def.features.sla && (
                      <li className="flex items-start gap-2">
                        <Check className="w-4 h-4 text-[var(--success)] mt-0.5 shrink-0" />
                        <span>99.9% uptime SLA</span>
                      </li>
                    )}
                  </ul>
                  <Link
                    href={plan === "enterprise" ? "/contact" : "/auth/sign-up"}
                    className="mt-6"
                  >
                    <Button className="w-full" variant={isHighlighted ? "default" : "secondary"}>
                      {plan === "enterprise" ? "Contact sales" : "Start free"}
                    </Button>
                  </Link>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </section>

      {/* Feature matrix */}
      <section className="max-w-6xl mx-auto px-6 pb-20">
        <div className="text-center mb-6">
          <h2 className="text-xl font-semibold">Everything in one grid</h2>
          <p className="mt-2 text-sm text-[var(--foreground-muted)]">
            Compare plans feature-by-feature.
          </p>
        </div>
        <div className="overflow-x-auto rounded-[var(--radius)] border border-[var(--border)]">
          <table className="w-full text-sm">
            <thead className="bg-[var(--background-subtle)]">
              <tr>
                <th className="text-left px-4 py-3 text-xs font-medium text-[var(--foreground-muted)] uppercase tracking-wider">
                  Feature
                </th>
                {PLAN_ORDER.map((p) => (
                  <th
                    key={p}
                    className="text-left px-4 py-3 text-xs font-medium text-[var(--foreground-muted)] uppercase tracking-wider"
                  >
                    {PLAN_DEFINITIONS[p].name}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--border-subtle)]">
              {FEATURE_ROWS.map((row) => (
                <tr key={row.key}>
                  <td className="px-4 py-3 text-[var(--foreground)]">{row.label}</td>
                  {PLAN_ORDER.map((p) => {
                    const value = renderFeatureValue(p, row.key);
                    return (
                      <td key={p} className="px-4 py-3">
                        {value === "yes" ? (
                          <Check className="w-4 h-4 text-[var(--success)]" />
                        ) : value === "no" ? (
                          <Minus className="w-4 h-4 text-[var(--foreground-subtle)]" />
                        ) : (
                          <span className="text-[var(--foreground)]">{value}</span>
                        )}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
