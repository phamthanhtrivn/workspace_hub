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
            className="flex min-w-0 flex-wrap items-center gap-4 rounded-panel border border-border bg-card p-3.5"
          >
            <Skeleton className="h-9 w-9 rounded-panel bg-muted" />
            <div className="min-w-0 flex-1 space-y-1.5">
              <Skeleton className="h-4 w-48 max-w-full bg-muted" />
              <Skeleton className="h-3 w-24 bg-muted" />
            </div>
            <Skeleton className="h-4 w-20 bg-muted" />
            <Skeleton className="h-4 w-24 bg-muted" />
            <Skeleton className="h-8 w-8 rounded-panel bg-muted" />
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className={cn("grid grid-cols-[repeat(auto-fill,minmax(min(100%,220px),1fr))] gap-4", className)}>
      {items.map((_, index) => (
        <div
          key={index}
          className="flex flex-col gap-3 rounded-panel border border-border bg-card p-4"
        >
          <div className="flex items-center justify-between">
            <Skeleton className="h-10 w-10 rounded-panel bg-muted" />
            <Skeleton className="h-8 w-8 rounded-panel bg-muted" />
          </div>
          <Skeleton className="h-4 w-3/4 bg-muted mt-2" />
          <div className="flex items-center justify-between pt-2 border-t border-border">
            <Skeleton className="h-3 w-20 bg-muted" />
            <Skeleton className="h-3 w-16 bg-muted" />
          </div>
        </div>
      ))}
    </div>
  );
}
