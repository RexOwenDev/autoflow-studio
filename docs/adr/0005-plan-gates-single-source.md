# 0005 — Plan tier limits and features live in a single TypeScript module

**Status:** Accepted — 2026-04-22
**Context:** Phase 6 (billing)

## Context

Plan tiers (Free / Pro / Enterprise) are referenced across the codebase:

- Pricing page (marketing)
- Billing settings (owner UI)
- Usage meter (dashboard)
- Upgrade CTAs (templates, audit export, SSO)
- Server-action gates (can-this-user-create-an-SSO-token?)
- Route handlers (audit export 402 on under-plan)

If each call site hardcodes its own limits ("Pro = 10,000 executions"), the copies drift. Stripe price IDs live somewhere else. The marketing page says one thing, the enforcement says another, and a single feature's addition requires 6+ PR touches.

## Decision

`src/lib/billing/plans.ts` is the single source of truth. It exports:

- `PLAN_DEFINITIONS: Record<OrganizationPlan, PlanDefinition>` — named limits, prices, and the feature flag matrix per plan
- `planAllowsFeature(plan, feature)` — boolean gate lookup
- `computeUsageStatus(plan, used)` — usage percent with `approaching` (≥80%) and `exhausted` (100%) flags
- `formatPrice(cents)` — display helper

Every UI surface imports from this module. Every server action that gates a feature calls `planAllowsFeature(plan, featureName)`. Adding a new plan-gated feature is one addition to `PlanDefinition.features` and one `planAllowsFeature` call at the enforcement site — no marketing-page edit required to keep the table accurate; the page reads from the same source.

## Alternatives considered

- **GrowthBook or LaunchDarkly.** Real feature flags, useful for gradual rollouts. Plan-tier gating is a different axis (user's permanent plan, not a rollout percentage), and introducing an external dependency for what's fundamentally a constant table is overkill. Phase 8+ can layer GrowthBook on top for rollouts.
- **Database table for plan definitions.** Flexible but introduces a query on every page render. For a 3-plan SaaS, the table is effectively static; TypeScript is faster and type-safe.
- **Stripe product metadata.** Stripe has the prices, but not the feature matrix or the UI copy. Round-tripping through Stripe's API on every page render is the wrong direction.

## Consequences

- **Positive:** One file to grep when answering "does Pro include X?".
- **Positive:** Pricing page, upgrade prompts, and server-side enforcement cannot drift.
- **Positive:** Adding a feature gate is a one-line change to the type union + one enforcement call.
- **Trade-off:** Plan changes require a redeploy. Acceptable for a 3-tier SaaS; if we ever need to change limits without a deploy, the path is: load overrides from DB, fall back to TypeScript defaults.

## Related

- `src/lib/billing/plans.ts` — single source
- `src/app/(app)/settings/billing/page.tsx` — consumer
- `src/app/pricing/page.tsx` — consumer
- `src/app/api/audit/export/route.ts` — `planAllowsFeature(plan, "audit_export")` gate
- `src/app/api/sso/actions.ts` — `planAllowsFeature(plan, "sso")` gate
