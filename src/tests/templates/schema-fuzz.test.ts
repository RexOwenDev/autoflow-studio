/**
 * Template schema fuzz tests.
 *
 * These tests feed malformed / adversarial input to parseTemplate and
 * validateTemplateConfig to prove:
 *   - Bad input fails gracefully with typed errors (never throws at the caller)
 *   - Prototype pollution attempts (__proto__, constructor) are stripped
 *   - Secret field values never appear in error messages
 *   - Unknown config keys are ignored
 *   - Oversized / over-length inputs are rejected
 *   - Required fields are enforced
 *   - Select values are constrained to declared options
 */

import { describe, expect, it } from "vitest";
import { FIXTURE_TEMPLATES } from "@/lib/templates/fixtures";
import { parseTemplate } from "@/lib/templates/schema";
import { validateTemplateConfig } from "@/lib/templates/validator";

const leadCapture = FIXTURE_TEMPLATES.find((t) => t.slug === "lead-capture");
if (!leadCapture) throw new Error("lead-capture fixture missing");

const slackNotifier = FIXTURE_TEMPLATES.find((t) => t.slug === "slack-notifier");
if (!slackNotifier) throw new Error("slack-notifier fixture missing");

describe("parseTemplate — adversarial template input", () => {
  it("rejects null", () => {
    expect(() => parseTemplate(null)).toThrow();
  });

  it("rejects empty object", () => {
    expect(() => parseTemplate({})).toThrow();
  });

  it("rejects slug with uppercase", () => {
    expect(() =>
      parseTemplate({
        ...leadCapture,
        slug: "Lead-Capture",
      }),
    ).toThrow();
  });

  it("rejects slug with trailing hyphen", () => {
    expect(() =>
      parseTemplate({
        ...leadCapture,
        slug: "lead-capture-",
      }),
    ).toThrow();
  });

  it("rejects non-semver version", () => {
    expect(() =>
      parseTemplate({
        ...leadCapture,
        version: "1.0",
      }),
    ).toThrow();
    expect(() =>
      parseTemplate({
        ...leadCapture,
        version: "v1.0.0",
      }),
    ).toThrow();
  });

  it("rejects field with non-snake-case name", () => {
    expect(() =>
      parseTemplate({
        ...leadCapture,
        fields: [
          {
            kind: "text",
            name: "HubSpotPortalId",
            label: "x",
            required: true,
          },
        ],
      }),
    ).toThrow();
  });

  it("rejects field with leading digit in name", () => {
    expect(() =>
      parseTemplate({
        ...leadCapture,
        fields: [{ kind: "text", name: "1field", label: "x", required: true }],
      }),
    ).toThrow();
  });

  it("rejects select with empty options", () => {
    expect(() =>
      parseTemplate({
        ...leadCapture,
        fields: [{ kind: "select", name: "foo", label: "Foo", options: [] }],
      }),
    ).toThrow();
  });

  it("rejects template with 0 fields", () => {
    expect(() =>
      parseTemplate({
        ...leadCapture,
        fields: [],
      }),
    ).toThrow();
  });

  it("rejects template with 21 fields", () => {
    expect(() =>
      parseTemplate({
        ...leadCapture,
        fields: Array.from({ length: 21 }, (_, i) => ({
          kind: "text" as const,
          name: `field_${i}`,
          label: `Field ${i}`,
          required: false,
        })),
      }),
    ).toThrow();
  });

  it("accepts a minimal valid template", () => {
    expect(() =>
      parseTemplate({
        slug: "minimal",
        name: "Minimal",
        description: "A minimal template",
        summary: "Does one thing",
        category: "integrations",
        icon: "Zap",
        version: "0.1.0",
        deprecated: false,
        fields: [{ kind: "text", name: "foo", label: "Foo", required: true }],
        steps: ["Do the thing"],
      }),
    ).not.toThrow();
  });
});

