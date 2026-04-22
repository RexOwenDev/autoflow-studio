import {
  ArrowRight,
  Calendar,
  CheckCircle2,
  FormInput,
  Grid2x2,
  type LucideIcon,
  Mail,
  MessageSquare,
  Sheet,
} from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { useTemplate } from "@/app/api/templates/actions";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { requireSession } from "@/lib/auth/session";
import { getTemplate } from "@/lib/db/templates";
import type { ConfigField } from "@/lib/templates/schema";

interface TemplateDetailPageProps {
  params: Promise<{ slug: string }>;
}

const ICON_MAP: Record<string, LucideIcon> = {
  FormInput,
  MessageSquare,
  Sheet,
  Mail,
  Calendar,
};

const FIELD_KIND_LABELS: Record<ConfigField["kind"], string> = {
  text: "Text",
  email: "Email",
  url: "URL",
  number: "Number",
  boolean: "Toggle",
  select: "Select",
  secret: "Secret",
};

export async function generateMetadata({ params }: TemplateDetailPageProps): Promise<Metadata> {
  const { slug } = await params;
  const template = await getTemplate(slug);
  if (!template) return { title: "Template not found" };
  return { title: `${template.name} · Templates` };
}

export default async function TemplateDetailPage({ params }: TemplateDetailPageProps) {
  const { slug } = await params;
  await requireSession(`/templates/${slug}`);
  const template = await getTemplate(slug);
  if (!template) notFound();

  const Icon = ICON_MAP[template.icon] ?? Grid2x2;

  return (
    <div className="flex flex-col flex-1 overflow-auto">
      <div className="flex items-center justify-between px-6 h-[var(--header-height)] border-b border-[var(--border-subtle)] shrink-0">
        <div className="flex items-center gap-3 min-w-0">
          <Link
            href="/templates"
            className="text-xs text-[var(--foreground-muted)] hover:text-[var(--foreground)]"
          >
            Templates
          </Link>
          <span className="text-xs text-[var(--foreground-subtle)]">/</span>
          <h1 className="text-sm font-semibold text-[var(--foreground)] truncate">
            {template.name}
          </h1>
        </div>
        <Badge variant="secondary" className="capitalize">
          {template.category}
        </Badge>
      </div>

      <div className="flex-1 p-6 grid grid-cols-1 xl:grid-cols-3 gap-5 overflow-auto">
        {/* Overview + fields (left 2 cols) */}
        <div className="xl:col-span-2 space-y-5">
          <Card>
            <CardHeader>
              <div className="flex items-start gap-4">
                <div className="flex items-center justify-center w-12 h-12 rounded-[var(--radius)] bg-[var(--brand-subtle)] text-[var(--brand)] shrink-0">
                  <Icon className="w-5 h-5" />
                </div>
                <div className="flex-1 min-w-0">
                  <CardTitle>{template.name}</CardTitle>
                  <CardDescription>{template.description}</CardDescription>
                  <p className="mt-2 text-xs text-[var(--foreground-subtle)] font-mono">
                    v{template.version}
                  </p>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-[var(--foreground-muted)] leading-relaxed">
                {template.summary}
              </p>

              <form action={useTemplate} className="mt-4">
                <input type="hidden" name="templateSlug" value={template.slug} />
                <Button type="submit" className="w-full sm:w-auto">
                  Use this template
                  <ArrowRight className="w-3.5 h-3.5 ml-2" />
                </Button>
              </form>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Configuration fields</CardTitle>
              <CardDescription>
                {template.fields.length} field{template.fields.length === 1 ? "" : "s"} to configure
                when you create a workflow from this template.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {template.fields.map((field) => (
                  <div
                    key={field.name}
                    className="flex items-start gap-3 py-2 border-b border-[var(--border-subtle)] last:border-0"
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <code className="text-xs font-mono text-[var(--foreground)] bg-[var(--surface-raised)] px-1.5 py-0.5 rounded">
                          {field.name}
                        </code>
                        <span className="text-sm text-[var(--foreground)]">{field.label}</span>
                        {"required" in field && field.required && (
                          <Badge variant="warning" className="text-[10px] px-1.5 py-0">
                            required
                          </Badge>
                        )}
                        {field.kind === "secret" && (
                          <Badge variant="destructive" className="text-[10px] px-1.5 py-0">
                            sensitive
                          </Badge>
                        )}
                      </div>
                      {"description" in field && field.description && (
                        <p className="mt-1 text-xs text-[var(--foreground-subtle)]">
                          {field.description}
                        </p>
                      )}
                    </div>
                    <Badge variant="secondary" className="shrink-0 text-[10px]">
                      {FIELD_KIND_LABELS[field.kind]}
                    </Badge>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Preview pane (right col) */}
        <div className="space-y-5">
          <Card>
            <CardHeader>
              <CardTitle>How it runs</CardTitle>
              <CardDescription>Steps executed when this workflow is triggered.</CardDescription>
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

          <Card>
            <CardHeader>
              <CardTitle>Guarantees</CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-1.5 text-xs text-[var(--foreground-muted)]">
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="w-3.5 h-3.5 text-[var(--success)] mt-0.5 shrink-0" />
                  Configuration validated before save
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="w-3.5 h-3.5 text-[var(--success)] mt-0.5 shrink-0" />
                  Secrets encrypted at rest
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="w-3.5 h-3.5 text-[var(--success)] mt-0.5 shrink-0" />
                  Webhook retries with idempotency
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="w-3.5 h-3.5 text-[var(--success)] mt-0.5 shrink-0" />
                  Audit log entry per execution
                </li>
              </ul>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
