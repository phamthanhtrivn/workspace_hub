"use client";

import React from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

export interface ChatLoadingStateProps {
  type?: "messages" | "sidebar" | "panel";
  className?: string;
}

export function ChatLoadingState({
  type = "messages",
  className,
}: ChatLoadingStateProps) {
  if (type === "sidebar") {
    return (
      <div className={cn("space-y-3 p-4", className)}>
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="flex items-center gap-3">
            <Skeleton className="h-8 w-8 rounded-xl" />
            <div className="flex-1 space-y-1.5">
              <Skeleton className="h-3.5 w-24 rounded-md" />
              <Skeleton className="h-2.5 w-16 rounded-md" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (type === "panel") {
    return (
      <div className={cn("space-y-4 p-5", className)}>
        <Skeleton className="h-10 w-full rounded-xl" />
        <Skeleton className="h-24 w-full rounded-2xl" />
        <Skeleton className="h-24 w-full rounded-2xl" />
      </div>
    );
  }

  return (
    <div className={cn("space-y-6 p-6 flex-1", className)}>
      {Array.from({ length: 4 }).map((_, i) => (
        <div
          key={i}
          className={cn(
            "flex gap-3 max-w-lg",
            i % 2 === 1 ? "ml-auto flex-row-reverse" : ""
          )}
        >
          <Skeleton className="h-9 w-9 shrink-0 rounded-full" />
          <div className="space-y-2 flex-1">
            <Skeleton className="h-3 w-28 rounded-md" />
            <Skeleton className="h-16 w-full rounded-2xl" />
          </div>
        </div>
      ))}
    </div>
  );
}

export default ChatLoadingState;
