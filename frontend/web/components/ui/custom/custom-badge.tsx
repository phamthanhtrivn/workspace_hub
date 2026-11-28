import * as React from "react";

import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

type CustomBadgeVariant =
  | "default"
  | "muted"
  | "primary"
  | "success"
  | "warning"
  | "danger"
  | "label";

interface CustomBadgeProps extends React.ComponentProps<typeof Badge> {
  variantStyle?: CustomBadgeVariant;
}

const customBadgeVariantClass: Record<CustomBadgeVariant, string> = {
  default: "border-border bg-card text-foreground",
  muted: "border-transparent bg-muted text-muted-foreground",
  primary: "border-transparent bg-primary-soft text-primary-soft-foreground",
  success: "border-border bg-success-soft text-success-content",
  warning: "border-border bg-warning-soft text-warning-content",
  danger: "border-border bg-destructive-soft text-destructive-content",
  label: "border-transparent text-primary-foreground",
};

export function CustomBadge({
  variantStyle = "default",
  className,
  ...props
}: CustomBadgeProps) {
  return (
    <Badge
      variant="outline"
      className={cn(
        "inline-flex shrink-0 items-center gap-1.5 rounded-full px-2 py-0.5 text-xs font-semibold",
        customBadgeVariantClass[variantStyle],
        className,
      )}
      {...props}
    />
  );
}
