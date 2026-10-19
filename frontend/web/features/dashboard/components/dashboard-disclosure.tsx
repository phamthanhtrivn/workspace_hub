"use client";

import type { ReactNode } from "react";
import { ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";

export function DashboardDisclosure({ title, children, className }: {
  title: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <Collapsible className={className}>
      <CollapsibleTrigger
        render={<Button variant="ghost" size="sm" />}
        className="group h-auto min-h-11 justify-start gap-1.5 px-1 text-xs font-normal text-muted-foreground hover:text-foreground sm:min-h-8 [@media(pointer:coarse)]:min-h-11 motion-reduce:transition-none"
      >
        <ChevronRight aria-hidden className="size-3.5 shrink-0 group-data-[panel-open]:rotate-90 motion-safe:transition-transform motion-safe:duration-150" />
        {title}
      </CollapsibleTrigger>
      <CollapsibleContent>{children}</CollapsibleContent>
    </Collapsible>
  );
}
