import "server-only";
import type { Template } from "./schema";

/**
 * In-memory fixtures for APP_MODE=fixture.
 * Mirrors the seed rows in supabase/migrations/008_template_seeds.sql exactly
 * so the dashboard and the DB agree at runtime.
 */

export const FIXTURE_TEMPLATES: readonly Template[] = [
  {
    slug: "lead-capture",
    name: "Lead Capture",
    description: "Pipe HubSpot form submissions into Slack with optional CRM enrichment.",
    summary:
      "Triggered when a HubSpot form is submitted. Enriches the lead with Clearbit firmographic data, then posts a formatted alert to Slack #sales and creates a task in your CRM.",
    category: "ingestion",
    icon: "FormInput",
    version: "1.0.0",
    deprecated: false,
    fields: [
      {
        kind: "text",
        name: "hubspot_portal_id",
        label: "HubSpot Portal ID",
        description: "Found in your HubSpot account settings.",
        required: true,
        minLength: 3,
        maxLength: 16,
      },
      {
        kind: "select",
        name: "slack_channel",
        label: "Slack channel",
        required: true,
        options: [
          { value: "#sales", label: "#sales" },
          { value: "#revenue", label: "#revenue" },
          { value: "#marketing-leads", label: "#marketing-leads" },
        ],
      },
      {
        kind: "boolean",
        name: "enable_enrichment",
        label: "Enrich with Clearbit",
        description: "Requires a Clearbit API key.",
        defaultValue: true,
      },
      {
        kind: "secret",
        name: "clearbit_api_key",
        label: "Clearbit API key",
        required: false,
        sensitive: true,
      },
    ],
    steps: [
      "Receive HubSpot form webhook",
      "Enrich lead with Clearbit firmographics",
      "Post formatted alert to Slack",
      "Create follow-up task in CRM",
    ],
  },
  {
    slug: "slack-notifier",
    name: "Slack Notifier",
    description: "Post formatted messages to Slack for any upstream event.",
    summary:
      "A generic event → Slack relay. Accepts a webhook, renders a template, and posts to the configured channel. Perfect for Stripe invoices, deployment notifications, or CI failures.",
    category: "notifications",
    icon: "MessageSquare",
    version: "1.0.0",
    deprecated: false,
    fields: [
      {
        kind: "secret",
        name: "slack_webhook_url",
        label: "Slack incoming webhook URL",
        required: true,
        sensitive: true,
      },
      {
        kind: "text",
        name: "message_template",
        label: "Message template",
        description: "Use {{field}} syntax to reference event data.",
        required: true,
        maxLength: 2000,
        defaultValue: "New event: {{title}}",
      },
      {
        kind: "boolean",
        name: "include_timestamp",
        label: "Include timestamp",
        defaultValue: true,
      },
      {
        kind: "select",
        name: "color",
        label: "Attachment color",
        required: false,
        options: [
          { value: "good", label: "Green (good)" },
          { value: "warning", label: "Yellow (warning)" },
          { value: "danger", label: "Red (danger)" },
          { value: "default", label: "Default gray" },
        ],
        defaultValue: "good",
      },
    ],
    steps: [
      "Receive upstream webhook",
      "Render message template with event data",
      "POST to Slack via incoming webhook",
    ],
  },
  {
    slug: "csv-to-sheets",
    name: "CSV to Google Sheets",
    description: "Append rows from uploaded CSVs to a Google Sheets tab.",
    summary:
      "Triggered when a CSV is uploaded via the dashboard or API. Parses the file, validates the row shape against your header mapping, and appends rows to the configured Google Sheets tab.",
    category: "data-ops",
    icon: "Sheet",
    version: "1.0.0",
    deprecated: false,
    fields: [
      {
        kind: "url",
        name: "sheets_url",
        label: "Google Sheets URL",
        required: true,
      },
      {
        kind: "text",
        name: "sheet_tab",
        label: "Tab name",
        required: true,
        maxLength: 80,
        defaultValue: "Imports",
      },
      {
        kind: "secret",
        name: "service_account_json",
        label: "Service account JSON",
        required: true,
        sensitive: true,
      },
      {
        kind: "number",
        name: "batch_size",
        label: "Append batch size",
        required: false,
        min: 1,
        max: 1000,
        defaultValue: 100,
      },
    ],
    steps: [
      "Receive uploaded CSV",
      "Validate row shape against header mapping",
      "Append rows in batches to Google Sheets",
      "Report rows appended + skipped",
    ],
  },
  {
    slug: "webhook-to-email",
    name: "Webhook to Email",
    description: "Turn any webhook event into a transactional email.",
    summary:
      "A generic webhook → email relay using Postmark. Useful for sending customer receipts, onboarding emails, or internal ops alerts when an upstream event fires.",
    category: "notifications",
    icon: "Mail",
    version: "1.0.0",
    deprecated: false,
    fields: [
      {
        kind: "secret",
        name: "postmark_server_token",
        label: "Postmark server token",
        required: true,
        sensitive: true,
      },
      {
        kind: "email",
        name: "from_address",
        label: "From address",
        required: true,
        maxLength: 254,
      },
      {
        kind: "email",
        name: "to_address",
        label: "To address",
        description: "Use {{email}} syntax to pull from event data.",
        required: true,
        maxLength: 254,
      },
      {
        kind: "text",
        name: "subject_template",
        label: "Subject template",
        required: true,
        maxLength: 200,
      },
      {
        kind: "text",
        name: "body_template",
        label: "HTML body template",
        required: true,
        maxLength: 10000,
      },
    ],
    steps: [
      "Receive upstream webhook",
      "Render subject + body templates",
      "Send transactional email via Postmark",
      "Log delivery status",
    ],
  },
  {
    slug: "daily-digest",
    name: "Daily Digest",
    description: "Schedule a summary email to a team on a daily cadence.",
    summary:
      "Runs on a cron schedule. Queries your configured data sources (HubSpot, Stripe, GitHub), renders a summary email, and sends it to the distribution list.",
    category: "reporting",
    icon: "Calendar",
    version: "1.0.0",
    deprecated: false,
    fields: [
      {
        kind: "select",
        name: "schedule",
        label: "Schedule",
        required: true,
        options: [
          { value: "daily-09-utc", label: "Daily at 09:00 UTC" },
          { value: "daily-17-utc", label: "Daily at 17:00 UTC" },
          { value: "weekdays-09-utc", label: "Weekdays at 09:00 UTC" },
        ],
        defaultValue: "daily-09-utc",
      },
      {
        kind: "text",
        name: "recipient_list",
        label: "Recipients",
        description: "Comma-separated email addresses.",
        required: true,
        maxLength: 1000,
      },
      {
        kind: "boolean",
        name: "include_revenue",
        label: "Include revenue metrics",
        defaultValue: true,
      },
      {
        kind: "boolean",
        name: "include_pipeline",
        label: "Include pipeline summary",
        defaultValue: true,
      },
      {
        kind: "secret",
        name: "postmark_server_token",
        label: "Postmark server token",
        required: true,
        sensitive: true,
      },
    ],
    steps: [
      "Fire on cron schedule",
      "Query configured data sources",
      "Render HTML digest",
      "Send email to distribution list",
      "Log summary to audit_events",
    ],
  },
];

export function findTemplate(slug: string): Template | null {
  return FIXTURE_TEMPLATES.find((t) => t.slug === slug) ?? null;
}
