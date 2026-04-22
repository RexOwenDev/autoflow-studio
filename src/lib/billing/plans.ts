import type { OrganizationPlan } from "@/types/database";

/**
 * Single source of truth for plan tier limits + feature gates.
 * Used by the dashboard UsageMeter, the pricing page, the executions page
 * (soft-gate when over limit), and the Phase 7 GrowthBook feature-flag layer.
 */

export interface PlanDefinition {
  name: string;
  priceMonthlyUsdCents: number;
  executionLimit: number | "unlimited";
  seatLimit: number | "unlimited";
  retentionDays: number | "unlimited";
  features: {
    audit_export: boolean;
    sso: boolean;
    priority_support: boolean;
    custom_templates: boolean;
    sla: boolean;
  };
  recommendedFor: string;
}

export const PLAN_DEFINITIONS: Record<OrganizationPlan, PlanDefinition> = {
  free: {
    name: "Free",
    priceMonthlyUsdCents: 0,
    executionLimit: 100,
    seatLimit: 3,
    retentionDays: 30,
    features: {
      audit_export: false,
      sso: false,
      priority_support: false,
      custom_templates: false,
      sla: false,
    },
    recommendedFor: "Solo builders kicking the tires",
  },
  pro: {
    name: "Pro",
    priceMonthlyUsdCents: 9900,
    executionLimit: 10_000,
    seatLimit: 20,
    retentionDays: 365,
    features: {
      audit_export: true,
      sso: false,
      priority_support: true,
      custom_templates: true,
      sla: false,
    },
    recommendedFor: "Teams running production automations",
  },
  enterprise: {
    name: "Enterprise",
    priceMonthlyUsdCents: 0, // quote-based
    executionLimit: "unlimited",
    seatLimit: "unlimited",
    retentionDays: "unlimited",
    features: {
      audit_export: true,
      sso: true,
      priority_support: true,
      custom_templates: true,
      sla: true,
    },
    recommendedFor: "Compliance-bound orgs with SSO + audit requirements",
  },
};

export type PlanFeature = keyof PlanDefinition["features"];

export function planAllowsFeature(plan: OrganizationPlan, feature: PlanFeature): boolean {
  return PLAN_DEFINITIONS[plan].features[feature];
}

export interface UsageStatus {
  used: number;
  limit: number | "unlimited";
  percent: number;
  exhausted: boolean;
  approaching: boolean; // ≥ 80%
}

export function computeUsageStatus(plan: OrganizationPlan, used: number): UsageStatus {
  const def = PLAN_DEFINITIONS[plan];
  if (def.executionLimit === "unlimited") {
    return { used, limit: "unlimited", percent: 0, exhausted: false, approaching: false };
  }
  const pct = (used / def.executionLimit) * 100;
  return {
    used,
    limit: def.executionLimit,
    percent: Math.min(100, pct),
    exhausted: used >= def.executionLimit,
    approaching: pct >= 80,
  };
}

export function formatPrice(cents: number): string {
  if (cents === 0) return "Free";
  const dollars = cents / 100;
  return `$${dollars.toFixed(0)}/mo`;
}
