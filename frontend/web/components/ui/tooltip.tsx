"use client";

import * as React from "react";

import { cn } from "@/lib/utils";

function TooltipProvider({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}

function Tooltip({ children }: { children: React.ReactNode }) {
  return <span className="group/tooltip relative inline-flex">{children}</span>;
}

function TooltipTrigger({
  children,
  asChild,
}: {
  children: React.ReactNode;
  asChild?: boolean;
}) {
  if (asChild && React.isValidElement(children)) return children;
  return <span>{children}</span>;
}

function TooltipContent({
  className,
  children,
}: {
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <span
      role="tooltip"
      className={cn(
        "pointer-events-none absolute bottom-full left-1/2 z-[130] mb-2 hidden -translate-x-1/2 whitespace-nowrap rounded-md border bg-popover px-2.5 py-1.5 text-xs font-semibold text-popover-foreground shadow-md group-hover/tooltip:block group-focus-within/tooltip:block",
        className,
      )}
    >
      {children}
    </span>
  );
}

export { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger };
