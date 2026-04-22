import {
  Calendar,
  FormInput,
  Grid2x2,
  type LucideIcon,
  Mail,
  MessageSquare,
  Sheet,
} from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { requireSession } from "@/lib/auth/session";
import { listTemplates } from "@/lib/db/templates";
import type { Template, TemplateCategory } from "@/lib/templates/schema";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "Templates" };

interface TemplatesPageProps {
  searchParams: Promise<{ category?: string }>;
}

const CATEGORY_LABELS: Record<TemplateCategory, string> = {
  ingestion: "Ingestion",
  notifications: "Notifications",
  reporting: "Reporting",
  "data-ops": "Data ops",
  integrations: "Integrations",
};

const CATEGORY_ORDER: TemplateCategory[] = [
  "ingestion",
  "notifications",
  "reporting",
  "data-ops",
  "integrations",
];

// Icon map — we only render a subset of lucide icons; unknown = fallback.
const ICON_MAP: Record<string, LucideIcon> = {
  FormInput,
  MessageSquare,
  Sheet,
  Mail,
  Calendar,
};

function iconFor(name: string): LucideIcon {
  return ICON_MAP[name] ?? Grid2x2;
}

function isCategory(value: string | undefined): value is TemplateCategory {
  return value !== undefined && CATEGORY_ORDER.includes(value as TemplateCategory);
}

export default async function TemplatesPage({ searchParams }: TemplatesPageProps) {
  await requireSession("/templates");

  const [templates, params] = await Promise.all([listTemplates(), searchParams]);
  const activeCategory = isCategory(params.category) ? params.category : null;

  const filtered = activeCategory
    ? templates.filter((t) => t.category === activeCategory)
    : templates;

  // Count per category for pill badges
  const countsByCategory = templates.reduce<Record<TemplateCategory, number>>(
    (acc, t) => {
      acc[t.category] = (acc[t.category] ?? 0) + 1;
      return acc;
    },
    {
      ingestion: 0,
      notifications: 0,
      reporting: 0,
      "data-ops": 0,
      integrations: 0,
    },
  );

  return (
    <div className="flex flex-col flex-1 overflow-auto">
      <div className="flex items-center justify-between px-6 h-[var(--header-height)] border-b border-[var(--border-subtle)] shrink-0">
        <div>
          <h1 className="text-sm font-semibold text-[var(--foreground)]">Templates</h1>
          <p className="text-xs text-[var(--foreground-subtle)]">
            {templates.length} templates available
          </p>
        </div>
      </div>

      {/* Category filter row */}
      <div className="flex items-center gap-2 px-6 py-3 border-b border-[var(--border-subtle)] bg-[var(--background-subtle)] overflow-x-auto">
        <Link
          href="/templates"
          className={cn(
            "px-3 py-1 rounded-full text-xs font-medium whitespace-nowrap transition-colors",
            activeCategory === null
              ? "bg-[var(--brand)] text-white"
              : "bg-[var(--surface-raised)] text-[var(--foreground-muted)] hover:bg-[var(--surface-raised-hover)]",
          )}
        >
          All · {templates.length}
        </Link>
        {CATEGORY_ORDER.map((cat) => {
          const count = countsByCategory[cat];
          if (count === 0) return null;
          const isActive = activeCategory === cat;
          return (
            <Link
              key={cat}
              href={`/templates?category=${cat}`}
              className={cn(
                "px-3 py-1 rounded-full text-xs font-medium whitespace-nowrap transition-colors",
                isActive
                  ? "bg-[var(--brand)] text-white"
                  : "bg-[var(--surface-raised)] text-[var(--foreground-muted)] hover:bg-[var(--surface-raised-hover)]",
              )}
            >
              {CATEGORY_LABELS[cat]} · {count}
            </Link>
          );
        })}
      </div>

      {/* Grid of template cards */}
      <div className="flex-1 p-6 overflow-auto">
        {filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 text-center">
            <p className="text-sm text-[var(--foreground-muted)]">
              No templates in this category yet.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {filtered.map((template) => (
              <TemplateCard key={template.slug} template={template} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function TemplateCard({ template }: { template: Template }) {
  const Icon = iconFor(template.icon);
  return (
    <Link href={`/templates/${template.slug}`} className="group">
      <Card className="h-full transition-all hover:border-[var(--brand)] hover:shadow-[var(--shadow-md)]">
        <CardHeader>
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center justify-center w-9 h-9 rounded-[var(--radius)] bg-[var(--brand-subtle)] text-[var(--brand)] shrink-0">
              <Icon className="w-4.5 h-4.5" />
            </div>
            <Badge variant="secondary" className="capitalize">
              {CATEGORY_LABELS[template.category]}
            </Badge>
          </div>
          <CardTitle className="mt-3 group-hover:text-[var(--brand)] transition-colors">
            {template.name}
          </CardTitle>
          <CardDescription className="line-clamp-2">{template.description}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-2 text-xs text-[var(--foreground-subtle)]">
            <span>{template.fields.length} fields</span>
            <span>·</span>
            <span>{template.steps.length} steps</span>
            <span>·</span>
            <span className="font-mono">v{template.version}</span>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}
