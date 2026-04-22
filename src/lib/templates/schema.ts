import { z } from "zod";

/**
 * Template schema for workflow templates.
 *
 * A Template is the declarative recipe for a workflow — its fields, its expected
 * output, its n8n node-type mapping. Users pick a template, fill in a Config,
 * and the app materializes a WorkflowVersion by applying Config to Template.
 *
 * Templates are GLOBAL (not org-scoped). The fixture library ships 5 canonical
 * automations; enterprise customers will get a private template registry in Phase 7.
 */

// =============================================================================
// FIELD TYPES
// =============================================================================

const textFieldSchema = z.object({
  kind: z.enum(["text", "email", "url"]),
  name: z.string().regex(/^[a-z][a-z0-9_]*$/, "field name must be snake_case"),
  label: z.string().min(1).max(80),
  description: z.string().max(240).optional(),
  placeholder: z.string().max(120).optional(),
  required: z.boolean().default(false),
  minLength: z.number().int().min(0).max(10_000).optional(),
  maxLength: z.number().int().min(1).max(10_000).optional(),
  defaultValue: z.string().optional(),
});

const numberFieldSchema = z.object({
  kind: z.literal("number"),
  name: z.string().regex(/^[a-z][a-z0-9_]*$/),
  label: z.string().min(1).max(80),
  description: z.string().max(240).optional(),
  required: z.boolean().default(false),
  min: z.number().optional(),
  max: z.number().optional(),
  defaultValue: z.number().optional(),
});

const booleanFieldSchema = z.object({
  kind: z.literal("boolean"),
  name: z.string().regex(/^[a-z][a-z0-9_]*$/),
  label: z.string().min(1).max(80),
  description: z.string().max(240).optional(),
  defaultValue: z.boolean().default(false),
});

const selectFieldSchema = z.object({
  kind: z.literal("select"),
  name: z.string().regex(/^[a-z][a-z0-9_]*$/),
  label: z.string().min(1).max(80),
  description: z.string().max(240).optional(),
  required: z.boolean().default(false),
  options: z
    .array(
      z.object({
        value: z.string().min(1),
        label: z.string().min(1),
      }),
    )
    .min(1)
    .max(100),
  defaultValue: z.string().optional(),
});

/**
 * Secret fields store tokens/API keys. The validator masks these in error
 * messages and the UI shows a reveal toggle. Server-side they are encrypted
 * at rest before persisting to workflow_versions.config (Phase 5+).
 */
const secretFieldSchema = z.object({
  kind: z.literal("secret"),
  name: z.string().regex(/^[a-z][a-z0-9_]*$/),
  label: z.string().min(1).max(80),
  description: z.string().max(240).optional(),
  required: z.boolean().default(true),
  // Explicit marker so validator/renderer never accidentally echo the value.
  sensitive: z.literal(true).default(true),
});

export const configFieldSchema = z.discriminatedUnion("kind", [
  textFieldSchema,
  numberFieldSchema,
  booleanFieldSchema,
  selectFieldSchema,
  secretFieldSchema,
]);

export type ConfigField = z.infer<typeof configFieldSchema>;

// =============================================================================
// TEMPLATE
// =============================================================================

export const templateCategorySchema = z.enum([
  "ingestion",
  "notifications",
  "reporting",
  "data-ops",
  "integrations",
]);

export type TemplateCategory = z.infer<typeof templateCategorySchema>;

export const templateSchema = z.object({
  slug: z.string().regex(/^[a-z][a-z0-9-]{1,62}[a-z0-9]$/, "slug must be kebab-case, 3-64 chars"),
  name: z.string().min(1).max(80),
  description: z.string().min(1).max(400),
  category: templateCategorySchema,
  icon: z.string().min(1), // lucide icon name
  /** Template schema version. Config rows pin against this via template_version. */
  version: z.string().regex(/^\d+\.\d+\.\d+$/, "semver x.y.z"),
  /** Marks older versions of a template as frozen (new workflows use latest). */
  deprecated: z.boolean().default(false),
  fields: z.array(configFieldSchema).min(1).max(20),
  /** Short description of what runs when this workflow fires. Shown in preview pane. */
  summary: z.string().min(1).max(400),
  /** Ordered list of steps the workflow will execute, for preview display. */
  steps: z.array(z.string().min(1).max(120)).min(1).max(12),
});

export type Template = z.infer<typeof templateSchema>;

/** Distinct identity for a concrete (template_slug + version) pair. */
export type TemplateVersionKey = {
  slug: Template["slug"];
  version: Template["version"];
};

// =============================================================================
// VALIDATION HELPERS
// =============================================================================

/**
 * Parses an unknown value into a Template, throwing on invalid input.
 * Use at the trust boundary (migration loader, admin upload).
 */
export function parseTemplate(input: unknown): Template {
  return templateSchema.parse(input);
}

export function isTemplate(input: unknown): input is Template {
  return templateSchema.safeParse(input).success;
}
