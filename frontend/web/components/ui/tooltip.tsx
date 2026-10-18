"use client";

import * as React from "react";
import { Tooltip as Primitive } from "@base-ui/react/tooltip";

import { cn } from "@/lib/utils";

function TooltipProvider(props: React.ComponentProps<typeof Primitive.Provider>) {
  return <Primitive.Provider {...props} />;
}

function Tooltip(props: React.ComponentProps<typeof Primitive.Root>) {
  return <Primitive.Root {...props} />;
}

function TooltipTrigger({
  children,
  asChild,
}: {
  children: React.ReactNode;
  asChild?: boolean;
}) {
  return <Primitive.Trigger render={asChild && React.isValidElement(children) ? children : <span tabIndex={0} />}>{asChild ? undefined : children}</Primitive.Trigger>;
}

function TooltipContent({
  className,
  children,
}: {
  className?: string;
  children: React.ReactNode;
}) {
  return <Primitive.Portal><Primitive.Positioner side="top" sideOffset={8} className="z-[130] max-w-[calc(100vw-1rem)]">
    <Primitive.Popup data-slot="tooltip-content" className={cn("max-w-72 rounded-control border border-border bg-popover px-2.5 py-1.5 text-xs font-semibold text-popover-foreground shadow-panel", className)}>{children}</Primitive.Popup>
  </Primitive.Positioner></Primitive.Portal>;
}

export { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger };
