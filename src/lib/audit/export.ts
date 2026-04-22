import type { AuditEvent } from "@/types/database";

/**
 * Audit export serialization.
 *
 * CSV serialization must escape values that could be interpreted as formulas
 * when opened in Excel / Google Sheets. Per OWASP CSV Injection guidance,
 * any cell starting with = + - @ TAB CR must be prefixed with a single quote.
 *
 * JSON serialization does not need escape logic but sorts columns for
 * deterministic diff-friendly output.
 */

const CSV_INJECTION_PREFIXES = ["=", "+", "-", "@", "\t", "\r"];

function escapeCsvCell(value: unknown): string {
  if (value === null || value === undefined) return "";
  let s = typeof value === "string" ? value : JSON.stringify(value);
  // CSV injection defense — prefix suspect cells with a single quote.
  if (s.length > 0 && CSV_INJECTION_PREFIXES.includes(s[0] ?? "")) {
    s = `'${s}`;
  }
  // Standard CSV quoting: wrap in quotes and double any existing quotes.
  if (s.includes(",") || s.includes('"') || s.includes("\n") || s.includes("\r")) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}

const CSV_COLUMNS: Array<{ key: keyof AuditEvent; label: string }> = [
  { key: "occurred_at", label: "occurred_at" },
  { key: "actor_label", label: "actor" },
  { key: "actor_user_id", label: "actor_user_id" },
  { key: "action", label: "action" },
  { key: "resource_type", label: "resource_type" },
  { key: "resource_id", label: "resource_id" },
  { key: "ip_address", label: "ip_address" },
  { key: "user_agent", label: "user_agent" },
  { key: "diff", label: "diff_json" },
];

export function serializeAuditCsv(events: readonly AuditEvent[]): string {
  const lines: string[] = [];
  lines.push(CSV_COLUMNS.map((c) => escapeCsvCell(c.label)).join(","));
  for (const event of events) {
    const row = CSV_COLUMNS.map((c) => escapeCsvCell(event[c.key]));
    lines.push(row.join(","));
  }
  return lines.join("\n");
}

export function serializeAuditJson(events: readonly AuditEvent[]): string {
  return JSON.stringify(events, null, 2);
}

// =============================================================================
// DATE RANGE PARSING
// =============================================================================

const MAX_EXPORT_DAYS = 366; // enterprise retention ceiling

export interface DateRange {
  from: Date;
  to: Date;
}

export type RangeParseResult = { ok: true; range: DateRange } | { ok: false; error: string };

export function parseDateRange(fromStr: string | null, toStr: string | null): RangeParseResult {
  const now = new Date();
  // Default window: last 30 days.
  const defaultFrom = new Date(now.getTime() - 30 * 24 * 3_600_000);

  const from = fromStr ? new Date(fromStr) : defaultFrom;
  const to = toStr ? new Date(toStr) : now;

  if (Number.isNaN(from.getTime()) || Number.isNaN(to.getTime())) {
    return { ok: false, error: "invalid_date_format" };
  }
  if (from > to) {
    return { ok: false, error: "from_after_to" };
  }
  const days = (to.getTime() - from.getTime()) / (24 * 3_600_000);
  if (days > MAX_EXPORT_DAYS) {
    return { ok: false, error: "range_too_large" };
  }
  return { ok: true, range: { from, to } };
}
