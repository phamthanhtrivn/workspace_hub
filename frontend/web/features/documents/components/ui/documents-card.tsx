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
        "relative rounded-lg border border-slate-200 bg-white p-4 transition-all duration-300 shadow-[0_8px_18px_rgba(15,40,84,0.04)]",
        interactive && "hover:border-slate-300 hover:shadow-md",
        selected && "border-[#0052CC] bg-blue-50/40 ring-2 ring-[#0052CC]/15 shadow-xs",
        active && "border-[#0052CC] bg-blue-50 shadow-md ring-2 ring-[#0052CC]/20",
        isDraggingOver && "border-2 border-dashed border-[#0052CC] bg-blue-50/20 scale-102",
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
}
