"use client";

import React from "react";
import { MessageSquare, LucideIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export interface ChatEmptyStateProps {
  icon?: LucideIcon;
  title: string;
  description?: string;
  actionLabel?: string;
  onAction?: () => void;
  className?: string;
}

export function ChatEmptyState({
  icon: Icon = MessageSquare,
  title,
  description,
  actionLabel,
  onAction,
  className,
}: ChatEmptyStateProps) {
  return (
    <div
      className={cn(
        "flex flex-1 flex-col items-center justify-center p-8 text-center animate-in fade-in duration-200",
        className
      )}
    >
      <div className="text-muted-foreground">
        <Icon className="h-7 w-7" />
      </div>
      <h3 className="mt-4 text-base font-semibold text-foreground tracking-tight">
        {title}
      </h3>
      {description ? (
        <p className="mt-1.5 max-w-sm text-sm text-muted-foreground leading-6">
          {description}
        </p>
      ) : null}
      {actionLabel && onAction ? (
        <Button
          type="button"
          onClick={onAction}
          className="mt-5 h-9 rounded-control bg-primary hover:bg-primary-hover px-4 text-xs font-semibold text-primary-foreground cursor-pointer"
        >
          {actionLabel}
        </Button>
      ) : null}
    </div>
  );
}

export default ChatEmptyState;
