import type { ComponentProps } from "react";
import { cn } from "@/lib/utils";

export function Details(props: ComponentProps<"details">) {
  return <details data-slot="details" {...props} />;
}

export function DetailsSummary({ className, ...props }: ComponentProps<"summary">) {
  return <summary data-slot="details-summary" className={cn("rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring", className)} {...props} />;
}
