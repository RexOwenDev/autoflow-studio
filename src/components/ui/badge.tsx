import { cva, type VariantProps } from "class-variance-authority";
import type * as React from "react";
import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors",
  {
    variants: {
      variant: {
        default: "border-transparent bg-[var(--brand)] text-[var(--brand-foreground)]",
        secondary:
          "border-[var(--border)] bg-[var(--surface-raised)] text-[var(--foreground-muted)]",
        success: "border-transparent bg-[var(--success-subtle)] text-[var(--success)]",
        warning: "border-transparent bg-[var(--warning-subtle)] text-[var(--warning)]",
        destructive: "border-transparent bg-[var(--error-subtle)] text-[var(--error)]",
        info: "border-transparent bg-[var(--info-subtle)] text-[var(--info)]",
        outline: "border-[var(--border)] text-[var(--foreground)]",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  },
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return <div className={cn(badgeVariants({ variant }), className)} {...props} />;
}

export { Badge, badgeVariants };
