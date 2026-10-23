import type { ComponentProps } from "react";

import { cn } from "@/lib/utils";
import { Spinner } from "./spinner";

export interface LoadingStateProps extends Omit<ComponentProps<"div">, "children"> {
  label: string;
  layout?: "inline" | "centered";
  size?: number;
  tone?: "primary" | "inherit";
}

export function LoadingState({
  label,
  layout = "inline",
  size = layout === "centered" ? 24 : 16,
  tone = "primary",
  className,
  ...props
}: LoadingStateProps) {
  return (
    <div
      {...props}
      role="status"
      className={cn(
        "flex items-center gap-2 text-sm text-muted-foreground",
        layout === "centered" && "flex-col justify-center py-8 text-center",
        className,
      )}
    >
      <Spinner size={size} tone={tone} />
      <span>{label}</span>
    </div>
  );
}
