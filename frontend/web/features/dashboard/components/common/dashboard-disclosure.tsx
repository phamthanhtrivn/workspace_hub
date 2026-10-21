"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { cn } from "@/lib/utils";

// The shared root keeps a footer trigger connected to content inside the panel's scroll region.
export function DashboardDisclosure({ children, className }: {
  children: ReactNode;
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const body = rootRef.current?.querySelector<HTMLDivElement>("[data-dashboard-panel-body]");
    const content = rootRef.current?.querySelector<HTMLDivElement>("[data-dashboard-disclosure-content]");
    if (!body) return;
    // Reveal the expanded data without scrolling the page or moving keyboard focus.
    body.scrollTop = open && content
      ? body.scrollTop + content.getBoundingClientRect().top - body.getBoundingClientRect().top
      : 0;
  }, [open]);
  return <Collapsible ref={rootRef} open={open} onOpenChange={setOpen} className={cn("flex min-h-0 min-w-0 flex-1", className)}>{children}</Collapsible>;
}

export function DashboardDisclosureTrigger({ title }: { title: string }) {
  return (
    <CollapsibleTrigger
      render={<Button variant="ghost" size="sm" />}
      className="group h-auto min-h-11 justify-start gap-1.5 px-1 text-xs font-normal text-muted-foreground hover:text-foreground sm:min-h-8 [@media(pointer:coarse)]:min-h-11 motion-reduce:transition-none"
    >
      <ChevronRight aria-hidden className="size-3.5 shrink-0 group-data-[panel-open]:rotate-90 motion-safe:transition-transform motion-safe:duration-150" />
      {title}
    </CollapsibleTrigger>
  );
}

export function DashboardDisclosureContent({ children, className }: { children: ReactNode; className?: string }) {
  return <CollapsibleContent data-dashboard-disclosure-content className={cn("mt-3 text-xs text-muted-foreground", className)}>{children}</CollapsibleContent>;
}
