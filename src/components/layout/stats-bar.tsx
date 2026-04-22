import type * as React from "react";
import { cn } from "@/lib/utils";

export function StatsBar({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-4 px-6 py-3 border-b border-[var(--border-subtle)] bg-[var(--background-subtle)]">
      {children}
    </div>
  );
}

export function StatItem({
  label,
  value,
  icon: Icon,
  trend,
}: {
  label: string;
  value: string | number;
  icon?: React.ComponentType<{ className?: string }>;
  trend?: "up" | "down" | "neutral";
}) {
  return (
    <div className="flex items-center gap-2">
      {Icon && <Icon className="w-4 h-4 text-[var(--foreground-muted)]" />}
      <div>
        <p className="text-xs text-[var(--foreground-muted)]">{label}</p>
        <p
          className={cn(
            "text-sm font-semibold",
            trend === "up" && "text-[var(--success)]",
            trend === "down" && "text-[var(--error)]",
            !trend && "text-[var(--foreground)]",
          )}
        >
          {value}
        </p>
      </div>
    </div>
  );
}
