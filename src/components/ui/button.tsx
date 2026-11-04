import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cn } from "@/lib/utils";

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  asChild?: boolean;
  variant?: "default" | "secondary" | "subtle" | "ghost" | "destructive";
  size?: "default" | "sm" | "lg" | "icon";
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = "default", size = "default", asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";

    const variantClasses = {
      default:
        "bg-primary text-primary-foreground hover:opacity-90 active:scale-[0.97] shadow-none",
      secondary:
        "bg-secondary text-secondary-foreground hover:bg-secondary/80 active:scale-[0.97]",
      subtle:
        "bg-muted/60 text-foreground hover:bg-muted active:scale-[0.97]",
      ghost:
        "text-foreground hover:bg-secondary/60 active:scale-[0.97]",
      destructive:
        "bg-rose-500/10 text-rose-600 dark:text-rose-400 hover:bg-rose-500/20 active:scale-[0.97]",
    };

    const sizeClasses = {
      default: "h-11 px-4 py-2.5 text-sm rounded-xl font-medium",
      sm: "h-8 px-3 text-xs rounded-lg font-medium",
      lg: "h-13 px-6 text-base rounded-2xl font-semibold",
      icon: "h-10 w-10 p-0 rounded-xl",
    };

    return (
      <Comp
        className={cn(
          "inline-flex items-center justify-center gap-2 whitespace-nowrap transition-all duration-150 ease-out disabled:pointer-events-none disabled:opacity-40 select-none",
          variantClasses[variant],
          sizeClasses[size],
          className
        )}
        ref={ref}
        {...props}
      />
    );
  }
);
Button.displayName = "Button";

export { Button };
