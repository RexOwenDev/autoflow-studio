import "server-only";
import { APP_MODE } from "@/lib/env";
import type { OrganizationPlan } from "@/types/database";

/**
 * Stripe adapter — Phase 6 surface.
 *
 * Live mode (Phase 7+) wires this to `stripe` (the Node SDK) with the secret key
 * from STRIPE_SECRET_KEY env. Fixture mode stubs plan changes + invoice list with
 * deterministic data so the pricing/billing UI is demo-able without live keys.
 *
 * Hard constraint: NO Stripe secret key ever committed. Fixture mode is the
 * only mode runnable without Stripe credentials.
 */

export interface FixtureInvoice {
  id: string;
  number: string;
  amount_due: number; // cents
  currency: string;
  status: "paid" | "open" | "void" | "uncollectible";
  hosted_invoice_url: string | null;
  issued_at: string;
}

export interface StripeAdapter {
  readonly mode: "fixture" | "live";

  /** HMAC secret for webhook signature verification. */
  getWebhookSecret(): string;

  /** List invoices for the org (owner-only calls). */
  listInvoices(organizationId: string, limit?: number): Promise<FixtureInvoice[]>;

  /**
   * Start a plan-change checkout. In live mode this returns a Stripe-hosted URL.
   * In fixture mode we return a synthesized route that the dashboard can land on
   * to acknowledge the plan change locally.
   */
  startPlanChange(
    organizationId: string,
    targetPlan: OrganizationPlan,
  ): Promise<{ checkoutUrl: string }>;
}

function createFixtureStripeAdapter(): StripeAdapter {
  return {
    mode: "fixture",
    getWebhookSecret() {
      return "fixture-stripe-webhook-secret-do-not-use-in-prod";
    },
    async listInvoices(_organizationId: string, limit = 12) {
      return FIXTURE_INVOICES.slice(0, limit);
    },
    async startPlanChange(_organizationId: string, targetPlan: OrganizationPlan) {
      // Live mode redirects to stripe.com/checkout; fixture round-trips back to settings.
      return { checkoutUrl: `/settings/billing?plan=${targetPlan}&fixture=1` };
    },
  };
}

let cached: StripeAdapter | undefined;

export function getStripeAdapter(): StripeAdapter {
  if (cached) return cached;
  if (APP_MODE === "fixture") {
    cached = createFixtureStripeAdapter();
    return cached;
  }
  throw new Error("[stripe] live adapter not implemented (Phase 7 wiring pending).");
}

// =============================================================================
// FIXTURE INVOICES — 6 months of realistic billing history
// =============================================================================

const FIXTURE_INVOICES: readonly FixtureInvoice[] = [
  {
    id: "in_fixture_006",
    number: "ACME-2026-006",
    amount_due: 9900,
    currency: "usd",
    status: "paid",
    hosted_invoice_url: "https://invoice.example.test/in_006",
    issued_at: "2026-04-01T00:00:00.000Z",
  },
  {
    id: "in_fixture_005",
    number: "ACME-2026-005",
    amount_due: 9900,
    currency: "usd",
    status: "paid",
    hosted_invoice_url: "https://invoice.example.test/in_005",
    issued_at: "2026-03-01T00:00:00.000Z",
  },
  {
    id: "in_fixture_004",
    number: "ACME-2026-004",
    amount_due: 9900,
    currency: "usd",
    status: "paid",
    hosted_invoice_url: "https://invoice.example.test/in_004",
    issued_at: "2026-02-01T00:00:00.000Z",
  },
  {
    id: "in_fixture_003",
    number: "ACME-2026-003",
    amount_due: 9900,
    currency: "usd",
    status: "paid",
    hosted_invoice_url: "https://invoice.example.test/in_003",
    issued_at: "2026-01-01T00:00:00.000Z",
  },
  {
    id: "in_fixture_002",
    number: "ACME-2025-012",
    amount_due: 9900,
    currency: "usd",
    status: "paid",
    hosted_invoice_url: "https://invoice.example.test/in_002",
    issued_at: "2025-12-01T00:00:00.000Z",
  },
  {
    id: "in_fixture_001",
    number: "ACME-2025-011",
    amount_due: 0,
    currency: "usd",
    status: "paid",
    hosted_invoice_url: "https://invoice.example.test/in_001",
    issued_at: "2025-11-01T00:00:00.000Z",
  },
];
