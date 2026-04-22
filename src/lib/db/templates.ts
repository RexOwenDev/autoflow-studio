import "server-only";
import { FIXTURE_TEMPLATES, findTemplate } from "@/lib/templates/fixtures";
import type { Template } from "@/lib/templates/schema";

/**
 * Server-only accessors for the template library.
 *
 * Phase 2 SupabaseAdapter owns org-scoped reads (executions, audit, billing).
 * Templates are global — they don't need the adapter; the fixture array IS the source
 * of truth for APP_MODE=fixture, and Phase 7 will swap this module to read from
 * `workflow_templates` via a direct `createServerClient` call (still server-only).
 */

export async function listTemplates(): Promise<readonly Template[]> {
  return FIXTURE_TEMPLATES.filter((t) => !t.deprecated);
}

export async function getTemplate(slug: string): Promise<Template | null> {
  return findTemplate(slug);
}
