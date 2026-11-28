"use client";

import type { ReactNode } from "react";
import { Tooltip, TooltipContent, TooltipTrigger } from "./tooltip";
import { cn } from "@/lib/utils";

/** Disabled controls need a focusable wrapper so their explanation works with mouse and keyboard. */
export function PermissionHint({ reason, children, className, block = false }: {
  reason?: string;
  children: ReactNode;
  className?: string;
  block?: boolean;
}) {
  if (!reason) return children;
  const Container = block ? "div" : "span";
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Container tabIndex={0} aria-disabled="true" aria-label={reason}
          onClickCapture={event => { event.preventDefault(); event.stopPropagation(); }}
          onKeyDownCapture={event => { if (event.key === "Enter" || event.key === " ") { event.preventDefault(); event.stopPropagation(); } }}
          className={cn("inline-flex max-w-full cursor-not-allowed rounded-control focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring", className)}>
          {children}
        </Container>
      </TooltipTrigger>
      <TooltipContent>{reason}</TooltipContent>
    </Tooltip>
  );
}
