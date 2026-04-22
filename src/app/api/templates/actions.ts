"use server";

import "server-only";
import { redirect } from "next/navigation";
import { z } from "zod";
import { requireSession } from "@/lib/auth/session";
import { getTemplate } from "@/lib/db/templates";
import { validateTemplateConfig } from "@/lib/templates/validator";

/**
 * Server actions for the template gallery and workflow configure page.
 *
 * Phase 5+ will wire these to the SupabaseAdapter for real writes. Phase 4 validates
 * input + routes to the next screen so the UI flow is exercisable end-to-end.
 */

const useTemplateSchema = z.object({
  templateSlug: z.string().min(1).max(64),
});

const saveConfigSchema = z.object({
  workflowId: z.string().uuid(),
  templateSlug: z.string().min(1).max(64),
});

export async function useTemplate(formData: FormData): Promise<void> {
  await requireSession();

  const parsed = useTemplateSchema.safeParse({
    templateSlug: formData.get("templateSlug"),
  });
  if (!parsed.success) {
    redirect("/templates?error=invalid_slug");
  }

  const template = await getTemplate(parsed.data.templateSlug);
  if (!template) {
    redirect("/templates?error=not_found");
  }

  // Phase 5: insert into `workflows` with template_slug set; redirect to configure page
  // with the newly-created workflow id. Fixture mode skips the write and redirects to
  // a synthesized slug-scoped configure route.
  redirect(`/workflows/new?template=${template.slug}`);
}

export async function saveWorkflowConfig(formData: FormData): Promise<void> {
  await requireSession();

  const meta = saveConfigSchema.safeParse({
    workflowId: formData.get("workflowId"),
    templateSlug: formData.get("templateSlug"),
  });
  if (!meta.success) {
    redirect("/workflows?error=invalid");
  }

  const template = await getTemplate(meta.data.templateSlug);
  if (!template) {
    redirect("/workflows?error=template_missing");
  }

  // Pull the config fields out of the FormData and hand to the validator.
  const rawConfig: Record<string, unknown> = {};
  for (const field of template.fields) {
    const raw = formData.get(field.name);
    if (raw === null) continue;
    if (field.kind === "boolean") {
      // HTML checkbox: present when checked, missing when unchecked.
      rawConfig[field.name] = true;
    } else if (field.kind === "number") {
      const n = Number(raw);
      rawConfig[field.name] = Number.isFinite(n) ? n : raw;
    } else {
      rawConfig[field.name] = raw;
    }
  }

  // Unchecked booleans are absent from FormData. Coerce to false.
  for (const field of template.fields) {
    if (field.kind === "boolean" && !(field.name in rawConfig)) {
      rawConfig[field.name] = false;
    }
  }

  const result = validateTemplateConfig(template, rawConfig);
  if (!result.ok) {
    // Serialize error field names into the URL so the page can highlight them.
    const errorFields = result.errors.map((e) => e.field).join(",");
    redirect(
      `/workflows/new?template=${template.slug}&error=validation&fields=${encodeURIComponent(errorFields)}`,
    );
  }

  // Phase 5: insert into workflow_versions with config + config_hash and redirect to the
  // newly-created workflow's detail page. Fixture acks success + stays on the new-workflow
  // page with the saved flag so the user sees their changes persisted.
  redirect(`/workflows/new?template=${template.slug}&saved=1`);
}
