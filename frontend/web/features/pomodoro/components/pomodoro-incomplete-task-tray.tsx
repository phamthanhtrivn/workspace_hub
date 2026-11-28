"use client";

import type { ReactNode } from "react";
import { ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { POMODORO_TASK_COPY as copy } from "../constants/pomodoro-task";

export function PomodoroIncompleteTaskTray({ count, children }: { count: number; children: ReactNode }) {
  return <Collapsible defaultOpen className="shrink-0">
    <CollapsibleTrigger render={<Button type="button" variant="ghost" className="group flex min-h-10 h-auto w-full items-center gap-2 rounded-control bg-muted/35 px-3 py-2 text-left font-normal hover:bg-muted/65 focus-visible:ring-inset" />}
      title={copy.missingDatesHint}>
      <ChevronRight aria-hidden="true" className="size-3.5 shrink-0 text-muted-foreground transition-transform group-data-[panel-open]:rotate-90 motion-reduce:transition-none" />
      <span className="min-w-0 flex-1 truncate text-sm font-medium text-foreground">{copy.missingDatesTitle}</span>
      <span className="min-w-6 rounded-md bg-background px-1.5 py-0.5 text-center text-xs font-medium tabular-nums text-muted-foreground">{count}</span>
    </CollapsibleTrigger>
    <CollapsibleContent>
      <div role="region" aria-label="Project tasks with incomplete schedules" tabIndex={0}
        className="mt-2 max-h-40 overflow-y-auto overscroll-contain rounded-control p-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring">
        <p className="sr-only">{copy.missingDatesHint}</p>
        {children}
      </div>
    </CollapsibleContent>
  </Collapsible>;
}
