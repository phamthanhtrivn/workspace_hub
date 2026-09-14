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
    "bg-white text-slate-600 ring-slate-200 hover:bg-slate-50 hover:text-slate-900",
  active:
    "bg-[var(--color-primary)] text-white ring-[var(--color-primary)] shadow-sm shadow-blue-900/10 hover:bg-[var(--color-primary)]",
  muted:
    "bg-slate-50 text-slate-500 ring-slate-200 hover:bg-slate-100 hover:text-slate-700",
  success:
    "bg-emerald-50 text-emerald-700 ring-emerald-200 hover:bg-emerald-100",
  danger: "bg-red-50 text-red-700 ring-red-200 hover:bg-red-100",
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
        "inline-flex h-8 shrink-0 items-center gap-1.5 rounded-full px-3 text-xs font-black ring-1 transition active:translate-y-px disabled:cursor-not-allowed disabled:opacity-50",
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
            "ml-0.5 h-5 min-w-5 rounded-full border-2 border-white bg-red-500 px-1.5 text-[11px] font-bold leading-none text-white shadow-sm tabular-nums",
        )}
      >
          {count > 99 ? "99+" : count}
        </Badge>
      ) : null}
    </Comp>
  );
}
