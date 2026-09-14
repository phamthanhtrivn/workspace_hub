"use client";

import React from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

export interface DocumentsLoadingStateProps {
  view?: "grid" | "list";
  count?: number;
  className?: string;
}

export function DocumentsLoadingState({
  view = "grid",
  count = 8,
  className,
}: DocumentsLoadingStateProps) {
  const items = Array.from({ length: count });

  if (view === "list") {
    return (
      <div className={cn("space-y-2", className)}>
        {items.map((_, index) => (
          <div
            key={index}
            className="flex items-center gap-4 rounded-2xl border border-slate-100 bg-white p-3.5 shadow-xs"
          >
            <Skeleton className="h-9 w-9 rounded-xl bg-slate-100" />
            <div className="flex-1 space-y-1.5">
              <Skeleton className="h-4 w-48 bg-slate-100" />
              <Skeleton className="h-3 w-24 bg-slate-100/80" />
            </div>
            <Skeleton className="h-4 w-20 bg-slate-100/80" />
            <Skeleton className="h-4 w-24 bg-slate-100/80" />
            <Skeleton className="h-8 w-8 rounded-xl bg-slate-100" />
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className={cn("grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4", className)}>
      {items.map((_, index) => (
        <div
          key={index}
          className="flex flex-col gap-3 rounded-2xl border border-slate-100 bg-white p-4 shadow-xs"
        >
          <div className="flex items-center justify-between">
            <Skeleton className="h-10 w-10 rounded-xl bg-slate-100" />
            <Skeleton className="h-8 w-8 rounded-xl bg-slate-100" />
          </div>
          <Skeleton className="h-4 w-3/4 bg-slate-100 mt-2" />
          <div className="flex items-center justify-between pt-2 border-t border-slate-100">
            <Skeleton className="h-3 w-20 bg-slate-100/80" />
            <Skeleton className="h-3 w-16 bg-slate-100/80" />
          </div>
        </div>
      ))}
    </div>
  );
}
