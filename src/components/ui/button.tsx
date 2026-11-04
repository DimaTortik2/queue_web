import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  asChild?: boolean;
  variant?: "default" | "secondary" | "subtle" | "ghost" | "destructive";
  size?: "default" | "sm" | "lg" | "icon";
  disabledReason?: string;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      className,
      variant = "default",
      size = "default",
      asChild = false,
      disabled,
      disabledReason,
      onClick,
      ...props
    },
    ref
  ) => {
    const Comp = asChild ? Slot : "button";

    const variantClasses = {
      default:
        "bg-foreground text-background hover:opacity-90 active:scale-[0.98]",
      secondary:
        "bg-secondary text-secondary-foreground hover:bg-secondary/80 active:scale-[0.98]",
      subtle:
        "bg-muted/60 text-foreground hover:bg-muted active:scale-[0.98]",
      ghost:
        "text-foreground hover:bg-secondary/60 active:scale-[0.98]",
      destructive:
        "bg-destructive/10 text-destructive hover:bg-destructive/20 active:scale-[0.98]",
    };

    const sizeClasses = {
      default: "h-11 px-4 py-2.5 text-sm rounded-xl font-medium",
      sm: "h-9 px-3 text-xs rounded-xl font-medium",
      lg: "h-12 px-6 text-base rounded-2xl font-semibold",
      icon: "h-10 w-10 p-0 rounded-xl",
    };

    const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
      if (disabled && disabledReason) {
        e.preventDefault();
        e.stopPropagation();
        toast.info(disabledReason);
        return;
      }
      if (disabled) {
        e.preventDefault();
        e.stopPropagation();
        return;
      }
      onClick?.(e);
    };

    return (
      <Comp
        className={cn(
          "inline-flex items-center justify-center gap-2 whitespace-nowrap transition-all duration-150 ease-out select-none cursor-pointer",
          variantClasses[variant],
          sizeClasses[size],
          disabled && "opacity-40 cursor-not-allowed active:scale-100",
          className
        )}
        ref={ref}
        onClick={handleClick}
        title={disabled && disabledReason ? disabledReason : props.title}
        {...props}
      />
    );
  }
);
Button.displayName = "Button";

export { Button };