describe("validateTemplateConfig — adversarial config input", () => {
  it("rejects null", () => {
    const r = validateTemplateConfig(leadCapture, null);
    expect(r.ok).toBe(false);
  });

  it("rejects array", () => {
    const r = validateTemplateConfig(leadCapture, []);
    expect(r.ok).toBe(false);
  });

  it("rejects primitive", () => {
    const r = validateTemplateConfig(leadCapture, "string");
    expect(r.ok).toBe(false);
    const r2 = validateTemplateConfig(leadCapture, 42);
    expect(r2.ok).toBe(false);
  });

  it("strips __proto__ pollution attempt", () => {
    const poisoned: Record<string, unknown> = {
      hubspot_portal_id: "123456",
      slack_channel: "#sales",
      enable_enrichment: true,
    };
    // Simulate a payload that tries to alter Object.prototype.
    Object.defineProperty(poisoned, "__proto__", {
      value: { polluted: true },
      enumerable: true,
    });

    const r = validateTemplateConfig(leadCapture, poisoned);
    // After validation, Object.prototype must NOT have been modified.
    expect((Object.prototype as unknown as { polluted?: boolean }).polluted).toBeUndefined();
    // The config must still have passed because the known fields are valid.
    expect(r.ok).toBe(true);
  });

  it("strips constructor pollution attempt", () => {
    const poisoned: Record<string, unknown> = {
      hubspot_portal_id: "123456",
      slack_channel: "#sales",
      constructor: { prototype: { polluted: true } },
    };
    const r = validateTemplateConfig(leadCapture, poisoned);
    expect(r.ok).toBe(true);
    if (r.ok) {
      // Use Object.hasOwn — `in` walks the prototype chain and matches
      // Object.prototype.constructor even when we stripped it.
      expect(Object.hasOwn(r.config, "constructor")).toBe(false);
    }
  });

  it("ignores unknown fields (not present in template)", () => {
    const r = validateTemplateConfig(leadCapture, {
      hubspot_portal_id: "123456",
      slack_channel: "#sales",
      enable_enrichment: true,
      extra_field: "should be dropped",
      another_extra: 42,
    });
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(Object.hasOwn(r.config, "extra_field")).toBe(false);
      expect(Object.hasOwn(r.config, "another_extra")).toBe(false);
    }
  });

  it("rejects select value not in declared options", () => {
    const r = validateTemplateConfig(leadCapture, {
      hubspot_portal_id: "123456",
      slack_channel: "#random-channel-not-declared",
    });
    expect(r.ok).toBe(false);
    if (!r.ok) {
      expect(r.errors.some((e) => e.field === "slack_channel")).toBe(true);
    }
  });

  it("rejects text field below minLength", () => {
    const r = validateTemplateConfig(leadCapture, {
      hubspot_portal_id: "ab", // min 3
      slack_channel: "#sales",
    });
    expect(r.ok).toBe(false);
    if (!r.ok) {
      expect(r.errors.some((e) => e.field === "hubspot_portal_id")).toBe(true);
    }
  });

  it("rejects text field above maxLength", () => {
    const r = validateTemplateConfig(leadCapture, {
      hubspot_portal_id: "a".repeat(17), // max 16
      slack_channel: "#sales",
    });
    expect(r.ok).toBe(false);
  });

  it("rejects missing required field", () => {
    const r = validateTemplateConfig(leadCapture, {
      slack_channel: "#sales",
      // hubspot_portal_id omitted
    });
    expect(r.ok).toBe(false);
    if (!r.ok) {
      expect(r.errors.some((e) => e.field === "hubspot_portal_id")).toBe(true);
    }
  });

  it("NEVER echoes a secret value in error messages", () => {
    const pwMarker = "SUPER_SECRET_TOKEN_abc123_xyz";

    // Build a config where the secret is provided but other fields are bad.
    const r = validateTemplateConfig(slackNotifier, {
      slack_webhook_url: pwMarker,
      // message_template is missing (required)
    });

    expect(r.ok).toBe(false);
    if (!r.ok) {
      for (const err of r.errors) {
        expect(err.message).not.toContain(pwMarker);
      }
    }
  });

  it("NEVER includes the secret value even if it fails its own validation", () => {
    const pwMarker = "ANOTHER_SECRET_abc_def_ghi";

    // slack_webhook_url is required, provide empty → fails its own check.
    const r = validateTemplateConfig(slackNotifier, {
      slack_webhook_url: "",
      message_template: pwMarker, // non-secret field with the same marker
    });

    expect(r.ok).toBe(false);
    if (!r.ok) {
      const secretError = r.errors.find((e) => e.field === "slack_webhook_url");
      expect(secretError).toBeDefined();
      // secretError.message is generic ("required" or "invalid value") — never echoes.
      expect(secretError?.message).not.toContain(pwMarker);
      expect(secretError?.message.length).toBeLessThan(40);
    }
  });

  it("rejects oversized secret (> 4096 chars)", () => {
    const r = validateTemplateConfig(slackNotifier, {
      slack_webhook_url: "a".repeat(4097),
      message_template: "hi",
    });
    expect(r.ok).toBe(false);
  });

  it("coerces number field that arrived as string (if valid numeric string)", () => {
    // The VALIDATOR itself is strict — but the saveWorkflowConfig action coerces
    // numeric FormData values to Number before passing in. This test documents the
    // validator's strict boundary: only real numbers pass.
    const r = validateTemplateConfig(FIXTURE_TEMPLATES.find((t) => t.slug === "csv-to-sheets")!, {
      sheets_url: "https://docs.google.com/spreadsheets/d/abc/edit",
      sheet_tab: "Imports",
      service_account_json: "fake-json",
      batch_size: "100", // string — validator rejects
    });
    expect(r.ok).toBe(false);
  });

  it("accepts valid number in declared range", () => {
    const r = validateTemplateConfig(FIXTURE_TEMPLATES.find((t) => t.slug === "csv-to-sheets")!, {
      sheets_url: "https://docs.google.com/spreadsheets/d/abc/edit",
      sheet_tab: "Imports",
      service_account_json: "fake-json",
      batch_size: 100,
    });
    expect(r.ok).toBe(true);
  });

  it("rejects number below declared min", () => {
    const r = validateTemplateConfig(FIXTURE_TEMPLATES.find((t) => t.slug === "csv-to-sheets")!, {
      sheets_url: "https://docs.google.com/spreadsheets/d/abc/edit",
      sheet_tab: "Imports",
      service_account_json: "fake-json",
      batch_size: 0, // min is 1
    });
    expect(r.ok).toBe(false);
  });

  it("rejects invalid email format", () => {
    const r = validateTemplateConfig(
      FIXTURE_TEMPLATES.find((t) => t.slug === "webhook-to-email")!,
      {
        postmark_server_token: "fake-token",
        from_address: "not-an-email",
        to_address: "valid@example.com",
        subject_template: "hi",
        body_template: "<p>body</p>",
      },
    );
    expect(r.ok).toBe(false);
    if (!r.ok) {
      expect(r.errors.some((e) => e.field === "from_address")).toBe(true);
    }
  });

  it("rejects invalid URL", () => {
    const r = validateTemplateConfig(FIXTURE_TEMPLATES.find((t) => t.slug === "csv-to-sheets")!, {
      sheets_url: "not-a-url",
      sheet_tab: "Imports",
      service_account_json: "fake-json",
    });
    expect(r.ok).toBe(false);
  });

  it("accepts a fully valid config for every fixture template", () => {
    const validConfigs: Record<string, Record<string, string | number | boolean>> = {
      "lead-capture": {
        hubspot_portal_id: "12345678",
        slack_channel: "#sales",
        enable_enrichment: true,
        clearbit_api_key: "cb_test_abc",
      },
      "slack-notifier": {
        slack_webhook_url: "https://hooks.slack.com/services/T/B/xyz",
        message_template: "New: {{title}}",
        include_timestamp: true,
        color: "good",
      },
      "csv-to-sheets": {
        sheets_url: "https://docs.google.com/spreadsheets/d/abc/edit",
        sheet_tab: "Imports",
        service_account_json: '{"type":"service_account"}',
        batch_size: 100,
      },
      "webhook-to-email": {
        postmark_server_token: "tok_abc",
        from_address: "noreply@example.com",
        to_address: "user@example.com",
        subject_template: "Hello {{name}}",
        body_template: "<p>Hi {{name}}</p>",
      },
      "daily-digest": {
        schedule: "daily-09-utc",
        recipient_list: "a@x.com, b@x.com",
        include_revenue: true,
        include_pipeline: true,
        postmark_server_token: "tok_def",
      },
    };

    for (const template of FIXTURE_TEMPLATES) {
      const config = validConfigs[template.slug];
      expect(config, `no valid config fixture for ${template.slug}`).toBeDefined();
      const r = validateTemplateConfig(template, config ?? {});
      expect(r.ok, `valid config failed for ${template.slug}: ${JSON.stringify(r)}`).toBe(true);
    }
  });
});
