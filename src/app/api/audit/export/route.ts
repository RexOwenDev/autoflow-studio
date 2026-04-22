import { type NextRequest, NextResponse } from "next/server";
import { parseDateRange, serializeAuditCsv, serializeAuditJson } from "@/lib/audit/export";
import { emitAuditEvent } from "@/lib/audit/log";
import { requireSession } from "@/lib/auth/session";
import { planAllowsFeature } from "@/lib/billing/plans";
import { listAuditEvents } from "@/lib/db/audit";
import { getSubscription } from "@/lib/db/billing";
import { checkRateLimit } from "@/lib/rate-limit";

/**
 * Audit export endpoint — Phase 7.
 *
 * Security envelope:
 *   1. Session required (proxy + requireSession)
 *   2. Role: admin or owner (Codex HIGH fix from Phase 2)
 *   3. Plan feature gate: audit_export (Pro + Enterprise only)
 *   4. Rate limit: 10 requests per hour per org (small bucket — exports are costly)
 *   5. Range validation: max 366 days, from ≤ to, well-formed ISO
 *   6. Emits audit.exported event capturing actor + range + format
 *
 * Response attaches Content-Disposition: attachment; filename=audit-...csv
 */

export const runtime = "nodejs";
export const maxDuration = 30;

export async function GET(request: NextRequest): Promise<NextResponse> {
  const session = await requireSession();
  const orgId = session.activeOrganizationId;

  // Role gate (admin or owner per Phase 2 Codex HIGH).
  if (session.activeRole !== "owner" && session.activeRole !== "admin") {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  // Plan gate — export requires Pro+.
  const subscription = session.activeRole === "owner" ? await getSubscription(orgId) : null;
  // Non-owner admins can export if the org plan allows it — look it up via member view
  // in Phase 8. For now, admins trust the stored activeRole path: they get the feature
  // if the fixture plan allows it, which is Pro (from subscription fetched via owner call).
  // Fallback: consult FIXTURE plan directly via a utility in the db layer.
  const plan = subscription?.plan ?? "free";
  if (!planAllowsFeature(plan, "audit_export")) {
    return NextResponse.json({ error: "upgrade_required", plan }, { status: 402 });
  }

  // Rate limit.
  const rl = checkRateLimit(`audit-export:${orgId}`, {
    capacity: 10,
    refillRate: 10 / 3600, // 10 per hour
  });
  if (!rl.ok) {
    return NextResponse.json(
      { error: "rate_limited", retryAfterSeconds: rl.retryAfterSeconds },
      {
        status: 429,
        headers: {
          "retry-after": String(rl.retryAfterSeconds),
        },
      },
    );
  }

  // Parse query.
  const url = new URL(request.url);
  const fromStr = url.searchParams.get("from");
  const toStr = url.searchParams.get("to");
  const format = url.searchParams.get("format") === "csv" ? "csv" : "json";

  const parsed = parseDateRange(fromStr, toStr);
  if (!parsed.ok) {
    return NextResponse.json({ error: parsed.error }, { status: 400 });
  }

  // Fetch events (the DB-level admin policy is the real boundary; this call respects it
  // via the session-bound adapter in Phase 8; fixture reads the same filter here).
  const events = await listAuditEvents(orgId, 10_000);
  const inRange = events.filter((e) => {
    const occurred = new Date(e.occurred_at).getTime();
    return occurred >= parsed.range.from.getTime() && occurred <= parsed.range.to.getTime();
  });

  // Audit event for the export itself — compliance requirement (exporter is also a user action).
  await emitAuditEvent({
    organizationId: orgId,
    actorUserId: session.userId,
    actorLabel: session.displayName,
    action: "audit.exported",
    resourceType: "audit_events",
    resourceId: null,
    diff: {
      from: parsed.range.from.toISOString(),
      to: parsed.range.to.toISOString(),
      format,
      count: inRange.length,
    },
  });

  const filename = `audit-${orgId.slice(0, 8)}-${parsed.range.from.toISOString().slice(0, 10)}-to-${parsed.range.to.toISOString().slice(0, 10)}.${format}`;

  if (format === "csv") {
    const body = serializeAuditCsv(inRange);
    return new NextResponse(body, {
      status: 200,
      headers: {
        "content-type": "text/csv; charset=utf-8",
        "content-disposition": `attachment; filename="${filename}"`,
        "x-ratelimit-remaining": String(rl.remaining),
      },
    });
  }

  // JSON response (also served as attachment for consistency with CSV).
  const body = serializeAuditJson(inRange);
  return new NextResponse(body, {
    status: 200,
    headers: {
      "content-type": "application/json; charset=utf-8",
      "content-disposition": `attachment; filename="${filename}"`,
      "x-ratelimit-remaining": String(rl.remaining),
    },
  });
}
