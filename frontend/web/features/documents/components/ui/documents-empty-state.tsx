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
        "flex flex-col items-center justify-center px-6 py-10 text-center",
        className
      )}
    >
      <div className="text-muted-foreground">
        <Icon className="h-6 w-6 stroke-[1.5]" />
      </div>
      <h3 className="mt-4 text-base font-semibold text-foreground">{title}</h3>
      {description ? (
        <p className="mt-1.5 max-w-sm text-sm text-muted-foreground leading-6">
          {description}
        </p>
      ) : null}
      {action ? <div className="mt-6">{action}</div> : null}
    </div>
  );
}
