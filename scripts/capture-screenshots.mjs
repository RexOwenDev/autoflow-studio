#!/usr/bin/env node
/**
 * Capture marketing/portfolio screenshots of fixture-mode AutoFlow Studio.
 *
 * Prereqs: dev server running at localhost:3000 (`APP_MODE=fixture npm run dev`).
 * Run:     node scripts/capture-screenshots.mjs
 */

import { chromium } from "playwright";
import { mkdir } from "node:fs/promises";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = dirname(dirname(fileURLToPath(import.meta.url)));
const OUT = join(ROOT, "docs", "screenshots");

const PAGES = [
  { path: "/dashboard", name: "01-dashboard", label: "Dashboard" },
  { path: "/executions", name: "02-executions", label: "Executions list" },
  { path: "/executions/ee000000000-lead-0000-0000-000000000000", name: "03-execution-detail", label: "Execution detail" },
  { path: "/templates", name: "04-templates-gallery", label: "Templates gallery" },
  { path: "/templates/slack-notifier", name: "05-template-detail", label: "Template detail" },
  { path: "/workflows/new?template=slack-notifier", name: "06-workflow-config", label: "Workflow configure" },
  { path: "/settings/members", name: "07-members", label: "Members" },
  { path: "/settings/billing", name: "08-billing", label: "Billing" },
  { path: "/settings/sso", name: "09-sso", label: "SSO (Enterprise gate)" },
  { path: "/settings/audit", name: "10-audit-export", label: "Audit export" },
  { path: "/audit", name: "11-audit-log", label: "Audit log timeline" },
  { path: "/pricing", name: "12-pricing", label: "Pricing (public)" },
  { path: "/auth/sign-in", name: "13-sign-in", label: "Sign-in" },
];

const BASE_URL = process.env.BASE_URL ?? "http://localhost:3000";
const VIEWPORT = { width: 1440, height: 900 };

await mkdir(OUT, { recursive: true });

const browser = await chromium.launch();
const context = await browser.newContext({
  viewport: VIEWPORT,
  deviceScaleFactor: 2, // retina-quality output
  colorScheme: "dark",
});
const page = await context.newPage();

let ok = 0;
let failed = 0;

for (const p of PAGES) {
  const url = `${BASE_URL}${p.path}`;
  const out = join(OUT, `${p.name}.png`);
  try {
    const response = await page.goto(url, { waitUntil: "networkidle", timeout: 15_000 });
    const status = response?.status() ?? 0;
    // Small render settle delay for any hydration.
    await page.waitForTimeout(400);
    await page.screenshot({ path: out, fullPage: false });
    console.log(`✓ [${status}] ${p.label.padEnd(26)} → ${p.name}.png`);
    ok++;
  } catch (err) {
    console.error(`✗ ${p.label.padEnd(26)} → ${err.message}`);
    failed++;
  }
}

await browser.close();
console.log(`\nDone: ${ok} captured, ${failed} failed. Output: ${OUT}`);
process.exit(failed === 0 ? 0 : 1);
