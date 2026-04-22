import { ArrowLeft, Save } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { saveWorkflowConfig } from "@/app/api/templates/actions";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { ConfigForm } from "@/components/workflow/ConfigForm";
import { requireSession } from "@/lib/auth/session";
import { getTemplate } from "@/lib/db/templates";

export const metadata: Metadata = { title: "New workflow" };

interface NewWorkflowPageProps {
  searchParams: Promise<{
    template?: string;
    error?: string;
    fields?: string;
    saved?: string;
  }>;
}

// Synthetic workflow id for fixture mode — Phase 5 inserts a real row + redirects here.
const FIXTURE_DRAFT_ID = "00000000-0000-0000-0000-000000009999";

export default async function NewWorkflowPage({ searchParams }: NewWorkflowPageProps) {
  await requireSession("/workflows/new");
  const params = await searchParams;

  if (!params.template) {
    redirect("/templates");
  }

  const template = await getTemplate(params.template);
  if (!template) notFound();

  const errorFields = params.fields ? params.fields.split(",").filter(Boolean) : [];

  return (
    <div className="flex flex-col flex-1 overflow-auto">
      <div className="flex items-center justify-between px-6 h-[var(--header-height)] border-b border-[var(--border-subtle)] shrink-0">
        <div className="flex items-center gap-3 min-w-0">
          <Link
            href={`/templates/${template.slug}`}
            className="flex items-center gap-1 text-xs text-[var(--foreground-muted)] hover:text-[var(--foreground)]"
          >
            <ArrowLeft className="w-3 h-3" />
            Back
          </Link>
          <span className="text-xs text-[var(--foreground-subtle)]">/</span>
          <h1 className="text-sm font-semibold text-[var(--foreground)] truncate">New workflow</h1>
        </div>
        <Badge variant="info">Draft</Badge>
      </div>

      <div className="flex-1 p-6 grid grid-cols-1 xl:grid-cols-3 gap-5 overflow-auto">
        <form action={saveWorkflowConfig} className="xl:col-span-2 space-y-5">
          <input type="hidden" name="workflowId" value={FIXTURE_DRAFT_ID} />
          <input type="hidden" name="templateSlug" value={template.slug} />

          <Card>
            <CardHeader>
              <CardTitle>Name your workflow</CardTitle>
              <CardDescription>
                Based on the{" "}
                <Link
                  href={`/templates/${template.slug}`}
                  className="text-[var(--brand)] hover:underline"
                >
                  {template.name}
                </Link>{" "}
                template.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-1.5">
                <label
                  htmlFor="workflow-name"
                  className="text-xs font-medium text-[var(--foreground-muted)]"
                >
                  Workflow name
                </label>
                <Input
                  id="workflow-name"
                  name="workflow_name"
                  required
                  placeholder={`${template.name} — Production`}
                  maxLength={80}
                />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Configure</CardTitle>
              <CardDescription>
                Fill in the {template.fields.length} field
                {template.fields.length === 1 ? "" : "s"} required by this template. Secrets are
                encrypted at rest.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ConfigForm template={template} errorFields={errorFields} />

              {params.saved === "1" && (
                <p className="mt-4 text-xs text-[var(--success)]" role="status">
                  Saved. Phase 5 will promote this draft to an active workflow.
                </p>
              )}
              {params.error === "validation" && (
                <p className="mt-4 text-xs text-[var(--error)]" role="alert">
                  Some fields are invalid. See highlighted fields above.
                </p>
              )}
            </CardContent>
          </Card>

          <div className="flex items-center justify-end gap-2">
            <Link href={`/templates/${template.slug}`}>
              <Button variant="ghost" type="button">
                Cancel
              </Button>
            </Link>
            <Button type="submit">
              <Save className="w-3.5 h-3.5 mr-2" />
              Save as draft
            </Button>
          </div>
        </form>

        {/* Preview pane */}
        <div className="space-y-5">
          <Card>
            <CardHeader>
              <CardTitle>Template preview</CardTitle>
              <CardDescription className="font-mono text-xs">
                v{template.version} · {template.category}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-[var(--foreground-muted)] leading-relaxed">
                {template.summary}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Execution plan</CardTitle>
            </CardHeader>
            <CardContent>
              <ol className="space-y-2">
                {template.steps.map((step, i) => (
                  <li
                    key={step}
                    className="flex items-start gap-2.5 text-sm text-[var(--foreground)]"
                  >
                    <span className="flex items-center justify-center w-5 h-5 rounded-full bg-[var(--brand-subtle)] text-[var(--brand)] text-xs font-semibold shrink-0 mt-0.5">
                      {i + 1}
                    </span>
                    <span className="leading-relaxed">{step}</span>
                  </li>
                ))}
              </ol>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
