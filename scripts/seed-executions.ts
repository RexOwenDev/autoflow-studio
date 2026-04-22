#!/usr/bin/env tsx
/**
 * Deterministic execution seed generator.
 *
 * Produces 100 varied executions + events for the Acme fixture org, spread over
 * the last 72 hours. Statuses, durations, and failure reasons are chosen from
 * a seeded PRNG so runs are reproducible across machines.
 *
 * In fixture mode this script is called to regenerate `src/lib/n8n/seed-output.ts`
 * which is imported by fixtures.ts. In live mode it would INSERT rows via
 * the Supabase service-role client (Phase 7 wiring).
 *
 * Run: pnpm seed:executions
 */

import { writeFileSync } from "node:fs";
import { join } from "node:path";
import type { Execution, ExecutionEvent, ExecutionStatus } from "../src/types/database";

const FIXTURE_ORG_A_ID = "11111111-1111-1111-1111-111111111111";
const FIXTURE_USER_ID = "00000000-0000-0000-0000-000000000001";
const FIXTURE_NOW = new Date("2026-04-22T12:00:00.000Z").getTime();

// 5 workflows from fixtures.ts
const WORKFLOW_IDS = [
  { id: "aaaa1111-1111-1111-1111-111111111111", slug: "lead-capture" },
  { id: "aaaa1111-2222-2222-2222-222222222222", slug: "slack-notifier" },
  { id: "aaaa1111-3333-3333-3333-333333333333", slug: "daily-digest" },
  { id: "aaaa1111-4444-4444-4444-444444444444", slug: "webhook-to-email" },
  { id: "aaaa1111-5555-5555-5555-555555555555", slug: "csv-to-sheets" },
] as const;

const STATUS_WEIGHTS: Array<[ExecutionStatus, number]> = [
  ["success", 75],
  ["failed", 15],
  ["retrying", 4],
  ["running", 3],
  ["queued", 2],
  ["cancelled", 1],
];

const FAILURE_MESSAGES: readonly string[] = [
  "SMTP timeout connecting to mail.acme.com:587",
  "HubSpot API returned 429 Too Many Requests",
  "Google Sheets API rate limit exceeded (quota exhausted)",
  "Postmark delivery bounced: recipient marked as spam",
  "Connection reset by peer during webhook POST",
  "Slack webhook URL returned 410 Gone",
  "Stripe event signature verification failed",
  "Template validation failed: missing required field 'email'",
];

const TRIGGER_SOURCES: readonly ["webhook", "schedule", "manual", "retry"] = [
  "webhook",
  "schedule",
  "manual",
  "retry",
];

