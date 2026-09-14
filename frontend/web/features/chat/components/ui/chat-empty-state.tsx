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
      <div className="grid h-14 w-14 place-items-center rounded-2xl bg-blue-50 text-[#0052CC] ring-1 ring-blue-100 shadow-sm">
        <Icon className="h-7 w-7" />
      </div>
      <h3 className="mt-4 text-base font-black text-slate-800 tracking-tight">
        {title}
      </h3>
      {description ? (
        <p className="mt-1.5 max-w-sm text-xs font-semibold text-slate-500 leading-relaxed">
          {description}
        </p>
      ) : null}
      {actionLabel && onAction ? (
        <Button
          type="button"
          onClick={onAction}
          className="mt-5 h-9 rounded-xl bg-[#0052CC] hover:bg-[#0043A8] px-4 text-xs font-bold text-white shadow-md shadow-blue-500/10 cursor-pointer"
        >
          {actionLabel}
        </Button>
      ) : null}
    </div>
  );
}

export default ChatEmptyState;
