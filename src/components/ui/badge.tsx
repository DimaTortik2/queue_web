import * as React from "react";
import { cn } from "@/lib/utils";

export interface BadgeProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: "default" | "secondary" | "subtle" | "success" | "warning" | "destructive";
}

function Badge({ className, variant = "secondary", ...props }: BadgeProps) {
  const variantClasses = {
    default: "bg-foreground text-background font-medium",
    secondary: "bg-secondary text-secondary-foreground font-medium",
    subtle: "bg-muted text-muted-foreground font-medium",
    success: "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 font-medium",
    warning: "bg-amber-500/15 text-amber-600 dark:text-amber-400 font-medium",
    destructive: "bg-destructive/15 text-destructive font-medium",
  };

  return (
    <div
      className={cn(
        "inline-flex items-center gap-1.5 rounded-xl px-2.5 py-1 text-[11px] tracking-tight select-none",
        variantClasses[variant],
        className
      )}
      {...props}
    />
  );
}

export { Badge };
