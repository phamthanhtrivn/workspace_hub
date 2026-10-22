"use client";

import React from "react";
import { cn } from "@/lib/utils";

export interface DocumentsCardProps extends React.HTMLAttributes<HTMLDivElement> {
  selected?: boolean;
  active?: boolean;
  isDraggingOver?: boolean;
  interactive?: boolean;
}

export function DocumentsCard({
  children,
  className,
  selected = false,
  active = false,
  isDraggingOver = false,
  interactive = true,
  ...props
}: DocumentsCardProps) {
  return (
    <div
      className={cn(
        "relative rounded-lg border border-border bg-card p-4 transition-all duration-200",
        interactive && "hover:border-input",
        selected && "border-primary bg-info-soft/40 ring-2 ring-primary/15",
        active && "border-primary bg-info-soft ring-2 ring-primary/20",
        isDraggingOver && "border-2 border-dashed border-primary bg-info-soft/20 scale-102",
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
}
