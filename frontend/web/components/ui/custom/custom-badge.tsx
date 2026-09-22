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
  default: "border-slate-200 bg-white text-slate-700",
  muted: "border-transparent bg-slate-100 text-slate-600",
  primary: "border-transparent bg-[#0052CC] text-white",
  success: "border-emerald-200 bg-emerald-50 text-emerald-700",
  warning: "border-amber-200 bg-amber-50 text-amber-700",
  danger: "border-red-200 bg-red-50 text-red-700",
  label: "border-transparent text-white shadow-2xs",
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
        "inline-flex shrink-0 items-center gap-1.5 rounded-full px-2 py-0.5 text-[10px] font-bold",
        customBadgeVariantClass[variantStyle],
        className,
      )}
      {...props}
    />
  );
}
