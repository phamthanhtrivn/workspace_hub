"use client";

import * as React from "react";

import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

type CustomTagVariant = "default" | "active" | "muted" | "success" | "danger";

interface CustomTagProps {
  label: React.ReactNode;
  icon?: React.ReactNode;
  count?: number;
  variant?: CustomTagVariant;
  selected?: boolean;
  disabled?: boolean;
  onClick?: () => void;
  className?: string;
}

const tagVariantClass: Record<CustomTagVariant, string> = {
  default:
    "bg-card text-muted-foreground ring-ring hover:bg-background hover:text-foreground",
  active:
    "bg-primary text-primary-foreground ring-primary hover:bg-primary",
  muted:
    "bg-background text-muted-foreground ring-ring hover:bg-muted hover:text-foreground",
  success:
    "bg-success-soft text-success ring-success hover:bg-success-soft",
  danger: "bg-destructive-soft text-destructive ring-destructive hover:bg-destructive-soft",
};

export function CustomTag({
  label,
  icon,
  count,
  variant = "default",
  selected,
  disabled,
  onClick,
  className,
}: CustomTagProps) {
  const resolvedVariant = selected ? "active" : variant;
  const Comp = onClick ? "button" : "span";

  return (
    <Comp
      type={onClick ? "button" : undefined}
      disabled={onClick ? disabled : undefined}
      onClick={onClick}
      className={cn(
        "inline-flex h-8 shrink-0 items-center gap-1.5 rounded-full px-3 text-xs font-semibold ring-1 transition disabled:cursor-not-allowed disabled:opacity-50",
        onClick && "cursor-pointer",
        tagVariantClass[resolvedVariant],
        className,
      )}
    >
      {icon ? <span className="grid size-3.5 place-items-center">{icon}</span> : null}
      <span>{label}</span>
      {typeof count === "number" && count > 0 ? (
      <Badge
        className={cn(
            "ml-0.5 h-5 min-w-5 rounded-full border-2 border-border bg-destructive px-1.5 text-xs font-semibold leading-none text-destructive-foreground tabular-nums",
        )}
      >
          {count > 99 ? "99+" : count}
        </Badge>
      ) : null}
    </Comp>
  );
}
