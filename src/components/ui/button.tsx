import { cva, type VariantProps } from "class-variance-authority";
import * as React from "react";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-[var(--radius)] text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--brand)] focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50",
  {
    variants: {
      variant: {
        default:
          "bg-[var(--brand)] text-[var(--brand-foreground)] hover:bg-[var(--brand-hover)] shadow-sm",
        secondary:
          "bg-[var(--surface-raised)] text-[var(--foreground)] hover:bg-[var(--border)] border border-[var(--border)]",
        ghost:
          "hover:bg-[var(--surface-raised)] text-[var(--foreground-muted)] hover:text-[var(--foreground)]",
        destructive: "bg-[var(--error)] text-white hover:bg-red-600 shadow-sm",
        outline:
          "border border-[var(--border)] bg-transparent hover:bg-[var(--surface-raised)] text-[var(--foreground)]",
        link: "text-[var(--brand)] underline-offset-4 hover:underline p-0 h-auto",
      },
      size: {
        default: "h-9 px-4 py-2",
        sm: "h-7 rounded px-3 text-xs",
        lg: "h-11 rounded-[var(--radius-lg)] px-8 text-base",
        icon: "h-9 w-9",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  },
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, ...props }, ref) => {
    return (
      <button className={cn(buttonVariants({ variant, size, className }))} ref={ref} {...props} />
    );
  },
);
Button.displayName = "Button";

export { Button, buttonVariants };
