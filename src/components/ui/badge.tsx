import * as React from "react";
import { cn } from "@/lib/utils";

export interface BadgeProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: "default" | "secondary" | "subtle" | "success" | "warning" | "destructive";
}

function Badge({ className, variant = "secondary", ...props }: BadgeProps) {
  const variantClasses = {
    default: "bg-primary text-primary-foreground",
    secondary: "bg-secondary text-secondary-foreground",
    subtle: "bg-muted/70 text-muted-foreground",
    success: "bg-emerald-500/12 text-emerald-600 dark:text-emerald-400",
    warning: "bg-amber-500/12 text-amber-600 dark:text-amber-400",
    destructive: "bg-rose-500/12 text-rose-600 dark:text-rose-400",
  };

  return (
    <div
      className={cn(
        "inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-[11px] font-medium tracking-tight select-none",
        variantClasses[variant],
        className
      )}
      {...props}
    />
  );
}

export { Badge };
