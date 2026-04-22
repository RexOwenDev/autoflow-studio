import { z } from "zod";
import type { ConfigField, Template } from "./schema";

/**
 * Validates a user-submitted config against a template's field definitions.
 *
 * Guarantees:
 *   - Unknown fields are stripped (no prototype pollution via __proto__/constructor)
 *   - Required fields present
 *   - Types enforced (text/email/url/number/boolean/select/secret)
 *   - Secret values NEVER echoed in error messages
 *   - Select values constrained to the declared option set
 */

export interface ValidationError {
  field: string;
  message: string;
}

export type ValidationResult =
  | { ok: true; config: Record<string, string | number | boolean> }
  | { ok: false; errors: ValidationError[] };

// =============================================================================
// PER-FIELD SCHEMA BUILDER
// =============================================================================

function zodForField(field: ConfigField): z.ZodTypeAny {
  switch (field.kind) {
    case "text": {
      let s = z.string();
      if (field.minLength !== undefined) s = s.min(field.minLength);
      if (field.maxLength !== undefined) s = s.max(field.maxLength);
      return field.required ? s.min(1, "required") : s.optional().default("");
    }
    case "email": {
      const s = z
        .string()
        .email()
        .max(field.maxLength ?? 254);
      return field.required ? s : s.optional();
    }
    case "url": {
      const s = z
        .string()
        .url()
        .max(field.maxLength ?? 2048);
      return field.required ? s : s.optional();
    }
    case "number": {
      let s = z.number();
      if (field.min !== undefined) s = s.min(field.min);
      if (field.max !== undefined) s = s.max(field.max);
      return field.required ? s : s.optional();
    }
    case "boolean":
      // Missing boolean → fall back to the declared default (or false).
      return z.boolean().default(field.defaultValue);
    case "select": {
      const values = field.options.map((o) => o.value) as [string, ...string[]];
      const s = z.enum(values);
      return field.required ? s : s.optional();
    }
    case "secret": {
      // Secrets are 1-4096 chars; the validator MUST NOT include the value in errors.
      const s = z.string().min(1).max(4096);
      return field.required ? s : s.optional();
    }
  }
}

// =============================================================================
// TOP-LEVEL VALIDATION
// =============================================================================

const DANGEROUS_KEYS = new Set(["__proto__", "constructor", "prototype"]);

function sanitizeIncoming(input: unknown): Record<string, unknown> {
  if (input === null || typeof input !== "object" || Array.isArray(input)) {
    return {};
  }
  const out: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(input as Record<string, unknown>)) {
    if (DANGEROUS_KEYS.has(key)) continue;
    out[key] = value;
  }
  return out;
}

export function validateTemplateConfig(template: Template, input: unknown): ValidationResult {
  const incoming = sanitizeIncoming(input);
  const errors: ValidationError[] = [];
  const config: Record<string, string | number | boolean> = {};

  for (const field of template.fields) {
    const raw = incoming[field.name];
    const schema = zodForField(field);
    const result = schema.safeParse(raw);

    if (!result.success) {
      // Secret fields: scrub any hint that might include the attempted value.
      const message =
        field.kind === "secret"
          ? result.error.issues[0]?.code === "invalid_type"
            ? "required"
            : "invalid value"
          : (result.error.issues[0]?.message ?? "invalid value");
      errors.push({ field: field.name, message });
      continue;
    }

    const parsed = result.data as string | number | boolean | undefined;
    if (parsed !== undefined && parsed !== "") {
      config[field.name] = parsed;
    }
  }

  return errors.length > 0 ? { ok: false, errors } : { ok: true, config };
}
