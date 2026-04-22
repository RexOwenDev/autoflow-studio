"use client";

import {
  Activity,
  BookTemplate,
  ChevronDown,
  CreditCard,
  LayoutDashboard,
  ScrollText,
  Settings,
  Workflow,
  Zap,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";

const navItems = [
  {
    label: "Dashboard",
    href: "/dashboard",
    icon: LayoutDashboard,
  },
  {
    label: "Executions",
    href: "/executions",
    icon: Activity,
    badge: "Live",
  },
  {
    label: "Workflows",
    href: "/workflows",
    icon: Workflow,
  },
  {
    label: "Templates",
    href: "/templates",
    icon: BookTemplate,
  },
] as const;

const bottomItems = [
  {
    label: "Audit Log",
    href: "/audit",
    icon: ScrollText,
    planRequired: "Pro" as const,
  },
  {
    label: "Usage & Billing",
    href: "/settings/billing",
    icon: CreditCard,
  },
  {
    label: "Settings",
    href: "/settings",
    icon: Settings,
  },
] as const;

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside
      className="flex flex-col w-[var(--sidebar-width)] shrink-0 border-r border-[var(--border)] bg-[var(--background-subtle)] h-full"
      aria-label="Main navigation"
    >
      {/* Logo / brand */}
      <div className="flex items-center gap-2.5 px-4 h-[var(--header-height)] border-b border-[var(--border-subtle)] shrink-0">
        <div className="flex items-center justify-center w-7 h-7 rounded-[var(--radius)] bg-[var(--brand)]">
          <Zap className="w-4 h-4 text-white" />
        </div>
        <span className="font-semibold text-sm text-[var(--foreground)] tracking-tight">
          AutoFlow Studio
        </span>
      </div>

      {/* Workspace switcher */}
      <div className="px-3 pt-3 pb-2 shrink-0">
        <button
          type="button"
          className="flex items-center gap-2 w-full px-2 py-1.5 rounded-[var(--radius)] text-sm text-[var(--foreground)] hover:bg-[var(--surface-raised)] transition-colors"
          aria-label="Switch workspace"
        >
          <div className="flex items-center justify-center w-5 h-5 rounded text-xs font-bold bg-[var(--brand-subtle)] text-[var(--brand)] shrink-0">
            A
          </div>
          <span className="flex-1 text-left truncate font-medium text-sm">Acme Corp</span>
          <ChevronDown className="w-3.5 h-3.5 text-[var(--foreground-muted)] shrink-0" />
        </button>
      </div>

      <Separator className="mx-3 w-auto" />

      {/* Primary nav */}
      <nav className="flex-1 overflow-y-auto px-3 py-2 space-y-0.5">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = pathname.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-2.5 px-2 py-1.5 rounded-[var(--radius)] text-sm transition-colors",
                isActive
                  ? "bg-[var(--brand-subtle)] text-[var(--brand)] font-medium"
                  : "text-[var(--foreground-muted)] hover:bg-[var(--surface-raised)] hover:text-[var(--foreground)]",
              )}
              aria-current={isActive ? "page" : undefined}
            >
              <Icon className="w-4 h-4 shrink-0" />
              <span className="flex-1">{item.label}</span>
              {"badge" in item && item.badge && (
                <Badge variant="success" className="text-[10px] px-1.5 py-0">
                  {item.badge}
                </Badge>
              )}
            </Link>
          );
        })}
      </nav>

      <Separator className="mx-3 w-auto" />

      {/* Bottom nav */}
      <nav className="px-3 py-2 space-y-0.5 shrink-0">
        {bottomItems.map((item) => {
          const Icon = item.icon;
          const isActive = pathname.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-2.5 px-2 py-1.5 rounded-[var(--radius)] text-sm transition-colors",
                isActive
                  ? "bg-[var(--brand-subtle)] text-[var(--brand)] font-medium"
                  : "text-[var(--foreground-muted)] hover:bg-[var(--surface-raised)] hover:text-[var(--foreground)]",
              )}
            >
              <Icon className="w-4 h-4 shrink-0" />
              <span className="flex-1">{item.label}</span>
              {"planRequired" in item && item.planRequired && (
                <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
                  {item.planRequired}
                </Badge>
              )}
            </Link>
          );
        })}
      </nav>

      {/* User avatar placeholder */}
      <div className="px-3 py-3 border-t border-[var(--border-subtle)] shrink-0">
        <div className="flex items-center gap-2.5 px-2 py-1.5 rounded-[var(--radius)] hover:bg-[var(--surface-raised)] cursor-pointer transition-colors">
          <div className="flex items-center justify-center w-7 h-7 rounded-full bg-[var(--surface-raised)] border border-[var(--border)] text-xs font-medium text-[var(--foreground-muted)] shrink-0">
            RQ
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-medium text-[var(--foreground)] truncate">Rex Quintenta</p>
            <p className="text-xs text-[var(--foreground-subtle)] truncate">Pro plan</p>
          </div>
        </div>
      </div>
    </aside>
  );
}

export function SidebarSkeleton() {
  return (
    <aside className="flex flex-col w-[var(--sidebar-width)] shrink-0 border-r border-[var(--border)] bg-[var(--background-subtle)] h-full animate-pulse">
      <div className="h-[var(--header-height)] border-b border-[var(--border-subtle)] px-4 flex items-center gap-2.5">
        <div className="w-7 h-7 rounded bg-[var(--surface-raised)]" />
        <div className="h-3.5 w-24 rounded bg-[var(--surface-raised)]" />
      </div>
      <div className="flex-1 px-3 py-3 space-y-1.5">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="h-8 rounded-[var(--radius)] bg-[var(--surface-raised)]" />
        ))}
      </div>
    </aside>
  );
}

// StatsBar and StatItem live in stats-bar.tsx (no "use client") so Server Components can pass icon props
export { StatItem, StatsBar } from "@/components/layout/stats-bar";
