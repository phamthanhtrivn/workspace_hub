"use client";

import React from "react";
import { FolderOpen, LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

export interface DocumentsEmptyStateProps {
  icon?: LucideIcon;
  title: string;
  description?: string;
  action?: React.ReactNode;
  className?: string;
}

export function DocumentsEmptyState({
  icon: Icon = FolderOpen,
  title,
  description,
  action,
  className,
}: DocumentsEmptyStateProps) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center rounded-3xl border border-dashed border-slate-200 bg-white/50 px-6 py-16 text-center shadow-xs",
        className
      )}
    >
      <div className="grid h-16 w-16 place-items-center rounded-2xl bg-slate-50 text-slate-400 ring-1 ring-slate-200/50">
        <Icon className="h-8 w-8 stroke-[1.5]" />
      </div>
      <h3 className="mt-4 text-base font-black text-slate-800">{title}</h3>
      {description ? (
        <p className="mt-1.5 max-w-sm text-xs font-semibold text-slate-400 leading-relaxed">
          {description}
        </p>
      ) : null}
      {action ? <div className="mt-6">{action}</div> : null}
    </div>
  );
}