// =============================================================================
// PRNG — mulberry32, seeded. Reproducible across runs.
// =============================================================================
function mulberry32(seed: number): () => number {
  let a = seed;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function pickWeighted<T>(rand: () => number, weights: Array<[T, number]>): T {
  const total = weights.reduce((s, [, w]) => s + w, 0);
  let r = rand() * total;
  for (const [value, w] of weights) {
    r -= w;
    if (r <= 0) return value;
  }
  return weights[weights.length - 1]![0];
}

function pickOne<T>(rand: () => number, arr: readonly T[]): T {
  // Non-empty array required — enforced by call sites below.
  return arr[Math.floor(rand() * arr.length)]!;
}

// =============================================================================
// GENERATION
// =============================================================================

interface GeneratedSet {
  executions: Execution[];
  events: ExecutionEvent[];
}

export function generateExecutions(count: number, seed = 42): GeneratedSet {
  const rand = mulberry32(seed);
  const executions: Execution[] = [];
  const events: ExecutionEvent[] = [];

  for (let i = 0; i < count; i++) {
    const status = pickWeighted(rand, STATUS_WEIGHTS);
    const workflow = pickOne(rand, WORKFLOW_IDS);
    const trigger = pickOne(rand, TRIGGER_SOURCES);

    // Spread over 72 hours, most recent runs clustered in the last 6 hours.
    const recencyBucket = rand();
    const ageSeconds =
      recencyBucket < 0.4
        ? Math.floor(rand() * 6 * 3600) // 40% in last 6h
        : recencyBucket < 0.7
          ? Math.floor(rand() * 24 * 3600) // 30% in 0-24h
          : Math.floor(rand() * 72 * 3600); // 30% in 0-72h

    const startMs = FIXTURE_NOW - ageSeconds * 1000;
    const started = new Date(startMs).toISOString();
    const duration =
      status === "queued" || status === "running" ? null : Math.floor(200 + rand() * 5000); // 200ms - 5.2s

    const finishedMs = duration !== null ? startMs + duration : null;
    const finished = finishedMs ? new Date(finishedMs).toISOString() : null;

    const idempotencyKey =
      trigger === "webhook" ? `n8n_${workflow.slug}_${i.toString().padStart(4, "0")}` : null;

    const errorMessage =
      status === "failed" || status === "retrying" ? pickOne(rand, FAILURE_MESSAGES) : null;

    const execId =
      `ee${i.toString().padStart(6, "0")}-${workflow.slug.slice(0, 4)}-0000-0000-000000000000`.slice(
        0,
        36,
      );
    // Ensure valid UUID shape with 8-4-4-4-12 hex digits only.
    const safeExecId = `ee${i.toString(16).padStart(6, "0")}0000-${workflow.slug
      .replace(/[^a-f0-9]/g, "a")
      .slice(0, 4)
      .padStart(4, "a")}-0000-0000-000000000000`;

    executions.push({
      id: safeExecId,
      organization_id: FIXTURE_ORG_A_ID,
      workflow_id: workflow.id,
      workflow_version_id: null,
      status,
      trigger_source: trigger,
      idempotency_key: idempotencyKey,
      started_at: started,
      finished_at: finished,
      duration_ms: duration,
      error_message: errorMessage,
      created_at: started,
    });

    // Event timeline per execution (minimal: started + terminal)
    events.push({
      id: `evt-${i.toString().padStart(4, "0")}-a`,
      execution_id: safeExecId,
      organization_id: FIXTURE_ORG_A_ID,
      kind: "started",
      node_id: null,
      payload: {},
      occurred_at: started,
    });

    if (status === "success" && finished) {
      events.push({
        id: `evt-${i.toString().padStart(4, "0")}-b`,
        execution_id: safeExecId,
        organization_id: FIXTURE_ORG_A_ID,
        kind: "succeeded",
        node_id: null,
        payload: {},
        occurred_at: finished,
      });
    } else if (status === "failed" && finished && errorMessage) {
      events.push({
        id: `evt-${i.toString().padStart(4, "0")}-b`,
        execution_id: safeExecId,
        organization_id: FIXTURE_ORG_A_ID,
        kind: "failed",
        node_id: null,
        payload: { error: errorMessage },
        occurred_at: finished,
      });
    } else if (status === "retrying" && finished) {
      events.push({
        id: `evt-${i.toString().padStart(4, "0")}-b`,
        execution_id: safeExecId,
        organization_id: FIXTURE_ORG_A_ID,
        kind: "retry_scheduled",
        node_id: null,
        payload: { attempt: 1 },
        occurred_at: finished,
      });
    }
  }

  // Sort by started_at desc so the dashboard renders newest-first without extra work.
  executions.sort((a, b) => (b.started_at ?? "").localeCompare(a.started_at ?? ""));
  return { executions, events };
}

function writeOutput(set: GeneratedSet) {
  const outPath = join(__dirname, "..", "src", "lib", "n8n", "seed-executions.ts");
  const body = `// GENERATED by scripts/seed-executions.ts — do not edit by hand.
// Regenerate with: pnpm seed:executions
import type { Execution, ExecutionEvent } from "@/types/database";

export const GENERATED_EXECUTIONS: readonly Execution[] = ${JSON.stringify(set.executions, null, 2)};

export const GENERATED_EXECUTION_EVENTS: readonly ExecutionEvent[] = ${JSON.stringify(set.events, null, 2)};
`;
  writeFileSync(outPath, body, "utf8");
  // biome-ignore lint/suspicious/noConsole: CLI tool intentional output
  console.log(
    `wrote ${set.executions.length} executions + ${set.events.length} events → ${outPath}`,
  );
}

// Only run when invoked directly (not when imported by tests).
if (require.main === module) {
  const set = generateExecutions(100, 42);
  writeOutput(set);
}
