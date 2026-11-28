import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";
import { Spinner } from "./spinner";
import { PermissionHint } from "./permission-hint";

const buttonVariants = cva(
  "touch-target inline-flex shrink-0 cursor-pointer items-center justify-center gap-2 whitespace-nowrap rounded-control text-sm font-semibold outline-none transition-colors duration-150 disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50 focus-visible:ring-2 focus-visible:ring-ring [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        unstyled: "",
        default:
          "bg-primary text-primary-foreground hover:bg-primary-hover",
        destructive:
          "bg-destructive text-destructive-foreground hover:bg-destructive/90",
        "destructive-soft": "border border-destructive-outline bg-destructive-soft text-destructive-content hover:bg-destructive-soft/80",
        success: "bg-success text-success-foreground hover:bg-success/90",
        warning: "bg-warning text-warning-foreground hover:bg-warning/90",
        "info-soft": "bg-info-soft text-info-content hover:bg-info-soft/80",
        "warning-soft": "bg-warning-soft text-warning-content hover:bg-warning-soft/80",
        outline:
          "border border-input bg-background text-foreground hover:bg-accent hover:text-accent-foreground",
        secondary:
          "bg-secondary text-secondary-foreground hover:bg-secondary/80",
        ghost: "hover:bg-accent hover:text-accent-foreground",
        link: "text-link underline-offset-4 hover:underline",
      },
      size: {
        default: "h-9 px-4 py-2",
        sm: "h-8 rounded-control px-3 text-xs",
        lg: "h-10 rounded-control px-6",
        icon: "size-9",
        "icon-sm": "size-8",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  },
);

function Button({
  className,
  variant,
  size,
  asChild = false,
  loading = false,
  disabled,
  disabledReason,
  children,
  ...props
}: React.ComponentProps<"button"> &
  VariantProps<typeof buttonVariants> & {
    asChild?: boolean;
    loading?: boolean;
    disabledReason?: string;
  }) {
  const Comp = asChild ? Slot : "button";
  const filled =
    (!variant || ["default", "destructive", "success", "warning"].includes(variant)) ||
    /(?:^|\s)bg-(?:primary|destructive|success|warning|info)(?:\s|$)/.test(className ?? "");

  const button = (
    <Comp
      data-slot="button"
      className={cn(
        variant === "unstyled"
          ? "touch-target cursor-pointer disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          : buttonVariants({ variant, size }),
        className,
        loading && "[&>svg:not([data-slot=spinner])]:hidden",
      )}
      {...props}
      disabled={disabled || loading || Boolean(disabledReason)}
      aria-disabled={disabled || loading || Boolean(disabledReason) || props["aria-disabled"] || undefined}
      tabIndex={asChild && disabledReason ? -1 : props.tabIndex}
      aria-busy={loading || props["aria-busy"] || undefined}
    >
      {asChild ? children : <>{loading && <Spinner tone={filled ? "inherit" : "primary"} />}{children}</>}
    </Comp>
  );
  return disabledReason ? <PermissionHint reason={disabledReason}
    className={cn(/(?:^|\s)(?:w-full|flex-1)(?:\s|$)/.test(className ?? "") && "w-full")}>
    {button}
  </PermissionHint> : button;
}

export { Button, buttonVariants };
