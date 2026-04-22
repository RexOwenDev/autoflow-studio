/**
 * Audit export serializer + date-range tests.
 *
 * Coverage:
 *   - CSV injection defense: cells starting with = + - @ TAB CR are prefixed with '
 *   - CSV quoting: commas, quotes, newlines are escaped per RFC 4180
 *   - JSON shape: events array, fields match AuditEvent
 *   - Date range: ISO validation, from ≤ to, ≤ 366-day ceiling
 */

import { describe, expect, it } from "vitest";
import { parseDateRange, serializeAuditCsv, serializeAuditJson } from "@/lib/audit/export";
import type { AuditEvent } from "@/types/database";

const sampleEvent: AuditEvent = {
  id: "au-test-001",
  organization_id: "11111111-1111-1111-1111-111111111111",
  actor_user_id: "00000000-0000-0000-0000-000000000001",
  actor_label: "Rex Quintenta",
  action: "workflow.created",
  resource_type: "workflow",
  resource_id: "aaaa1111-1111-1111-1111-111111111111",
  diff: { name: "New workflow" },
  ip_address: "203.0.113.1",
  user_agent: "Mozilla/5.0",
  occurred_at: "2026-04-22T10:00:00.000Z",
};

describe("serializeAuditCsv — injection defense", () => {
  it("prefixes cell starting with = with a single quote", () => {
    const malicious: AuditEvent = {
      ...sampleEvent,
      actor_label: "=SUM(A1:A100)",
    };
    const csv = serializeAuditCsv([malicious]);
    // Value no longer starts with = so Excel won't interpret as formula. Value does NOT
    // need CSV quoting because `'=SUM(A1:A100)` has no comma/quote/newline.
    expect(csv).toContain(",'=SUM(A1:A100),");
  });

  it.each([
    ["=1+1", "'"],
    ["+1+1", "'"],
    ["-1+1", "'"],
    ["@SUM(A1:A10)", "'"],
    ["\tmalicious", "'"],
    ["\rmalicious", "'"],
  ])("prefixes dangerous cell %s", (payload, expectedPrefix) => {
    const malicious: AuditEvent = { ...sampleEvent, actor_label: payload };
    const csv = serializeAuditCsv([malicious]);
    // Extract the actor column value — it's column 2 (0-indexed: 1). Just check prefix.
    expect(csv).toContain(expectedPrefix + payload);
  });

  it("escapes commas and quotes per RFC 4180", () => {
    const tricky: AuditEvent = {
      ...sampleEvent,
      actor_label: 'Rex, "Quint"',
    };
    const csv = serializeAuditCsv([tricky]);
    expect(csv).toContain('"Rex, ""Quint"""');
  });

  it("includes header row with stable column names", () => {
    const csv = serializeAuditCsv([sampleEvent]);
    const header = csv.split("\n")[0] ?? "";
    expect(header).toBe(
      "occurred_at,actor,actor_user_id,action,resource_type,resource_id,ip_address,user_agent,diff_json",
    );
  });

  it("serializes JSONB diff as stringified JSON in the diff column", () => {
    const csv = serializeAuditCsv([sampleEvent]);
    // Diff JSON contains `:` and `"` so it should be quoted and escaped.
    expect(csv).toContain('"{""name"":""New workflow""}"');
  });

  it("emits empty string for null values", () => {
    const withNulls: AuditEvent = {
      ...sampleEvent,
      actor_user_id: null,
      actor_label: null,
      resource_id: null,
      ip_address: null,
      user_agent: null,
    };
    const csv = serializeAuditCsv([withNulls]);
    const dataRow = csv.split("\n")[1] ?? "";
    // Actor column is index 1 — empty between the occurred_at and the actor_user_id.
    const cells = dataRow.split(",");
    expect(cells[1]).toBe("");
    expect(cells[2]).toBe("");
  });

  it("handles empty event list — just header", () => {
    const csv = serializeAuditCsv([]);
    expect(csv.split("\n")).toHaveLength(1);
  });
});

describe("serializeAuditJson", () => {
  it("emits a pretty-printed JSON array", () => {
    const json = serializeAuditJson([sampleEvent]);
    const parsed = JSON.parse(json);
    expect(Array.isArray(parsed)).toBe(true);
    expect(parsed).toHaveLength(1);
    expect(parsed[0].action).toBe("workflow.created");
  });

  it("preserves diff as an object (not stringified)", () => {
    const json = serializeAuditJson([sampleEvent]);
    const parsed = JSON.parse(json);
    expect(parsed[0].diff).toEqual({ name: "New workflow" });
  });

  it("empty array serializes to []", () => {
    expect(serializeAuditJson([])).toBe("[]");
  });
});

describe("parseDateRange", () => {
  it("defaults to last 30 days when no params", () => {
    const r = parseDateRange(null, null);
    expect(r.ok).toBe(true);
    if (r.ok) {
      const days = (r.range.to.getTime() - r.range.from.getTime()) / (24 * 3_600_000);
      expect(days).toBeCloseTo(30, 0);
    }
  });

  it("accepts valid ISO strings", () => {
    const r = parseDateRange("2026-01-01T00:00:00Z", "2026-01-31T23:59:59Z");
    expect(r.ok).toBe(true);
  });

  it("rejects malformed from date", () => {
    const r = parseDateRange("not-a-date", "2026-01-31T00:00:00Z");
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error).toBe("invalid_date_format");
  });

  it("rejects malformed to date", () => {
    const r = parseDateRange("2026-01-01T00:00:00Z", "nope");
    expect(r.ok).toBe(false);
  });

  it("rejects from > to", () => {
    const r = parseDateRange("2026-02-01T00:00:00Z", "2026-01-01T00:00:00Z");
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error).toBe("from_after_to");
  });

  it("rejects range > 366 days", () => {
    const r = parseDateRange("2024-01-01T00:00:00Z", "2026-01-01T00:00:00Z");
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error).toBe("range_too_large");
  });

  it("accepts exactly 366 days", () => {
    const r = parseDateRange("2026-01-01T00:00:00Z", "2027-01-02T00:00:00Z");
    expect(r.ok).toBe(true);
  });
});
